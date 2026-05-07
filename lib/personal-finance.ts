// Personal Cash Flow — categories, types, and computation utilities.
// Kept separate from business finance (which lives in the `transactions` table).

import type { LucideIcon } from "lucide-react";
import {
  Briefcase, Sparkles, Gift, PlusCircle, Home, Car, Tv,
  Zap, Shield, ShoppingCart, Utensils, Film, Stethoscope,
  ShoppingBag, Plane, GraduationCap, Package,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

export type Recurrence = "one_time" | "monthly" | "yearly";
export type TxType = "income" | "expense";

export interface PersonalTx {
  id: string;
  user_id: string;
  type: TxType;
  category: string;
  amount: number;
  description: string | null;
  recurrence: Recurrence;
  start_date: string;       // YYYY-MM-DD
  end_date: string | null;  // null = ongoing
  notes: string | null;
  created_at: string;
}

export interface CategoryDef {
  id: string;
  label: string;
  icon: LucideIcon;
  // Tailwind colour family — used to build text/bg/border classes consistently.
  color: "green" | "emerald" | "lime" | "blue" | "sky" | "indigo" | "purple"
       | "pink" | "rose" | "amber" | "orange" | "red" | "fuchsia" | "slate";
  group: "fixed" | "variable" | "income";
}

// ── Categories ───────────────────────────────────────────────────────────────
// Order matters — drives display order in pickers and breakdowns.

export const INCOME_CATEGORIES: CategoryDef[] = [
  { id: "salary",       label: "משכורת",          icon: Briefcase,  color: "green",   group: "income" },
  { id: "business",     label: "עסק (גנן)",       icon: Sparkles,   color: "emerald", group: "income" },
  { id: "side",         label: "הכנסה צדדית",     icon: PlusCircle, color: "lime",    group: "income" },
  { id: "gift",         label: "מתנה / החזר",     icon: Gift,       color: "pink",    group: "income" },
  { id: "other_income", label: "הכנסה אחרת",      icon: PlusCircle, color: "slate",   group: "income" },
];

export const EXPENSE_CATEGORIES: CategoryDef[] = [
  // Fixed
  { id: "housing",       label: "דיור",         icon: Home,         color: "blue",    group: "fixed" },
  { id: "car",           label: "רכב",          icon: Car,          color: "sky",     group: "fixed" },
  { id: "subscriptions", label: "מנויים",       icon: Tv,           color: "purple",  group: "fixed" },
  { id: "utilities",     label: "חשבונות",      icon: Zap,          color: "amber",   group: "fixed" },
  { id: "insurance",     label: "ביטוחים",      icon: Shield,       color: "indigo",  group: "fixed" },
  { id: "education",     label: "חינוך",        icon: GraduationCap, color: "fuchsia",group: "fixed" },
  // Variable
  { id: "groceries",     label: "מזון / מחייה", icon: ShoppingCart, color: "orange",  group: "variable" },
  { id: "dining",        label: "אוכל בחוץ",    icon: Utensils,     color: "rose",    group: "variable" },
  { id: "entertainment", label: "בילויים",      icon: Film,         color: "pink",    group: "variable" },
  { id: "healthcare",    label: "בריאות",       icon: Stethoscope,  color: "red",     group: "variable" },
  { id: "shopping",      label: "קניות",        icon: ShoppingBag,  color: "fuchsia", group: "variable" },
  { id: "travel",        label: "חופשות / טיולים", icon: Plane,     color: "sky",     group: "variable" },
  { id: "other_expense", label: "אחר",          icon: Package,      color: "slate",   group: "variable" },
];

export const ALL_CATEGORIES: CategoryDef[] = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

const CATEGORY_BY_ID = new Map(ALL_CATEGORIES.map(c => [c.id, c]));

export function getCategory(id: string): CategoryDef | undefined {
  return CATEGORY_BY_ID.get(id);
}

export function categoryClasses(c: CategoryDef) {
  // Returns a stable set of Tailwind classes per colour family.
  const map: Record<CategoryDef["color"], { bg: string; text: string; ring: string; dot: string; soft: string }> = {
    green:   { bg: "bg-green-100",   text: "text-green-700",   ring: "ring-green-200",   dot: "bg-green-500",   soft: "bg-green-50" },
    emerald: { bg: "bg-emerald-100", text: "text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-500", soft: "bg-emerald-50" },
    lime:    { bg: "bg-lime-100",    text: "text-lime-700",    ring: "ring-lime-200",    dot: "bg-lime-500",    soft: "bg-lime-50" },
    blue:    { bg: "bg-blue-100",    text: "text-blue-700",    ring: "ring-blue-200",    dot: "bg-blue-500",    soft: "bg-blue-50" },
    sky:     { bg: "bg-sky-100",     text: "text-sky-700",     ring: "ring-sky-200",     dot: "bg-sky-500",     soft: "bg-sky-50" },
    indigo:  { bg: "bg-indigo-100",  text: "text-indigo-700",  ring: "ring-indigo-200",  dot: "bg-indigo-500",  soft: "bg-indigo-50" },
    purple:  { bg: "bg-purple-100",  text: "text-purple-700",  ring: "ring-purple-200",  dot: "bg-purple-500",  soft: "bg-purple-50" },
    pink:    { bg: "bg-pink-100",    text: "text-pink-700",    ring: "ring-pink-200",    dot: "bg-pink-500",    soft: "bg-pink-50" },
    rose:    { bg: "bg-rose-100",    text: "text-rose-700",    ring: "ring-rose-200",    dot: "bg-rose-500",    soft: "bg-rose-50" },
    amber:   { bg: "bg-amber-100",   text: "text-amber-700",   ring: "ring-amber-200",   dot: "bg-amber-500",   soft: "bg-amber-50" },
    orange:  { bg: "bg-orange-100",  text: "text-orange-700",  ring: "ring-orange-200",  dot: "bg-orange-500",  soft: "bg-orange-50" },
    red:     { bg: "bg-red-100",     text: "text-red-700",     ring: "ring-red-200",     dot: "bg-red-500",     soft: "bg-red-50" },
    fuchsia: { bg: "bg-fuchsia-100", text: "text-fuchsia-700", ring: "ring-fuchsia-200", dot: "bg-fuchsia-500", soft: "bg-fuchsia-50" },
    slate:   { bg: "bg-slate-100",   text: "text-slate-700",   ring: "ring-slate-200",   dot: "bg-slate-500",   soft: "bg-slate-50" },
  };
  return map[c.color];
}

// Recharts wants concrete hex colours, not Tailwind classes.
export function categoryHex(c: CategoryDef): string {
  const map: Record<CategoryDef["color"], string> = {
    green: "#22c55e", emerald: "#10b981", lime: "#84cc16",
    blue: "#3b82f6", sky: "#0ea5e9", indigo: "#6366f1",
    purple: "#a855f7", pink: "#ec4899", rose: "#f43f5e",
    amber: "#f59e0b", orange: "#f97316", red: "#ef4444",
    fuchsia: "#d946ef", slate: "#64748b",
  };
  return map[c.color];
}

// ── Date helpers ─────────────────────────────────────────────────────────────

export function isoMonth(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function monthBounds(yyyymm: string): { first: Date; last: Date } {
  const [y, m] = yyyymm.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  return { first, last };
}

function parseDate(s: string): Date {
  return new Date(s + "T00:00:00");
}

// ── Occurrence logic ─────────────────────────────────────────────────────────
// Does a recurring/one-time tx contribute to the given month?

export function txAppliesToMonth(tx: PersonalTx, yyyymm: string): boolean {
  const { first, last } = monthBounds(yyyymm);
  const start = parseDate(tx.start_date);
  const end = tx.end_date ? parseDate(tx.end_date) : null;

  if (tx.recurrence === "one_time") {
    return start >= first && start <= last;
  }

  if (tx.recurrence === "monthly") {
    if (start > last) return false;
    if (end && end < first) return false;
    return true;
  }

  // yearly — anniversary month must match
  const txMonth = start.getMonth();
  if (txMonth !== first.getMonth()) return false;
  if (start.getFullYear() > first.getFullYear()) return false;
  if (end && end.getFullYear() < first.getFullYear()) return false;
  return true;
}

// Sum of all txs of a given type that apply to the month, optionally filtered by category.
export function sumForMonth(
  txs: PersonalTx[],
  yyyymm: string,
  type: TxType,
  categoryId?: string,
): number {
  let total = 0;
  for (const t of txs) {
    if (t.type !== type) continue;
    if (categoryId && t.category !== categoryId) continue;
    if (txAppliesToMonth(t, yyyymm)) total += Number(t.amount) || 0;
  }
  return total;
}

// Group monthly totals by category for the breakdown chart/table.
export function breakdownByCategory(
  txs: PersonalTx[],
  yyyymm: string,
  type: TxType,
): { categoryId: string; total: number }[] {
  const buckets = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== type) continue;
    if (!txAppliesToMonth(t, yyyymm)) continue;
    buckets.set(t.category, (buckets.get(t.category) ?? 0) + (Number(t.amount) || 0));
  }
  return Array.from(buckets.entries())
    .map(([categoryId, total]) => ({ categoryId, total }))
    .sort((a, b) => b.total - a.total);
}

