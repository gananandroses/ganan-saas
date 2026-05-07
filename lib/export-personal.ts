// Export utilities for the Personal Cash Flow page.
// Zero external dependencies — CSV is generated as a UTF-8 BOM string so
// Israeli Excel renders Hebrew correctly, and PDF uses the browser's native
// print pipeline (window.print → "Save as PDF") so we don't ship a PDF lib.

import {
  PersonalTx, getCategory, ils, recurrenceLabel,
  txAppliesToMonth, breakdownByCategory, computeMetrics,
  hebrewMonthLabel, isoMonth,
} from "./personal-finance";

// ── Helpers ──────────────────────────────────────────────────────────────────

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // RFC 4180 — wrap in quotes if it contains comma, quote, or newline.
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so the browser has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function fullHebrewMonth(yyyymm: string): string {
  const [, m] = yyyymm.split("-").map(Number);
  const months = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
  return `${months[m - 1]} ${yyyymm.slice(0, 4)}`;
}

// ── CSV ──────────────────────────────────────────────────────────────────────

export function exportPersonalCSV(opts: {
  txs: PersonalTx[];
  month: string;
}): void {
  const { txs, month } = opts;

  const lines: string[] = [];

  // Header block — explanatory metadata
  lines.push(`# תזרים אישי — ${fullHebrewMonth(month)}`);
  lines.push(`# יוצא בתאריך: ${new Date().toLocaleDateString("he-IL")}`);
  lines.push(``);

  // Active-month summary
  const metrics = computeMetrics(txs, month);
  lines.push(`# סיכום ${fullHebrewMonth(month)}`);
  lines.push(`נטו החודש,${metrics.netThisMonth}`);
  lines.push(`Burn Rate (ממוצע 6ח׳),${Math.round(metrics.burnRate)}`);
  lines.push(`Savings Rate,${(metrics.savingsRate * 100).toFixed(1)}%`);
  lines.push(`צפי שנתי,${Math.round(metrics.annualForecast)}`);
  lines.push(`הוצאות קבועות,${Math.round(metrics.fixedMonthly)}`);
  lines.push(`הוצאות אישיות (טהור),${Math.round(metrics.personalExpensesThisMonth)}`);
  lines.push(`הוצאות עסקיות-קשור,${Math.round(metrics.businessExpensesThisMonth)}`);
  lines.push(``);

  // Per-category breakdown for the active month
  const expenseBreakdown = breakdownByCategory(txs, month, "expense");
  const incomeBreakdown = breakdownByCategory(txs, month, "income");

  lines.push(`# פילוח הכנסות ${fullHebrewMonth(month)}`);
  lines.push(`קטגוריה,סכום (₪)`);
  for (const b of incomeBreakdown) {
    const def = getCategory(b.categoryId);
    lines.push(`${csvEscape(def?.label ?? b.categoryId)},${b.total}`);
  }
  lines.push(``);

  lines.push(`# פילוח הוצאות ${fullHebrewMonth(month)}`);
  lines.push(`קטגוריה,סכום (₪)`);
  for (const b of expenseBreakdown) {
    const def = getCategory(b.categoryId);
    lines.push(`${csvEscape(def?.label ?? b.categoryId)},${b.total}`);
  }
  lines.push(``);

  // Full transaction dump — useful for deeper Excel analysis
  lines.push(`# כל התנועות`);
  lines.push([
    "תאריך התחלה",
    "תאריך סיום",
    "סוג",
    "שייכות",
    "קטגוריה",
    "תיאור",
    "סכום (₪)",
    "תדירות",
    "פעיל בחודש?",
    "הערות",
  ].join(","));

  // Sort newest first by start_date
  const sorted = [...txs].sort((a, b) => b.start_date.localeCompare(a.start_date));
  for (const t of sorted) {
    const def = getCategory(t.category);
    lines.push([
      csvEscape(t.start_date),
      csvEscape(t.end_date ?? ""),
      csvEscape(t.type === "income" ? "הכנסה" : "הוצאה"),
      csvEscape(t.scope === "business" ? "עסקי-קשור" : "אישי"),
      csvEscape(def?.label ?? t.category),
      csvEscape(t.description ?? ""),
      csvEscape(Number(t.amount)),
      csvEscape(recurrenceLabel(t.recurrence)),
      csvEscape(txAppliesToMonth(t, month) ? "כן" : "לא"),
      csvEscape(t.notes ?? ""),
    ].join(","));
  }

  // 12-month rollup so the spreadsheet has a proper trend column.
  lines.push(``);
  lines.push(`# 12 חודשים אחרונים`);
  lines.push(`חודש,הכנסות,הוצאות,נטו`);
  const ref = new Date(month + "-15");
  for (let i = 11; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    const ym = isoMonth(d);
    let income = 0, expense = 0;
    for (const t of txs) {
      if (!txAppliesToMonth(t, ym)) continue;
      const v = Number(t.amount) || 0;
      if (t.type === "income") income += v; else expense += v;
    }
    lines.push(`${hebrewMonthLabel(ym)} ${ym.slice(0,4)},${income},${expense},${income - expense}`);
  }

  // UTF-8 BOM so Excel auto-detects encoding and Hebrew renders correctly.
  const BOM = "\uFEFF";
  const filename = `personal-cash-flow-${month}.csv`;
  downloadFile(filename, BOM + lines.join("\r\n"), "text/csv");
}

