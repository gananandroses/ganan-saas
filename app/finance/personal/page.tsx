"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp, Flame, PiggyBank, Calendar, Plus,
  ChevronUp, ChevronDown, Loader2, RefreshCw, X, Pencil, Trash2,
  Sparkles, Repeat, AlertCircle, ChevronRight, ChevronLeft,
  Download, FileSpreadsheet, FileText, Briefcase, User as UserIcon,
} from "lucide-react";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  Tooltip, Line, ComposedChart, Cell, PieChart, Pie,
} from "recharts";
import { supabase } from "@/lib/supabase/client";
import { toast, confirmDialog } from "@/components/Toaster";
import {
  PersonalTx, Recurrence, TxType, Scope, RawBusinessTxRow,
  INCOME_CATEGORIES, EXPENSE_CATEGORIES, getCategory, categoryClasses, categoryHex,
  isoMonth, hebrewMonthLabel, monthlySeries, computeMetrics,
  breakdownByCategory, businessIncomeAsPersonalTxs, isVirtualTx,
  ils, pct, recurrenceLabel,
} from "@/lib/personal-finance";
import { exportPersonalCSV, exportPersonalPDF } from "@/lib/export-personal";

// ── Helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftMonth(yyyymm: string, by: number): string {
  const [y, m] = yyyymm.split("-").map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return isoMonth(d);
}

function fullHebrewMonth(yyyymm: string): string {
  const [, m] = yyyymm.split("-").map(Number);
  const months = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
  return `${months[m - 1]} ${yyyymm.slice(0, 4)}`;
}

// ── KPI card ─────────────────────────────────────────────────────────────────

function Kpi({
  icon, iconBg, label, value, trend, trendColor, trendIcon, sub,
}: {
  icon: React.ReactNode; iconBg: string; label: string; value: string;
  trend?: string; trendColor?: string; trendIcon?: React.ReactNode; sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 sm:p-6 flex flex-col gap-3 border border-gray-100">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-semibold ${trendColor ?? "text-gray-500"}`}>
            {trendIcon}
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{label}</p>
      </div>
      {sub && <p className="text-[11px] sm:text-xs text-gray-400 border-t border-gray-50 pt-2">{sub}</p>}
    </div>
  );
}

// Tiny pill flagging a transaction as business-related.
function ScopePill() {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700 flex-shrink-0">
      <Briefcase size={9} />
      עסק
    </span>
  );
}

// ── Business-scope split card ────────────────────────────────────────────────
// Splits the month's expense total into "purely personal" vs "business-related".
// Skips rendering when there's nothing to show on either side.

import type { CashFlowMetrics } from "@/lib/personal-finance";