// Last N months of (income, expense) — newest last (chart-friendly order).
export function monthlySeries(
  txs: PersonalTx[],
  monthsBack: number,
  reference: Date = new Date(),
): { month: string; income: number; expense: number; net: number }[] {
  const out: { month: string; income: number; expense: number; net: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(reference.getFullYear(), reference.getMonth() - i, 1);
    const ym = isoMonth(d);
    const income = sumForMonth(txs, ym, "income");
    const expense = sumForMonth(txs, ym, "expense");
    out.push({ month: ym, income, expense, net: income - expense });
  }
  return out;
}

// Hebrew short month label for chart axes.
const HEBREW_MONTHS_SHORT = [
  "ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני",
  "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳",
];

export function hebrewMonthLabel(yyyymm: string): string {
  const [, m] = yyyymm.split("-").map(Number);
  return HEBREW_MONTHS_SHORT[m - 1] ?? yyyymm;
}

// ── Headline metrics ─────────────────────────────────────────────────────────

export interface CashFlowMetrics {
  netThisMonth: number;
  burnRate: number;          // avg monthly expense (last 6 full months)
  savingsRate: number;       // 0..1 — fraction of income saved this month
  annualForecast: number;    // projected annual net (savings) on current pace
  fixedMonthly: number;      // sum of monthly + (yearly/12) recurring expenses
  variableThisMonth: number; // one_time expenses dated this month
  monthOverMonth: number;    // % change in net vs previous month
}