// ── PDF (print-based) ────────────────────────────────────────────────────────
// Opens a fresh window with a nicely-formatted HTML report and triggers
// window.print(). The user picks "Save as PDF" in the system print dialog.

export function exportPersonalPDF(opts: {
  txs: PersonalTx[];
  month: string;
}): void {
  const { txs, month } = opts;
  const metrics = computeMetrics(txs, month);
  const expenseBreakdown = breakdownByCategory(txs, month, "expense");
  const incomeBreakdown = breakdownByCategory(txs, month, "income");

  const totalExp = expenseBreakdown.reduce((s, b) => s + b.total, 0);

  const fmtTx = (t: PersonalTx) => {
    const def = getCategory(t.category);
    const scopeChip = t.scope === "business"
      ? `<span class="chip chip-biz">עסק</span>`
      : "";
    return `
      <tr>
        <td>${escapeHtml(t.start_date)}</td>
        <td>${escapeHtml(t.type === "income" ? "הכנסה" : "הוצאה")}</td>
        <td>${escapeHtml(def?.label ?? t.category)} ${scopeChip}</td>
        <td>${escapeHtml(t.description ?? "")}</td>
        <td>${escapeHtml(recurrenceLabel(t.recurrence))}</td>
        <td class="num ${t.type === "income" ? "pos" : "neg"}">${t.type === "income" ? "+" : "−"}${ils(Number(t.amount))}</td>
      </tr>
    `;
  };

  const sorted = [...txs].sort((a, b) => b.start_date.localeCompare(a.start_date));

  // 12-month rollup
  const ref = new Date(month + "-15");
  const rollup: { label: string; income: number; expense: number; net: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    const ym = isoMonth(d);
    let income = 0, expense = 0;
    for (const t of txs) {
      if (!txAppliesToMonth(t, ym)) continue;
      const v = Number(t.amount) || 0;
      if (t.type === "income") income += v; else expense += v;
    }
    rollup.push({ label: `${hebrewMonthLabel(ym)} ${ym.slice(0,4)}`, income, expense, net: income - expense });
  }

  const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<title>תזרים אישי — ${fullHebrewMonth(month)}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    color: #0f172a;
    background: #ffffff;
    padding: 24px 32px;
  }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #64748b; font-size: 12px; margin-bottom: 24px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .kpi { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; }
  .kpi .label { font-size: 11px; color: #64748b; }
  .kpi .value { font-size: 20px; font-weight: 700; margin-top: 4px; }
  h2 { font-size: 14px; margin: 24px 0 8px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: right; padding: 6px 8px; border-bottom: 1px solid #f1f5f9; }
  th { background: #f8fafc; font-weight: 600; color: #475569; }
  td.num { text-align: left; font-variant-numeric: tabular-nums; font-weight: 600; }
  td.pos { color: #16a34a; }
  td.neg { color: #dc2626; }
  .chip { display: inline-block; padding: 1px 6px; border-radius: 999px; font-size: 9px; font-weight: 700; margin-right: 4px; vertical-align: middle; }
  .chip-biz { background: #d1fae5; color: #047857; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .bar { background: #e2e8f0; height: 6px; border-radius: 3px; overflow: hidden; }
  .bar > span { display: block; height: 100%; background: #f97316; }
  footer { margin-top: 32px; font-size: 10px; color: #94a3b8; text-align: center; }
  @media print {
    body { padding: 16px 20px; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <h1>תזרים אישי — ${escapeHtml(fullHebrewMonth(month))}</h1>
  <div class="sub">דוח שהופק ב-${escapeHtml(new Date().toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" }))}</div>

  <div class="kpis">
    <div class="kpi">
      <div class="label">נטו החודש</div>
      <div class="value" style="color:${metrics.netThisMonth >= 0 ? "#16a34a" : "#dc2626"}">${ils(metrics.netThisMonth)}</div>
    </div>
    <div class="kpi">
      <div class="label">Burn Rate (ממוצע 6ח׳)</div>
      <div class="value">${ils(metrics.burnRate)}</div>
    </div>
    <div class="kpi">
      <div class="label">Savings Rate</div>
      <div class="value">${(metrics.savingsRate * 100).toFixed(0)}%</div>
    </div>
    <div class="kpi">
      <div class="label">צפי שנתי</div>
      <div class="value">${ils(metrics.annualForecast)}</div>
    </div>
  </div>

  ${(metrics.businessExpensesThisMonth + metrics.personalExpensesThisMonth) > 0 ? `
  <div class="kpis" style="grid-template-columns: 1fr 1fr;">
    <div class="kpi" style="background:#f8fafc;">
      <div class="label">אישי טהור</div>
      <div class="value" style="color:#0f172a;">${ils(metrics.personalExpensesThisMonth)}</div>
    </div>
    <div class="kpi" style="background:#ecfdf5;">
      <div class="label">עסקי-קשור</div>
      <div class="value" style="color:#047857;">${ils(metrics.businessExpensesThisMonth)}</div>
    </div>
  </div>
  ` : ""}

  <div class="grid2">
    <div>
      <h2>הכנסות החודש</h2>
      <table>
        <thead><tr><th>קטגוריה</th><th style="text-align:left">סכום</th></tr></thead>
        <tbody>
          ${incomeBreakdown.map(b => {
            const def = getCategory(b.categoryId);
            return `<tr><td>${escapeHtml(def?.label ?? b.categoryId)}</td><td class="num pos">${ils(b.total)}</td></tr>`;
          }).join("") || `<tr><td colspan="2" style="color:#94a3b8">אין הכנסות בחודש זה</td></tr>`}
        </tbody>
      </table>
    </div>
    <div>
      <h2>הוצאות החודש</h2>
      <table>
        <thead><tr><th>קטגוריה</th><th>אחוז</th><th style="text-align:left">סכום</th></tr></thead>
        <tbody>
          ${expenseBreakdown.map(b => {
            const def = getCategory(b.categoryId);
            const share = totalExp > 0 ? Math.round((b.total / totalExp) * 100) : 0;
            return `<tr>
              <td>${escapeHtml(def?.label ?? b.categoryId)}</td>
              <td><div class="bar"><span style="width:${share}%"></span></div></td>
              <td class="num neg">${ils(b.total)}</td>
            </tr>`;
          }).join("") || `<tr><td colspan="3" style="color:#94a3b8">אין הוצאות בחודש זה</td></tr>`}
        </tbody>
      </table>
    </div>
  </div>

  <h2>12 חודשים אחרונים</h2>
  <table>
    <thead><tr><th>חודש</th><th style="text-align:left">הכנסות</th><th style="text-align:left">הוצאות</th><th style="text-align:left">נטו</th></tr></thead>
    <tbody>
      ${rollup.map(r => `
        <tr>
          <td>${escapeHtml(r.label)}</td>
          <td class="num pos">${ils(r.income)}</td>
          <td class="num neg">${ils(r.expense)}</td>
          <td class="num" style="color:${r.net >= 0 ? "#2563eb" : "#dc2626"}">${ils(r.net)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <h2>כל התנועות</h2>
  <table>
    <thead>
      <tr>
        <th>תאריך</th>
        <th>סוג</th>
        <th>קטגוריה</th>
        <th>תיאור</th>
        <th>תדירות</th>
        <th style="text-align:left">סכום</th>
      </tr>
    </thead>
    <tbody>
      ${sorted.length > 0
        ? sorted.map(fmtTx).join("")
        : `<tr><td colspan="6" style="color:#94a3b8">אין תנועות</td></tr>`}
    </tbody>
  </table>

  <footer>גנן Pro — תזרים אישי</footer>

  <script>
    // Auto-trigger the print dialog on load. The user picks "Save as PDF".
    window.addEventListener("load", function() {
      setTimeout(function(){ window.print(); }, 250);
    });
  </script>
</body>
</html>`;

  // Use a Blob URL so RTL Hebrew + the auto-print script stay intact.
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) {
    URL.revokeObjectURL(url);
    alert("הדפדפן חסם את חלון הייצוא. אפשר חלונות קופצים ונסה שוב.");
    return;
  }
  // Revoke after the new tab has had time to load.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

// ── HTML escape ──────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
