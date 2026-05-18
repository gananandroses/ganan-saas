"use client";

// Monthly revenue progress card. Shows the gardener:
//   • total ברוטו income recognised this month (paid transactions only)
//   • progress against TWO milestones — a "minimum" they must hit to
//     stay solvent, and a "target" they want to hit ideally
//   • how much per day they still need given the remaining work days
//
// The two thresholds (min / target) live on user_profile.monthly_goal_min
// and monthly_goal_target — both editable in /settings. If they're
// missing (pre-migration or never set), we fall back to 30k / 52.5k —
// the user's stated numbers from the requirements convo.
//
// Income source: transactions where type='income' AND status='paid'
// AND transaction_date is inside the current calendar month. We
// intentionally exclude pending/overdue — the card answers "what
// actually arrived in my account", not "what's forecast".

import { useEffect, useState } from "react";
import { TrendingUp, Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

// ── Item lists ──────────────────────────────────────────────────────────────
// Each forecast bucket (paid / debts / scheduled) keeps a list of the
// underlying rows so the card can expand into a per-item breakdown
// when the user taps that bucket.
interface LineItem {
  date: string;            // YYYY-MM-DD
  label: string;           // customer name (or fallback)
  amount: number;          // ברוטו
}

function fmtShortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)}/${Number(m)}`;
}

const DEFAULT_MIN = 30000;
const DEFAULT_TARGET = 52500;       // midpoint of the user's "50-55k" target band
const WORK_DAYS = [0, 1, 2, 3, 4];  // Sun-Thu, same convention as the auto-planner

function fmtMoney(n: number): string {
  return `₪${Math.round(n).toLocaleString("he-IL")}`;
}

function monthBounds(now: Date): { start: string; end: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 1);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start: iso(start), end: iso(end) };
}

/** Count remaining working days from `now` through the end of its month. */
function remainingWorkDays(now: Date): number {
  const y = now.getFullYear();
  const m = now.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  let count = 0;
  for (let day = now.getDate(); day <= lastDay; day++) {
    const dow = new Date(y, m, day).getDay();
    if (WORK_DAYS.includes(dow)) count++;
  }
  return count;
}

interface Props {
  /** Optional: skip the supabase fetch and use these values directly
   * (useful for tests / storybook). */
  override?: {
    revenue: number;
    min: number;
    target: number;
    debtsAmount?: number;
    debtsCount?: number;
    scheduledAmount?: number;
    scheduledCount?: number;
  };
}

export default function MonthlyGoalCard({ override }: Props) {
  const [loading, setLoading] = useState(!override);
  const [revenue, setRevenue] = useState(override?.revenue ?? 0);
  const [minGoal, setMinGoal] = useState(override?.min ?? DEFAULT_MIN);
  const [target, setTarget] = useState(override?.target ?? DEFAULT_TARGET);
  // Forecast data — separated into "what's owed but not paid" (debts)
  // and "what's coming up on the calendar but hasn't been billed yet"
  // (scheduled). Together with `revenue`, the three are disjoint so
  // we can safely add them without double-counting.
  const [debtsAmount, setDebtsAmount] = useState(override?.debtsAmount ?? 0);
  const [debtsCount, setDebtsCount] = useState(override?.debtsCount ?? 0);
  const [scheduledAmount, setScheduledAmount] = useState(override?.scheduledAmount ?? 0);
  const [scheduledCount, setScheduledCount] = useState(override?.scheduledCount ?? 0);
  // Per-bucket line items for the expand-on-click breakdown. Empty
  // when override is used.
  const [paidItems, setPaidItems] = useState<LineItem[]>([]);
  const [debtItems, setDebtItems] = useState<LineItem[]>([]);
  const [scheduledItems, setScheduledItems] = useState<LineItem[]>([]);
  // Which bucket's breakdown is currently open. Only one at a time
  // to keep the card compact on mobile.
  const [openBucket, setOpenBucket] = useState<null | "paid" | "debts" | "scheduled">(null);

  useEffect(() => {
    if (override) return;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { start, end } = monthBounds(new Date());
      // Strict-month accounting: each calendar month gets its own card.
      // May counts ONLY May (paid + owed + scheduled inside May). When
      // the user navigates into June the card will show June's numbers.
      // Mixing future months in the May figure was confusing — it made
      // the goal look reachable on revenue that won't actually land
      // in May.
      const [paidRes, openRes, jobsRes, profRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("amount, transaction_date, customer_name, description")
          .eq("user_id", user.id)
          .eq("type", "income")
          .eq("status", "paid")
          .gte("transaction_date", start)
          .lt("transaction_date", end),
        supabase
          .from("transactions")
          .select("amount, status, transaction_date, customer_name, description")
          .eq("user_id", user.id)
          .eq("type", "income")
          .in("status", ["pending", "overdue"])
          .gte("transaction_date", start)
          .lt("transaction_date", end),
        // Anything not completed / cancelled counts as "still to come"
        // for the current month. The app's TaskStatus type is
        // "pending" | "in_progress" | "completed" | "cancelled" —
        // we want the first two PLUS any legacy "scheduled" rows the
        // auto-planner produced before this fix.
        supabase
          .from("jobs")
          .select("price, price_before_vat, status, job_date, customer_name, type")
          .eq("user_id", user.id)
          .gte("job_date", start)
          .lt("job_date", end)
          .in("status", ["pending", "in_progress", "scheduled"]),
        supabase
          .from("user_profile")
          .select("monthly_goal_min, monthly_goal_target")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;

      const paidRows = paidRes.data ?? [];
      const paidTotal = paidRows.reduce((s, t) => s + (Number(t.amount) || 0), 0);
      setRevenue(paidTotal);
      setPaidItems(
        paidRows
          .map((t) => ({
            date: String(t.transaction_date ?? ""),
            label: String(t.customer_name || t.description || "ללא שם"),
            amount: Number(t.amount) || 0,
          }))
          .sort((a, b) => b.date.localeCompare(a.date)),
      );

      const openRows = openRes.data ?? [];
      setDebtsAmount(openRows.reduce((s, t) => s + (Number(t.amount) || 0), 0));
      setDebtsCount(openRows.length);
      setDebtItems(
        openRows
          .map((t) => ({
            date: String(t.transaction_date ?? ""),
            label: String(t.customer_name || t.description || "ללא שם"),
            amount: Number(t.amount) || 0,
          }))
          .sort((a, b) => b.amount - a.amount),
      );

      // Scheduled jobs — price_before_vat means the stored price excludes
      // VAT, so add 18% to compare apples-to-apples with paid revenue
      // (which is always ברוטו).
      const jobRows = jobsRes.data ?? [];
      const jobsTotal = jobRows.reduce((s, j) => {
        const raw = Number(j.price) || 0;
        return s + (j.price_before_vat ? raw * 1.18 : raw);
      }, 0);
      setScheduledAmount(jobsTotal);
      setScheduledCount(jobRows.length);
      setScheduledItems(
        jobRows
          .map((j) => {
            const raw = Number(j.price) || 0;
            const gross = j.price_before_vat ? raw * 1.18 : raw;
            return {
              date: String(j.job_date ?? ""),
              label: String(j.customer_name || j.type || "ללא שם"),
              amount: gross,
            };
          })
          .sort((a, b) => a.date.localeCompare(b.date)),
      );

      const min = Number(profRes.data?.monthly_goal_min);
      const tgt = Number(profRes.data?.monthly_goal_target);
      setMinGoal(Number.isFinite(min) && min > 0 ? min : DEFAULT_MIN);
      setTarget(Number.isFinite(tgt) && tgt > 0 ? tgt : DEFAULT_TARGET);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [override]);

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex items-center gap-3">
        <Loader2 size={16} className="animate-spin text-gray-400" />
        <p className="text-sm text-gray-400">טוען יעד חודשי…</p>
      </div>
    );
  }

  // Tier flags
  const hitMinimum = revenue >= minGoal;
  const hitTarget = revenue >= target;
  const pct = target > 0 ? Math.min(100, Math.round((revenue / target) * 100)) : 0;
  const minMarkerPct = target > 0 ? Math.min(100, Math.round((minGoal / target) * 100)) : 0;
  const remaining = Math.max(0, target - revenue);
  const workDaysLeft = remainingWorkDays(new Date());
  const perDayNeeded =
    workDaysLeft > 0 && !hitTarget
      ? Math.ceil(remaining / workDaysLeft / 50) * 50  // round to 50₪
      : 0;

  // Color for the filled portion of the progress bar.
  const fillClass = hitTarget
    ? "bg-emerald-500"
    : hitMinimum
    ? "bg-amber-500"
    : "bg-red-500";

  // Status line
  const statusLine = hitTarget
    ? "🎯 הגעת ליעד! כל הכבוד"
    : hitMinimum
    ? "✅ עברת את המינימום"
    : "⚠️ עוד לא הגעת למינימום";

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 sm:px-5 sm:py-4">
        {/* Top row — heading + percent */}
        <div className="flex items-end justify-between gap-3 mb-1">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-gray-400 leading-none mb-1.5 flex items-center gap-1.5">
              <TrendingUp size={11} /> הכנסה החודש
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 tabular-nums leading-none">
              {fmtMoney(revenue)}
            </p>
          </div>
          <div className="text-left flex-shrink-0">
            <p className="text-2xl font-extrabold tabular-nums leading-none {fillClass}" style={{ color: hitTarget ? "#059669" : hitMinimum ? "#d97706" : "#dc2626" }}>
              {pct}%
            </p>
            <p className="text-[10px] text-gray-400 mt-1">מהיעד</p>
          </div>
        </div>

        {/* Progress bar with min + target markers */}
        <div className="relative h-2.5 bg-gray-100 rounded-full overflow-visible mt-3">
          {/* Fill */}
          <div
            className={`absolute inset-y-0 right-0 ${fillClass} rounded-full transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
          {/* Minimum marker (vertical line on the bar) */}
          <div
            className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-gray-800/60"
            style={{ right: `${minMarkerPct}%` }}
            title={`מינימום ${fmtMoney(minGoal)}`}
          />
          {/* Target marker on the far left (= 100%) */}
          <div
            className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-emerald-700"
            style={{ left: "0" }}
            title={`יעד ${fmtMoney(target)}`}
          />
        </div>
        {/* Labels under the bar — aligned with markers */}
        <div className="relative h-4 mt-1 text-[10px] font-semibold text-gray-400">
          <span className="absolute right-0">₪0</span>
          <span
            className="absolute"
            style={{ right: `${minMarkerPct}%`, transform: "translateX(50%)" }}
          >
            מינ&apos; {fmtMoney(minGoal)}
          </span>
          <span className="absolute left-0">יעד {fmtMoney(target)}</span>
        </div>

        {/* Status + actionable hint */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p
            className="text-xs font-bold mb-1"
            style={{ color: hitTarget ? "#059669" : hitMinimum ? "#d97706" : "#dc2626" }}
          >
            {statusLine}
          </p>
          {!hitTarget && (
            <p className="text-[11px] text-gray-500 leading-relaxed">
              עוד {fmtMoney(remaining)} ליעד · יומי דרוש{" "}
              <span className="font-semibold text-gray-700">{fmtMoney(perDayNeeded)}</span>{" "}
              ב-{workDaysLeft} ימי עבודה שנותרו
            </p>
          )}
          {hitTarget && (
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              עברת את היעד ב-{fmtMoney(revenue - target)}. מצוין 🌱
            </p>
          )}
        </div>

        {/* Forecast section — what's coming in if everything closes
            as expected. Hidden when there's nothing forecast (no
            debts and no upcoming jobs) to keep the card compact. */}
        {(debtsAmount > 0 || scheduledAmount > 0) && (() => {
          const forecastTotal = revenue + debtsAmount + scheduledAmount;
          const forecastPct = target > 0 ? Math.min(100, Math.round((forecastTotal / target) * 100)) : 0;
          return (
            <div className="mt-3 pt-3 border-t border-gray-100 bg-emerald-50/40 -mx-4 sm:-mx-5 -mb-3 sm:-mb-4 px-4 sm:px-5 pb-3 sm:pb-4 rounded-b-2xl">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <Sparkles size={12} /> צפוי החודש: {fmtMoney(forecastTotal)}
                </p>
                <p className="text-xs font-bold text-emerald-800 tabular-nums">{forecastPct}%</p>
              </div>
              <ul className="mt-1.5 space-y-0.5 text-[11px] text-gray-600 leading-relaxed">
                <BucketRow
                  dotClass="bg-emerald-500"
                  label={`${fmtMoney(revenue)} בקופה כבר (${pct}%)`}
                  items={paidItems}
                  open={openBucket === "paid"}
                  onToggle={() => setOpenBucket(openBucket === "paid" ? null : "paid")}
                />
                {debtsAmount > 0 && (
                  <BucketRow
                    dotClass="bg-amber-400"
                    label={`${fmtMoney(debtsAmount)} חובות פתוחים (${debtsCount} ${debtsCount === 1 ? "לקוח" : "לקוחות"})`}
                    items={debtItems}
                    open={openBucket === "debts"}
                    onToggle={() => setOpenBucket(openBucket === "debts" ? null : "debts")}
                  />
                )}
                {scheduledAmount > 0 && (
                  <BucketRow
                    dotClass="bg-blue-400"
                    label={`${fmtMoney(scheduledAmount)} עבודות מתוזמנות החודש (${scheduledCount})`}
                    items={scheduledItems}
                    open={openBucket === "scheduled"}
                    onToggle={() => setOpenBucket(openBucket === "scheduled" ? null : "scheduled")}
                  />
                )}
              </ul>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── BucketRow ───────────────────────────────────────────────────────────────
// One line of the forecast breakdown. The label is wrapped in a button
// so taps expand a detail list directly below. When the bucket has no
// items (override mode in tests), the chevron is hidden and the row
// behaves as plain text.

function BucketRow(props: {
  dotClass: string;
  label: string;
  items: LineItem[];
  open: boolean;
  onToggle: () => void;
}) {
  const hasItems = props.items.length > 0;
  return (
    <li>
      <button
        type="button"
        onClick={hasItems ? props.onToggle : undefined}
        className={`w-full flex items-center gap-1.5 text-right -mx-1 px-1 py-0.5 rounded ${hasItems ? "hover:bg-emerald-100/40 cursor-pointer" : "cursor-default"}`}
      >
        <span className={`inline-block w-2 h-2 rounded-full ${props.dotClass} flex-shrink-0`} />
        <span className="flex-1">{props.label}</span>
        {hasItems && (
          props.open
            ? <ChevronUp size={11} className="text-gray-400 flex-shrink-0" />
            : <ChevronDown size={11} className="text-gray-400 flex-shrink-0" />
        )}
      </button>
      {props.open && hasItems && (
        <ul className="mt-1 mb-1 mr-3.5 bg-white border border-gray-100 rounded-lg divide-y divide-gray-50 max-h-64 overflow-y-auto">
          {props.items.map((it, idx) => (
            <li key={idx} className="px-2.5 py-1.5 flex items-center gap-2">
              <span className="text-[10px] text-gray-400 tabular-nums w-10 flex-shrink-0">{fmtShortDate(it.date)}</span>
              <span className="text-[11px] text-gray-700 flex-1 truncate">{it.label}</span>
              <span className="text-[11px] font-semibold text-gray-900 tabular-nums">{fmtMoney(it.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