export function computeMetrics(
  txs: PersonalTx[],
  yyyymm: string,
): CashFlowMetrics {
  const incomeNow = sumForMonth(txs, yyyymm, "income");
  const expenseNow = sumForMonth(txs, yyyymm, "expense");
  const netThisMonth = incomeNow - expenseNow;

  // Burn rate: avg monthly expense over the last 6 full months (excludes current).
  const ref = new Date(yyyymm + "-01T00:00:00");
  let burnSum = 0;
  let burnCount = 0;
  for (let i = 1; i <= 6; i++) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    burnSum += sumForMonth(txs, isoMonth(d), "expense");
    burnCount += 1;
  }
  const burnRate = burnCount > 0 ? burnSum / burnCount : 0;

  // Fixed = recurring expenses (monthly + yearly amortised) — uses TODAY as the
  // reference because "what are my fixed costs right now" is a present-tense
  // question, not "in the selected past month".
  const today = isoMonth(new Date());
  let fixedMonthly = 0;
  for (const t of txs) {
    if (t.type !== "expense") continue;
    if (t.recurrence === "one_time") continue;
    if (!txAppliesToMonth(t, today)) continue;
    fixedMonthly += t.recurrence === "yearly"
      ? (Number(t.amount) || 0) / 12
      : (Number(t.amount) || 0);
  }
  const variableThisMonth = expenseNow - sumRecurringForMonth(txs, yyyymm, "expense");

  // Savings rate: clamp to [0, 1]. Negative means burning savings, render as 0.
  const savingsRate = incomeNow > 0 ? Math.max(0, netThisMonth / incomeNow) : 0;

  // Annual forecast: project current monthly net forward. Use a 6-month average
  // net to dampen one-off months.
  const series = monthlySeries(txs, 6, ref);
  const avgNet = series.length > 0 ? series.reduce((s, m) => s + m.net, 0) / series.length : netThisMonth;
  const annualForecast = avgNet * 12;

  // Month-over-month delta — used for the small trend chip on the KPI.
  const prev = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  const prevNet = sumForMonth(txs, isoMonth(prev), "income") - sumForMonth(txs, isoMonth(prev), "expense");
  const monthOverMonth = prevNet === 0 ? 0 : ((netThisMonth - prevNet) / Math.abs(prevNet));

  return {
    netThisMonth, burnRate, savingsRate, annualForecast,
    fixedMonthly, variableThisMonth, monthOverMonth,
  };
}