function BusinessScopeCard({ metrics, onSelect }: { metrics: CashFlowMetrics; onSelect?: (scope: Scope) => void }) {
  const total = metrics.businessExpensesThisMonth + metrics.personalExpensesThisMonth;
  if (total <= 0) return null;
  const businessShare = total > 0 ? metrics.businessExpensesThisMonth / total : 0;
  const personalShare = 1 - businessShare;
  const clickable = !!onSelect;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 sm:p-6 border border-gray-100">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">פילוח לפי שייכות</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {clickable ? "לחץ על קטגוריה לפירוט מלא" : "כמה מההוצאות החודש הלכו לעסק"}
          </p>
        </div>
        <div className="text-xs text-gray-500">
          סה״כ: <span className="font-bold text-gray-800">{ils(total)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Personal */}
        <button
          type="button"
          onClick={() => onSelect?.("personal")}
          disabled={!clickable}
          className={`text-right bg-slate-50 border border-slate-100 rounded-xl p-4 transition-all ${
            clickable ? "hover:border-slate-300 hover:shadow-sm active:scale-[0.99] cursor-pointer" : "cursor-default"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center">
              <UserIcon size={14} className="text-slate-700" />
            </div>
            <span className="text-xs font-semibold text-slate-700">אישי טהור</span>
            <span className="text-xs text-slate-400 mr-auto tabular-nums">{(personalShare * 100).toFixed(0)}%</span>
            {clickable && <ChevronLeft size={13} className="text-slate-400" />}
          </div>
          <p className="text-xl font-bold text-slate-900 tabular-nums">{ils(metrics.personalExpensesThisMonth)}</p>
        </button>
        {/* Business-related */}
        <button
          type="button"
          onClick={() => onSelect?.("business")}
          disabled={!clickable}
          className={`text-right bg-emerald-50 border border-emerald-100 rounded-xl p-4 transition-all ${
            clickable ? "hover:border-emerald-300 hover:shadow-sm active:scale-[0.99] cursor-pointer" : "cursor-default"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-emerald-200 flex items-center justify-center">
              <Briefcase size={14} className="text-emerald-700" />
            </div>
            <span className="text-xs font-semibold text-emerald-700">עסקי-קשור</span>
            <span className="text-xs text-emerald-500 mr-auto tabular-nums">{(businessShare * 100).toFixed(0)}%</span>
            {clickable && <ChevronLeft size={13} className="text-emerald-400" />}
          </div>
          <p className="text-xl font-bold text-emerald-900 tabular-nums">{ils(metrics.businessExpensesThisMonth)}</p>
          {metrics.businessExpensesThisMonth > 0 && (
            <p className="text-[10px] text-emerald-700 mt-1">
              💡 אלו הוצאות עסקיות שיצאו מהכיס האישי — שקול לתבוע החזר
            </p>
          )}
        </button>
      </div>

      {/* Visual bar */}
      <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden flex">
        <div className="bg-slate-400 h-full transition-all"
          style={{ width: `${personalShare * 100}%` }} />
        <div className="bg-emerald-500 h-full transition-all"
          style={{ width: `${businessShare * 100}%` }} />
      </div>
    </div>
  );
}

// ── Scope drill-down modal ───────────────────────────────────────────────────
// Surfaces the actual transactions behind a scope segment in
// "פילוח לפי שייכות". Tapping the box on the parent card opens this
// sheet pre-filtered to that scope ("personal" / "business"), expense
// transactions only, in the selected month — so the gardener sees the
// exact list of numbers that built that pie slice.

function ScopeDrillDownModal({
  scope, month, txs, onClose, onEdit,
}: {
  scope: Scope;
  month: string;       // "YYYY-MM"
  txs: PersonalTx[];   // all txs (we filter inside)
  onClose: () => void;
  onEdit: (tx: PersonalTx) => void;
}) {
  const isPersonal = scope === "personal";

  // Filter: expense + matching scope + active during the chosen month.
  // Recurring transactions that span this month count; one-time that
  // started this month count. Anything ending before this month is out.
  const ym = month;
  const rows = useMemo(() => {
    return txs
      .filter(t => t.type === "expense")
      .filter(t => (t.scope ?? "personal") === scope)
      .filter(t => {
        const start = isoMonth(t.start_date);
        if (start > ym) return false;
        if (t.recurrence === "one_time") return start === ym;
        if (t.end_date && isoMonth(t.end_date) < ym) return false;
        return true;
      })
      .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
  }, [txs, scope, ym]);

  const total = rows.reduce((s, t) => s + (t.amount ?? 0), 0);
  const title = isPersonal ? "אישי טהור" : "עסקי-קשור";
  const accentBg = isPersonal ? "bg-slate-100" : "bg-emerald-100";
  const accentText = isPersonal ? "text-slate-700" : "text-emerald-700";
  const Icon = isPersonal ? UserIcon : Briefcase;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full sm:max-w-lg sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[88vh]" dir="rtl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${accentBg}`}>
              <Icon size={16} className={accentText} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-gray-900">{title}</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {rows.length} {rows.length === 1 ? "תנועה" : "תנועות"} · {hebrewMonthLabel(ym)}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="סגור" className="hit-44 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Total */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-baseline justify-between bg-gray-50/50 flex-shrink-0">
          <span className="text-xs font-semibold text-gray-500">סה״כ החודש</span>
          <span className="text-xl font-black text-gray-900 tabular-nums">{ils(total)}</span>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-3 py-3">
          {rows.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-gray-50 flex items-center justify-center">
                <Icon size={18} className="text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">אין תנועות בקטגוריה זו החודש</p>
            </div>
          ) : (
            <div className="space-y-1">
              {rows.map(tx => {
                const cat = getCategory(tx.category);
                const CatIcon = cat?.icon;
                const recur = tx.recurrence !== "one_time";
                return (
                  <button
                    key={tx.id}
                    onClick={() => onEdit(tx)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-right"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 text-gray-500">
                      {CatIcon ? <CatIcon size={16} /> : <span className="text-base">💸</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {tx.description?.trim() || cat?.label || tx.category}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate flex items-center gap-1.5">
                        {recur && <Repeat size={10} className="flex-shrink-0" />}
                        <span>{recurrenceLabel(tx.recurrence)}</span>
                        {tx.description && cat && <span>· {cat.label}</span>}
                      </p>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <p className="text-base font-black text-gray-900 tabular-nums">{ils(tx.amount)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        {!isPersonal && total > 0 && (
          <div className="px-5 py-3 border-t border-emerald-100 bg-emerald-50/50 flex-shrink-0">
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              💡 שקול לתבוע החזר עסקי על {ils(total)} מההכנסה החודשית של העסק
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Cash-flow chart tooltip ──────────────────────────────────────────────────

interface ChartPayload { value: number; name: string; dataKey: string }
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: ChartPayload[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const get = (k: string) => payload.find(p => p.dataKey === k)?.value ?? 0;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs space-y-0.5" dir="rtl">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p style={{ color: "#22c55e" }}>הכנסות: {ils(get("income"))}</p>
      <p style={{ color: "#f97316" }}>הוצאות: {ils(get("expense"))}</p>
      <p style={{ color: "#3b82f6" }}>נטו: {ils(get("net"))}</p>
    </div>
  );
}

// ── Add / Edit modal ─────────────────────────────────────────────────────────

interface FormState {
  type: TxType;
  category: string;
  amount: string;
  description: string;
  recurrence: Recurrence;
  start_date: string;
  end_date: string;
  notes: string;
  scope: Scope;
}

const EMPTY_FORM: FormState = {
  type: "expense", category: "groceries", amount: "", description: "",
  recurrence: "one_time", start_date: todayISO(), end_date: "", notes: "",
  scope: "personal",
};

function TxModal({
  initial, onClose, onSaved,
}: {
  initial: PersonalTx | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => {
    if (!initial) return EMPTY_FORM;
    return {
      type: initial.type,
      category: initial.category,
      amount: String(initial.amount),
      description: initial.description ?? "",
      recurrence: initial.recurrence,
      start_date: initial.start_date,
      end_date: initial.end_date ?? "",
      notes: initial.notes ?? "",
      scope: initial.scope ?? "personal",
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  // Helper: switching type may leave the previously-picked category invalid
  // for the new type, so we snap to the first valid one.
  function setType(t: TxType) {
    setForm(p => {
      const list = t === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
      const stillValid = list.some(c => c.id === p.category);
      return { ...p, type: t, category: stillValid ? p.category : list[0].id };
    });
  }

  async function handleSave() {
    setError(null);
    const amount = parseFloat(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) { setError("סכום לא תקין"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("נא להתחבר מחדש"); setSaving(false); return; }

    const payload = {
      user_id: user.id,
      type: form.type,
      category: form.category,
      amount,
      description: form.description.trim() || null,
      recurrence: form.recurrence,
      start_date: form.start_date || todayISO(),
      end_date: form.recurrence === "one_time" ? null : (form.end_date || null),
      notes: form.notes.trim() || null,
      scope: form.scope,
    };

    const { error } = initial
      ? await supabase.from("personal_transactions").update(payload).eq("id", initial.id).eq("user_id", user.id)
      : await supabase.from("personal_transactions").insert(payload);

    setSaving(false);
    if (error) {
      let msg: string;
      if (/scope/i.test(error.message ?? "")) {
        msg = `העמודה scope לא קיימת ב-DB.\nהרץ את lib/supabase/add-personal-tx-scope-migration.sql ב-Supabase SQL Editor.`;
      } else if (/personal_transactions/i.test(error.message ?? "")) {
        msg = `הטבלה personal_transactions לא קיימת ב-DB.\nהרץ את lib/supabase/add-personal-transactions-migration.sql ב-Supabase SQL Editor.`;
      } else {
        msg = `שגיאה: ${error.message}`;
      }
      setError(msg);
      return;
    }
    onSaved();
    onClose();
  }

  async function handleDelete() {
    if (!initial) return;
    // Optimistic delete with undo toast — deletion fires only after the
    // 6-second window expires. No confirmDialog needed because the
    // action is reversible.
    const snapshot = initial;
    onSaved();
    onClose();

    let undone = false;
    toast.action({
      message: "התנועה נמחקה",
      description: "אפשר לבטל תוך 6 שניות",
      actionLabel: "ביטול",
      onAction: async () => {
        undone = true;
        // We can't restore via local state from inside this isolated modal,
        // so the cleanest restore is to re-insert the snapshot row.
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from("personal_transactions").insert({
          ...snapshot,
          user_id: user.id,
        });
        onSaved();
        toast.success("שוחזר");
      },
      durationMs: 6000,
    });
    setTimeout(async () => {
      if (undone) return;
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("personal_transactions").delete().eq("id", snapshot.id).eq("user_id", user?.id);
    }, 6000);
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-md sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col" dir="rtl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <h3 className="text-base font-bold text-gray-900">
            {initial ? "עריכת תנועה" : "תנועה חדשה"}
          </h3>
          <button onClick={onClose} aria-label="סגור" className="hit-44 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
          {/* Income/Expense toggle */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">סוג</label>
            <div className="grid grid-cols-2 gap-2">
              {(["income", "expense"] as TxType[]).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`text-sm font-semibold py-2.5 rounded-xl transition-colors ${
                    form.type === t
                      ? (t === "income" ? "bg-green-600 text-white" : "bg-orange-500 text-white")
                      : "bg-gray-100 text-gray-500"
                  }`}>
                  {t === "income" ? "הכנסה" : "הוצאה"}
                </button>
              ))}
            </div>
          </div>

          {/* Scope toggle — personal vs business-related */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              שייכות
              <span className="text-gray-400 font-normal mr-1">(האם זה היה בשביל העסק?)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setForm(p => ({ ...p, scope: "personal" }))}
                className={`flex items-center justify-center gap-1.5 text-sm font-semibold py-2.5 rounded-xl transition-colors ${
                  form.scope === "personal" ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-500"
                }`}>
                <UserIcon size={13} />
                אישי
              </button>
              <button onClick={() => setForm(p => ({ ...p, scope: "business" }))}
                className={`flex items-center justify-center gap-1.5 text-sm font-semibold py-2.5 rounded-xl transition-colors ${
                  form.scope === "business" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-500"
                }`}>
                <Briefcase size={13} />
                עסקי-קשור
              </button>
            </div>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">קטגוריה</label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map(c => {
                const active = form.category === c.id;
                const cls = categoryClasses(c);
                const Icon = c.icon;
                return (
                  <button key={c.id} onClick={() => setForm(p => ({ ...p, category: c.id }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      active ? `${cls.bg} ${cls.text} ring-1 ${cls.ring}` : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }`}>
                    <Icon size={12} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">סכום (₪)</label>
            <input
              type="number" inputMode="decimal" autoComplete="off" value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              placeholder="0"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">תיאור (אופציונלי)</label>
            <input
              autoComplete="off"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="למשל: שכ״ד דירה / נטפליקס / סופר"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          {/* Recurrence */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">תדירות</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["one_time", "monthly", "yearly"] as Recurrence[]).map(r => (
                <button key={r} onClick={() => setForm(p => ({ ...p, recurrence: r }))}
                  className={`text-xs font-semibold py-2 rounded-xl transition-colors ${
                    form.recurrence === r ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
                  }`}>
                  {recurrenceLabel(r)}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                {form.recurrence === "one_time" ? "תאריך" : "החל מ"}
              </label>
              <input type="date" value={form.start_date} dir="ltr"
                onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            {form.recurrence !== "one_time" && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">עד (אופציונלי)</label>
                <input type="date" value={form.end_date} dir="ltr"
                  onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-xs text-red-700 whitespace-pre-line">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {initial && (
            <button onClick={handleDelete} disabled={saving} aria-label="מחק"
              className="px-4 py-3 rounded-2xl border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50">
              <Trash2 size={16} />
            </button>
          )}
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold rounded-2xl py-3 text-sm">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {saving ? "שומר..." : initial ? "שמור שינויים" : "הוסף תנועה"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PersonalCashFlowPage() {
  const router = useRouter();
  // Which scope (if any) the user is drilling into via BusinessScopeCard.
  // null = no modal open; "personal"/"business" → list modal for that scope.
  const [scopeDrillDown, setScopeDrillDown] = useState<Scope | null>(null);
  const [txs, setTxs] = useState<PersonalTx[]>([]);
  const [businessTxs, setBusinessTxs] = useState<PersonalTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [month, setMonth] = useState(() => isoMonth(new Date()));
  const [editing, setEditing] = useState<PersonalTx | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [persRes, bizRes] = await Promise.all([
        supabase.from("personal_transactions").select("*").eq("user_id", user.id).order("start_date", { ascending: false }),
        supabase.from("transactions").select("id, type, amount, status, transaction_date, vat_amount").eq("user_id", user.id).eq("type", "income"),
      ]);

      if (cancelled) return;

      // Surface a friendly error if the table hasn't been migrated yet.
      if (persRes.error && /personal_transactions/i.test(persRes.error.message)) {
        setErr("הטבלה personal_transactions לא קיימת. הרץ את lib/supabase/add-personal-transactions-migration.sql ב-Supabase SQL Editor.");
      }

      // Normalise scope so downstream code can rely on it being set even if
      // the DB row predates the migration.
      const rows = (persRes.data ?? []) as PersonalTx[];
      setTxs(rows.map(r => ({ ...r, scope: (r.scope ?? "personal") as Scope })));
      setBusinessTxs(businessIncomeAsPersonalTxs((bizRes.data ?? []) as RawBusinessTxRow[], user.id));
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [refreshTick]);

  // Refetch on tab focus — keeps numbers fresh after editing on another page.
  useEffect(() => {
    const onFocus = () => setRefreshTick(t => t + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // All txs = user-entered + synthesised business income
  const allTxs = useMemo(() => [...txs, ...businessTxs], [txs, businessTxs]);
  const metrics = useMemo(() => computeMetrics(allTxs, month), [allTxs, month]);
  const series = useMemo(() => monthlySeries(allTxs, 12, new Date(month + "-15")), [allTxs, month]);

  const expenseBreakdown = useMemo(() =>
    breakdownByCategory(allTxs, month, "expense").map(b => ({
      ...b, def: getCategory(b.categoryId),
    })).filter(b => b.def),
  [allTxs, month]);

  const incomeBreakdown = useMemo(() =>
    breakdownByCategory(allTxs, month, "income").map(b => ({
      ...b, def: getCategory(b.categoryId),
    })).filter(b => b.def),
  [allTxs, month]);

  // Recurring (fixed) expenses, current — order by amount desc so big ones surface first.
  const recurring = useMemo(() =>
    txs
      .filter(t => t.type === "expense" && t.recurrence !== "one_time")
      .filter(t => !t.end_date || new Date(t.end_date + "T00:00:00") >= new Date(month + "-01T00:00:00"))
      .sort((a, b) => Number(b.amount) - Number(a.amount)),
  [txs, month]);

  // One-time expenses dated in the active month — recent activity.
  const oneTimeThisMonth = useMemo(() => {
    const ym = month;
    return txs
      .filter(t => t.recurrence === "one_time" && t.type === "expense" && t.start_date.startsWith(ym))
      .sort((a, b) => b.start_date.localeCompare(a.start_date));
  }, [txs, month]);

  // Empty state — first run, no data
  const isEmpty = !loading && !err && txs.length === 0;

  return (
    <div className="min-h-screen" dir="rtl">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-5 flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => router.push("/finance")}
              aria-label="חזרה לפיננסים"
              className="hit-44 w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <ChevronRight size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">תזרים אישי</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                כמה באמת נשאר לך בסוף החודש — כולל תחזית שנתית
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setRefreshTick(t => t + 1)} disabled={loading}
              className="p-2.5 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 active:scale-95 transition disabled:opacity-50"
              title="רענן">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>

            {/* Export dropdown */}
            <div className="relative">
              <button onClick={() => setShowExport(s => !s)}
                disabled={txs.length === 0 && businessTxs.length === 0}
                className="flex items-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-3.5 py-2.5 rounded-xl text-sm font-semibold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                title="ייצוא נתונים">
                <Download size={15} />
                <span className="hidden sm:inline">ייצוא</span>
                <ChevronDown size={13} className={`transition-transform ${showExport ? "rotate-180" : ""}`} />
              </button>
              {showExport && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowExport(false)} />
                  <div className="absolute left-0 mt-2 w-56 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden z-40" dir="rtl">
                    <button
                      onClick={() => {
                        exportPersonalCSV({ txs: allTxs, month });
                        setShowExport(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-right transition">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <FileSpreadsheet size={16} className="text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">אקסל (CSV)</p>
                        <p className="text-[11px] text-gray-400">נפתח ב-Excel / Numbers</p>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        exportPersonalPDF({ txs: allTxs, month });
                        setShowExport(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-right transition border-t border-gray-100">
                      <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                        <FileText size={16} className="text-rose-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">PDF</p>
                        <p className="text-[11px] text-gray-400">דוח מודפס מעוצב</p>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>

            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm">
              <Plus size={15} />
              <span className="hidden sm:inline">הוסף תנועה</span>
              <span className="sm:hidden">הוסף</span>
            </button>
          </div>
        </div>

        {/* Month picker */}
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 pb-4 flex items-center gap-2">
          <button onClick={() => setMonth(m => shiftMonth(m, -1))}
            className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200">
            <ChevronRight size={16} />
          </button>
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 flex items-center gap-2 min-w-[160px] justify-center">
            <Calendar size={14} className="text-gray-400" />
            <span className="text-sm font-bold text-gray-800">{fullHebrewMonth(month)}</span>
          </div>
          <button onClick={() => setMonth(m => shiftMonth(m, 1))}
            className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200">
            <ChevronLeft size={16} />
          </button>
          {month !== isoMonth(new Date()) && (
            <button onClick={() => setMonth(isoMonth(new Date()))}
              className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg font-semibold">
              חזור להיום
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {err && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800 whitespace-pre-line">{err}</div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="animate-spin text-green-600" size={28} />
          </div>
        ) : isEmpty ? (
          <EmptyState onAdd={() => setShowAdd(true)} />
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
              <Kpi
                icon={<PiggyBank size={20} className={metrics.netThisMonth >= 0 ? "text-green-600" : "text-red-500"} />}
                iconBg={metrics.netThisMonth >= 0 ? "bg-green-50" : "bg-red-50"}
                label="נטו החודש"
                value={ils(metrics.netThisMonth)}
                trend={metrics.monthOverMonth !== 0 ? `${metrics.monthOverMonth > 0 ? "+" : ""}${(metrics.monthOverMonth * 100).toFixed(0)}% MoM` : undefined}
                trendColor={metrics.monthOverMonth >= 0 ? "text-green-600" : "text-red-500"}
                trendIcon={metrics.monthOverMonth >= 0 ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                sub="הכנסות פחות הוצאות"
              />
              <Kpi
                icon={<Flame size={20} className="text-orange-500" />}
                iconBg="bg-orange-50"
                label="Burn Rate"
                value={ils(metrics.burnRate)}
                sub="ממוצע הוצאה ב-6 חודשים"
              />
              <Kpi
                icon={<TrendingUp size={20} className="text-blue-600" />}
                iconBg="bg-blue-50"
                label="Savings Rate"
                value={pct(metrics.savingsRate)}
                sub="חיסכון מתוך ההכנסות החודש"
              />
              <Kpi
                icon={<Sparkles size={20} className="text-purple-600" />}
                iconBg="bg-purple-50"
                label="צפי שנתי"
                value={ils(metrics.annualForecast)}
                trend={metrics.annualForecast >= 0 ? "חיסכון" : "גירעון"}
                trendColor={metrics.annualForecast >= 0 ? "text-green-600" : "text-red-500"}
                sub="על בסיס ממוצע 6ח׳"
              />
            </div>

            {/* Personal vs business-related expense split */}
            <BusinessScopeCard metrics={metrics} onSelect={(s) => setScopeDrillDown(s)} />

            {/* Cash flow chart */}
            <div className="bg-white rounded-2xl shadow-sm p-5 sm:p-6 border border-gray-100">
              <div className="flex items-start justify-between flex-wrap gap-2 mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900">תזרים מזומנים — 12 חודשים</h2>
                  <p className="text-xs text-gray-400 mt-0.5">הכנסות, הוצאות והנטו ביניהן</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />הכנסות</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-400" />הוצאות</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />נטו</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={series.map(s => ({ ...s, label: hebrewMonthLabel(s.month) }))}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`} width={48} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="income" fill="#22c55e" radius={[5, 5, 0, 0]} maxBarSize={24} />
                  <Bar dataKey="expense" fill="#fb923c" radius={[5, 5, 0, 0]} maxBarSize={24} />
                  <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: "#3b82f6" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Two columns: Fixed + Variable breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
              {/* Fixed expenses */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-5 sm:p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <Repeat size={15} className="text-gray-400" />
                      הוצאות קבועות
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">סה״כ {ils(metrics.fixedMonthly)} בחודש</p>
                  </div>
                </div>

                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {recurring.length === 0 ? (
                    <p className="text-sm text-gray-400 py-6 text-center">אין הוצאות קבועות עדיין.</p>
                  ) : recurring.map(t => {
                    const def = getCategory(t.category);
                    if (!def) return null;
                    const cls = categoryClasses(def);
                    const Icon = def.icon;
                    return (
                      <button key={t.id} onClick={() => setEditing(t)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50/60 border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition text-right">
                        <div className={`w-9 h-9 rounded-lg ${cls.bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon size={15} className={cls.text} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {t.description || def.label}
                            </p>
                            {t.scope === "business" && <ScopePill />}
                          </div>
                          <p className="text-[11px] text-gray-400">
                            {def.label} · {recurrenceLabel(t.recurrence)}
                          </p>
                        </div>
                        <div className="text-left flex-shrink-0">
                          <p className="text-sm font-bold text-gray-800">{ils(Number(t.amount))}</p>
                          <Pencil size={11} className="text-gray-300 mr-auto" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Variable / breakdown donut */}
              <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm p-5 sm:p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">לאן הכסף הולך</h2>
                    <p className="text-xs text-gray-400 mt-0.5">פילוח הוצאות ב{fullHebrewMonth(month)}</p>
                  </div>
                </div>

                {expenseBreakdown.length === 0 ? (
                  <p className="text-sm text-gray-400 py-12 text-center">אין הוצאות בחודש זה.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={expenseBreakdown} dataKey="total" nameKey="categoryId"
                          cx="50%" cy="50%" innerRadius={50} outerRadius={86} paddingAngle={2}>
                          {expenseBreakdown.map((b, i) => (
                            <Cell key={i} fill={b.def ? categoryHex(b.def) : "#94a3b8"} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, _n, item) => {
                            const num = typeof value === "number" ? value : Number(value) || 0;
                            const payload = (item as { payload?: { categoryId?: string } })?.payload;
                            const def = payload?.categoryId ? getCategory(payload.categoryId) : undefined;
                            return [ils(num), def?.label ?? payload?.categoryId ?? ""];
                          }}
                          contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #f1f5f9", direction: "rtl" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <ul className="space-y-1.5">
                      {expenseBreakdown.slice(0, 8).map(b => {
                        if (!b.def) return null;
                        const cls = categoryClasses(b.def);
                        const total = expenseBreakdown.reduce((s, x) => s + x.total, 0);
                        const share = total > 0 ? b.total / total : 0;
                        return (
                          <li key={b.categoryId} className="flex items-center gap-2 text-xs">
                            <span className={`w-2 h-2 rounded-full ${cls.dot}`} />
                            <span className="text-gray-700 flex-1 truncate">{b.def.label}</span>
                            <span className="font-bold text-gray-800">{ils(b.total)}</span>
                            <span className="text-gray-400 w-10 text-left">{(share * 100).toFixed(0)}%</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* This month — recent activity + income breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
              <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm p-5 sm:p-6 border border-gray-100">
                <h2 className="text-base font-bold text-gray-900 mb-1">תנועות החודש</h2>
                <p className="text-xs text-gray-400 mb-4">הוצאות חד-פעמיות ב{fullHebrewMonth(month)}</p>
                {oneTimeThisMonth.length === 0 ? (
                  <p className="text-sm text-gray-400 py-8 text-center">אין תנועות חד-פעמיות החודש.</p>
                ) : (
                  <ul className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                    {oneTimeThisMonth.map(t => {
                      const def = getCategory(t.category);
                      if (!def) return null;
                      const cls = categoryClasses(def);
                      const Icon = def.icon;
                      return (
                        <li key={t.id}>
                          <button onClick={() => setEditing(t)}
                            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition text-right">
                            <div className={`w-8 h-8 rounded-lg ${cls.bg} flex items-center justify-center flex-shrink-0`}>
                              <Icon size={13} className={cls.text} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm text-gray-800 truncate">{t.description || def.label}</p>
                                {t.scope === "business" && <ScopePill />}
                              </div>
                              <p className="text-[11px] text-gray-400">{t.start_date.slice(5).replace("-", "/")} · {def.label}</p>
                            </div>
                            <span className="text-sm font-bold text-orange-600 flex-shrink-0">−{ils(Number(t.amount))}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-5 sm:p-6 border border-gray-100">
                <h2 className="text-base font-bold text-gray-900 mb-1">הכנסות החודש</h2>
                <p className="text-xs text-gray-400 mb-4">לפי מקור</p>
                {incomeBreakdown.length === 0 ? (
                  <p className="text-sm text-gray-400 py-8 text-center">אין הכנסות בחודש זה.</p>
                ) : (
                  <ul className="space-y-2">
                    {incomeBreakdown.map(b => {
                      if (!b.def) return null;
                      const cls = categoryClasses(b.def);
                      const Icon = b.def.icon;
                      const isBusiness = b.categoryId === "business";
                      return (
                        <li key={b.categoryId}
                          className={`flex items-center gap-3 p-2.5 rounded-xl ${isBusiness ? "bg-emerald-50/50 border border-emerald-100" : "bg-gray-50/50"}`}>
                          <div className={`w-8 h-8 rounded-lg ${cls.bg} flex items-center justify-center flex-shrink-0`}>
                            <Icon size={13} className={cls.text} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800">{b.def.label}</p>
                            {isBusiness && <p className="text-[10px] text-emerald-700">אוטומטי מ-/finance</p>}
                          </div>
                          <span className="text-sm font-bold text-green-700">+{ils(b.total)}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Annual overview */}
            <AnnualOverview txs={allTxs} reference={month} />
          </>
        )}
      </div>

      {/* Modals */}
      {(showAdd || editing) && (
        <TxModal
          initial={editing && !isVirtualTx(editing) ? editing : null}
          onClose={() => { setShowAdd(false); setEditing(null); }}
          onSaved={() => setRefreshTick(t => t + 1)}
        />
      )}
      {scopeDrillDown && (
        <ScopeDrillDownModal
          scope={scopeDrillDown}
          month={month}
          txs={allTxs}
          onClose={() => setScopeDrillDown(null)}
          onEdit={(tx) => {
            setScopeDrillDown(null);
            if (!isVirtualTx(tx)) setEditing(tx);
          }}
        />
      )}
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-8 sm:p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center mx-auto mb-4">
        <PiggyBank size={28} className="text-green-700" />
      </div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">בוא נראה לאן הכסף שלך הולך</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
        הוסף כמה הוצאות קבועות (שכ״ד, רכב, מנויים) והכנסה חודשית — ואני מציג לך תזרים מלא, Burn Rate ותחזית שנתית.
      </p>
      <button onClick={onAdd}
        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-2xl shadow-sm">
        <Plus size={16} />
        התחל עכשיו
      </button>
      <p className="text-[11px] text-gray-400 mt-4">
        💡 הרווח הנקי מהעסק יופיע אוטומטית כהכנסה
      </p>
    </div>
  );
}

// ── Annual overview ──────────────────────────────────────────────────────────

function AnnualOverview({ txs, reference }: { txs: PersonalTx[]; reference: string }) {
  const year = reference.slice(0, 4);
  // 12 months of the active year
  const months = useMemo(() => {
    const out: { ym: string; income: number; expense: number; net: number }[] = [];
    for (let m = 1; m <= 12; m++) {
      const ym = `${year}-${String(m).padStart(2, "0")}`;
      const income = sum(txs, ym, "income");
      const expense = sum(txs, ym, "expense");
      out.push({ ym, income, expense, net: income - expense });
    }
    return out;
  }, [txs, year]);

  const totalIncome = months.reduce((s, m) => s + m.income, 0);
  const totalExpense = months.reduce((s, m) => s + m.expense, 0);
  const totalNet = totalIncome - totalExpense;

  // YTD only — months that have already happened
  const todayYM = isoMonth(new Date());
  const ytdMonths = months.filter(m => m.ym <= todayYM);
  const avgMonthlyExpense = ytdMonths.length > 0 ? ytdMonths.reduce((s, m) => s + m.expense, 0) / ytdMonths.length : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 sm:p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div>
          <h2 className="text-base font-bold text-gray-900">סקירה שנתית — {year}</h2>
          <p className="text-xs text-gray-400 mt-0.5">12 חודשים, כולל תחזית למה שנותר</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-xs text-green-700">הכנסות {year}</p>
          <p className="text-lg font-bold text-green-700">{ils(totalIncome)}</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-4">
          <p className="text-xs text-orange-700">הוצאות {year}</p>
          <p className="text-lg font-bold text-orange-700">{ils(totalExpense)}</p>
        </div>
        <div className={`${totalNet >= 0 ? "bg-blue-50" : "bg-red-50"} rounded-xl p-4`}>
          <p className={`text-xs ${totalNet >= 0 ? "text-blue-700" : "text-red-700"}`}>נטו {year}</p>
          <p className={`text-lg font-bold ${totalNet >= 0 ? "text-blue-700" : "text-red-700"}`}>{ils(totalNet)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-500">ממוצע הוצאה חודשי</p>
          <p className="text-lg font-bold text-gray-800">{ils(avgMonthlyExpense)}</p>
        </div>
      </div>

      {/* Monthly bar */}
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={months.map(m => ({
          label: hebrewMonthLabel(m.ym),
          net: m.net,
          isFuture: m.ym > todayYM,
        }))}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
            tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`} width={48} />
          <Tooltip
            formatter={(v) => [ils(typeof v === "number" ? v : Number(v) || 0), "נטו"]}
            contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #f1f5f9", direction: "rtl" }}
            cursor={{ fill: "#f8fafc" }}
          />
          <Bar dataKey="net" radius={[5, 5, 0, 0]} maxBarSize={26}>
            {months.map((m, i) => (
              <Cell key={i} fill={m.net < 0 ? "#ef4444" : m.ym > todayYM ? "#cbd5e1" : "#3b82f6"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500" />חודש שעבר</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-slate-300" />עתיד</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500" />גירעון</span>
      </div>
    </div>
  );
}

// Local helper kept private to AnnualOverview.
function sum(txs: PersonalTx[], yyyymm: string, type: TxType): number {
  // We import the public helper indirectly via the lib above; this thin
  // wrapper exists only to keep AnnualOverview self-contained.
  // (Intentionally re-implemented to avoid circular imports.)
  let total = 0;
  for (const t of txs) {
    if (t.type !== type) continue;
    const start = new Date(t.start_date + "T00:00:00");
    const [y, m] = yyyymm.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0);
    const end = t.end_date ? new Date(t.end_date + "T00:00:00") : null;
    if (t.recurrence === "one_time") {
      if (start >= first && start <= last) total += Number(t.amount) || 0;
    } else if (t.recurrence === "monthly") {
      if (start <= last && (!end || end >= first)) total += Number(t.amount) || 0;
    } else {
      if (start.getMonth() === first.getMonth()
        && start.getFullYear() <= first.getFullYear()
        && (!end || end.getFullYear() >= first.getFullYear())) total += Number(t.amount) || 0;
    }
  }
  return total;
}