function sumRecurringForMonth(txs: PersonalTx[], yyyymm: string, type: TxType): number {
  let total = 0;
  for (const t of txs) {
    if (t.type !== type) continue;
    if (t.recurrence === "one_time") continue;
    if (!txAppliesToMonth(t, yyyymm)) continue;
    total += Number(t.amount) || 0;
  }
  return total;
}

// ── Business income bridge ───────────────────────────────────────────────────
// Pulls collected business income from the existing `transactions` table so it
// shows up automatically as a "business" income line in the personal cash flow.
// We DO NOT copy these rows — we synthesise virtual PersonalTx objects so the
// owner of the business income remains the business module.

export interface RawBusinessTxRow {
  id?: string;
  amount: number | string | null;
  status?: string | null;
  type?: string | null;
  transaction_date?: string | null;
  vat_amount?: number | string | null;
}

export function businessIncomeAsPersonalTxs(
  rows: RawBusinessTxRow[],
  userId: string,
): PersonalTx[] {
  // Group collected income by month → one synthetic monthly entry per month.
  // (We don't want every job to appear as its own line — that would be noise.)
  const byMonth = new Map<string, number>();
  for (const r of rows) {
    if (r.type !== "income") continue;
    if (r.status === "pending" || r.status === "overdue") continue;
    if (!r.transaction_date) continue;
    const ym = r.transaction_date.slice(0, 7);
    // Net of VAT: VAT is not really "yours" — it's collected on behalf of the state.
    const gross = Number(r.amount) || 0;
    const vat = Number(r.vat_amount) || 0;
    const net = Math.max(0, gross - vat);
    byMonth.set(ym, (byMonth.get(ym) ?? 0) + net);
  }
  const out: PersonalTx[] = [];
  for (const [ym, total] of byMonth.entries()) {
    out.push({
      id: `__business_${ym}`,
      user_id: userId,
      type: "income",
      category: "business",
      amount: Math.round(total),
      description: "רווח נטו מהעסק (לאחר מע״מ)",
      recurrence: "one_time",
      start_date: `${ym}-01`,
      end_date: null,
      notes: null,
      created_at: new Date().toISOString(),
    });
  }
  return out;
}

export function isVirtualTx(t: PersonalTx): boolean {
  return t.id.startsWith("__business_");
}

// ── Misc formatters ──────────────────────────────────────────────────────────

export function ils(n: number): string {
  return `₪${Math.round(n).toLocaleString("he-IL")}`;
}

export function pct(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export function recurrenceLabel(r: Recurrence): string {
  return r === "monthly" ? "חודשי" : r === "yearly" ? "שנתי" : "חד״פ";
}
