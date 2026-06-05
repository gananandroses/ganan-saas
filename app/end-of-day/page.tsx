"use client";

// /end-of-day — the daily "wind-down" review screen.
//
// Opened from the dashboard Hero (and, later, from the push notification
// that fires at sundown). The goal is one screen the gardener flips
// through at 17:00 to confirm nothing slipped: jobs marked done,
// payments expected, customers waiting on a reminder, and tomorrow's
// load. Inline actions where it makes sense — mark a forgotten job
// done, send a WhatsApp reminder — without leaving the page.
//
// All side-effects (toggle job status, send WhatsApp) reuse existing
// flows so behaviour stays consistent with /schedule and /quote.

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, CheckCircle2, AlertCircle, MessageSquare, ChevronRight,
  Calendar, Moon, ClipboardCheck, Flame, ArrowLeft, Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "@/components/Toaster";
import { completeJobAndCreateTransactions } from "@/lib/complete-job";
import { pendingMissedVisits } from "@/lib/missed-visits";

// ── Helpers ─────────────────────────────────────────────────────────────────

const HEBREW_DAYS_FULL = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const HEBREW_MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

function fmt(n: number) {
  return `₪${Math.round(n).toLocaleString("he-IL")}`;
}

function hebrewToday() {
  const d = new Date();
  return `${HEBREW_DAYS_FULL[d.getDay()]}, ${d.getDate()} ${HEBREW_MONTHS[d.getMonth()]}`;
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function daysSince(iso: string | null | undefined): number {
  if (!iso) return Infinity;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function waUrl(phone: string, msg: string): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, "");
  const intl = cleaned.startsWith("0") ? "972" + cleaned.slice(1)
             : cleaned.startsWith("972") ? cleaned
             : cleaned;
  return `https://api.whatsapp.com/send?phone=${intl}&text=${encodeURIComponent(msg)}`;
}

// Job row — narrow shape we actually use here.
type JobRow = {
  id: string;
  customer_id: string | null;
  customer_name: string;
  job_date: string;
  job_time: string | null;
  type: string | null;
  address: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled" | string;
  cancellation_reason?: string | null;
  price: number | null;
  price_before_vat: boolean | null;
  expenses: number | null;
  notes?: string | null;
};

type StaleQuote = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  title: string;
  total_with_vat: number;
  daysSent: number;
  public_token: string | null;
};

export default function EndOfDayPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState("");
  const [completedToday, setCompletedToday] = useState<JobRow[]>([]);
  const [pendingToday, setPendingToday] = useState<JobRow[]>([]);
  const [tomorrowJobs, setTomorrowJobs] = useState<JobRow[]>([]);
  const [staleQuotes, setStaleQuotes] = useState<StaleQuote[]>([]);
  const [missedCount, setMissedCount] = useState(0);
  const [debtCount, setDebtCount] = useState(0);
  const [debtTotal, setDebtTotal] = useState(0);
  // Per-row "completing" state so the spinner only shows on the row you tapped.
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Track whether the gardener has confirmed "סיימתי יום" — persisted by date.
  const [dayClosed, setDayClosed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) { setLoading(false); return; }

      const today = todayISO();
      const tomorrow = tomorrowISO();

      // Pull only what we need. Slightly verbose but keeps each card in
      // sync with the rest of the app (transactions, quotes, jobs).
      const [profileRes, jobsRes, txRes, quotesRes] = await Promise.all([
        supabase.from("user_profile").select("business_name").eq("user_id", user.id).maybeSingle(),
        supabase.from("jobs").select("id, customer_id, customer_name, job_date, job_time, type, address, status, cancellation_reason, price, price_before_vat, expenses, notes").eq("user_id", user.id),
        supabase.from("transactions").select("amount, status, transaction_date").eq("user_id", user.id).eq("type", "income").in("status", ["pending","overdue"]),
        supabase.from("quotes").select("id, customer_name, customer_phone, title, total_with_vat, status, created_at, sent_at, public_token").eq("user_id", user.id).eq("status", "sent"),
      ]);
      if (cancelled) return;

      const allJobs = (jobsRes.data ?? []) as JobRow[];
      const todaysJobs = allJobs.filter(j => j.job_date === today);

      setBusinessName(profileRes.data?.business_name ?? "");
      setCompletedToday(todaysJobs.filter(j => j.status === "completed"));
      setPendingToday(todaysJobs.filter(j => j.status !== "completed" && j.status !== "cancelled"));
      setTomorrowJobs(allJobs.filter(j => j.job_date === tomorrow && j.status !== "cancelled").sort((a, b) => (a.job_time ?? "").localeCompare(b.job_time ?? "")));

      // Stale-sent quotes — same threshold the /quote page uses.
      const STALE_DAYS = 7;
      const stale = (quotesRes.data ?? [])
        .map(q => ({
          id: q.id,
          customer_name: q.customer_name ?? "",
          customer_phone: q.customer_phone ?? null,
          title: q.title ?? "",
          total_with_vat: Number(q.total_with_vat ?? 0),
          daysSent: daysSince((q.sent_at as string) ?? (q.created_at as string)),
          public_token: q.public_token ?? null,
        }))
        .filter(q => q.daysSent >= STALE_DAYS)
        .sort((a, b) => b.daysSent - a.daysSent);
      setStaleQuotes(stale);

      // Hot signals — missed visits + stale debts. Mirrors the dashboard
      // card so the gardener gets the same picture.
      setMissedCount(pendingMissedVisits(allJobs.map(j => ({
        id: j.id, customer_id: j.customer_id, customer_name: j.customer_name,
        job_date: j.job_date, status: j.status, cancellation_reason: j.cancellation_reason ?? null,
      }))).length);

      const DEBT_DAYS = 7;
      const debts = (txRes.data ?? []).filter(t => daysSince(t.transaction_date as string) >= DEBT_DAYS);
      setDebtCount(debts.length);
      setDebtTotal(debts.reduce((s, t) => s + Number(t.amount ?? 0), 0));

      // Restore "day closed" flag.
      try {
        const dismissedAt = localStorage.getItem(`eod_closed_${user.id}_${today}`);
        if (dismissedAt) setDayClosed(true);
      } catch { /* noop */ }

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Per-row "mark done" via the shared completion flow so transactions
  // are created the same way the schedule page would create them.
  async function handleQuickComplete(job: JobRow) {
    setCompletingId(job.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) { setCompletingId(null); toast.error("לא מחובר"); return; }
    const result = await completeJobAndCreateTransactions(supabase, {
      id: job.id,
      customerId: job.customer_id,
      customerName: job.customer_name,
      type: job.type ?? "",
      address: job.address ?? "",
      date: job.job_date,
      price: Number(job.price ?? 0),
      priceBeforeVat: Boolean(job.price_before_vat),
      expenses: Number(job.expenses ?? 0),
      notes: job.notes ?? undefined,
    }, user.id);
    setCompletingId(null);
    if (!result.ok) { toast.error("שגיאה בעדכון הסטטוס"); return; }
    setCompletedToday(prev => [...prev, { ...job, status: "completed" }]);
    setPendingToday(prev => prev.filter(j => j.id !== job.id));
    if (result.createdIncomeTransaction || result.closedProject) {
      toast.success("הושלם", "נוצרה תנועת תשלום ממתינה");
    } else {
      toast.success("הושלם");
    }
  }

  function handleSendReminder(q: StaleQuote) {
    if (!q.customer_phone) { toast.error("אין טלפון ללקוח"); return; }
    const link = q.public_token
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/q/${q.public_token}`
      : null;
    const firstName = (q.customer_name || "").split(" ")[0] || q.customer_name;
    const msg = `שלום ${firstName},
עברו ${q.daysSent} ימים מאז ששלחתי לך את הצעת המחיר${q.title ? ` "${q.title}"` : ""} בסך ${fmt(q.total_with_vat)}.
רציתי לוודא שהכל ברור — אשמח לענות על כל שאלה.${link ? `\n\nצפייה בהצעה: ${link}` : ""}

תודה!${businessName ? `\n${businessName}` : ""}`;
    const url = waUrl(q.customer_phone, msg);
    if (url) {
      window.open(url, "_blank");
      toast.success("WhatsApp נפתח");
    }
  }

  async function closeDay() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;
    try {
      localStorage.setItem(`eod_closed_${user.id}_${todayISO()}`, new Date().toISOString());
    } catch { /* noop */ }
    setDayClosed(true);
    toast.success("יום נעים, אריאל 🌙", "נתראה מחר");
    // Quick UX — back to the dashboard for the morning ritual.
    setTimeout(() => router.push("/dashboard"), 900);
  }

  // ── Derived totals ──
  const completedRevenue = useMemo(() => {
    return completedToday.reduce((s, j) => {
      const price = Number(j.price ?? 0);
      const beforeVat = Boolean(j.price_before_vat);
      return s + (beforeVat ? Math.round(price * 1.18) : price);
    }, 0);
  }, [completedToday]);

  const totalHotIssues = missedCount + debtCount + staleQuotes.length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]" dir="rtl">
        <Loader2 size={28} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#F7F8FA] pb-32">
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => router.push("/dashboard")}
              aria-label="חזרה לדשבורד"
              className="hit-44 w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <ChevronRight size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                <Moon size={16} className="text-indigo-500" />
                סיכום יום
              </h1>
              <p className="text-[11px] text-gray-400 mt-0.5">{hebrewToday()}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-4 space-y-3">

        {/* ── Hero: completed today ── */}
        <section className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
            <h2 className="text-sm font-bold text-gray-900">סיימת היום</h2>
          </div>
          {completedToday.length === 0 ? (
            <p className="text-sm text-gray-500">עדיין לא סימנת עבודות כהושלמו היום.</p>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-2 mb-3">
                <p className="text-3xl sm:text-4xl font-black text-gray-900 tabular-nums">
                  {fmt(completedRevenue)}
                </p>
                <p className="text-xs text-gray-400 tabular-nums">
                  {completedToday.length} {completedToday.length === 1 ? "עבודה" : "עבודות"}
                </p>
              </div>
              <ul className="space-y-1 mt-2 border-t border-gray-100 pt-3">
                {completedToday
                  .sort((a, b) => (a.job_time ?? "").localeCompare(b.job_time ?? ""))
                  .map(j => (
                    <li key={j.id} className="flex items-center justify-between text-sm py-1.5">
                      <span className="text-gray-800 truncate">
                        <span className="text-gray-400 text-xs tabular-nums ml-2">{(j.job_time ?? "").slice(0,5)}</span>
                        {j.customer_name}
                      </span>
                      <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                    </li>
                  ))}
              </ul>
            </>
          )}
        </section>

        {/* ── Pending today — needs attention ── */}
        {pendingToday.length > 0 && (
          <section className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                <AlertCircle size={16} className="text-amber-500" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-gray-900">לא סומנו כהושלמו</h2>
                <p className="text-[11px] text-gray-400">{pendingToday.length} {pendingToday.length === 1 ? "עבודה" : "עבודות"} מהיום — סמן אם בוצעו</p>
              </div>
            </div>
            <ul className="space-y-1.5">
              {pendingToday
                .sort((a, b) => (a.job_time ?? "").localeCompare(b.job_time ?? ""))
                .map(j => (
                  <li key={j.id} className="flex items-center gap-3 py-1.5">
                    <span className="text-xs text-gray-400 tabular-nums w-12 flex-shrink-0">
                      {(j.job_time ?? "").slice(0,5)}
                    </span>
                    <span className="flex-1 text-sm text-gray-800 truncate">{j.customer_name}</span>
                    <button
                      onClick={() => handleQuickComplete(j)}
                      disabled={completingId === j.id}
                      className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                    >
                      {completingId === j.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                      סמן הושלם
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {/* ── Stale-sent quotes — quick reminder ── */}
        {staleQuotes.length > 0 && (
          <section className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center">
                <MessageSquare size={16} className="text-orange-500" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-gray-900">הצעות שמחכות לתשובה</h2>
                <p className="text-[11px] text-gray-400">נשלחו לפני 7+ ימים — תזכורת אחת יכולה לסגור עסקה</p>
              </div>
            </div>
            <ul className="space-y-2">
              {staleQuotes.slice(0, 5).map(q => (
                <li key={q.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{q.customer_name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                      <span className="tabular-nums">{q.daysSent} ימים</span> · {fmt(q.total_with_vat)}
                      {q.title ? ` · ${q.title}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSendReminder(q)}
                    disabled={!q.customer_phone}
                    className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                  >
                    <MessageSquare size={11} />
                    {q.customer_phone ? "תזכורת" : "אין טלפון"}
                  </button>
                </li>
              ))}
            </ul>
            {staleQuotes.length > 5 && (
              <p className="text-[11px] text-gray-400 mt-2 text-center">
                + עוד {staleQuotes.length - 5} הצעות ב־<button onClick={() => router.push("/quote?filter=todo")} className="underline">/quote</button>
              </p>
            )}
          </section>
        )}

        {/* ── Hot signals still open ── */}
        {/* Informational summary only. This used to deep-link into the
            retired /automations hub; those items now live across the bell,
            finance and schedule, so there's no single correct destination.
            We surface the count at wind-down without a misleading button. */}
        {totalHotIssues > 0 && (
          <div className="w-full bg-white border border-gray-100 rounded-3xl p-5 sm:p-6 flex items-center gap-3 text-right">
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <Flame size={16} className="text-red-500" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-gray-900">פעולות חמות פתוחות</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {missedCount > 0 && `${missedCount} דרושים תיאום מחדש`}
                {missedCount > 0 && (debtCount > 0 || staleQuotes.length > 0) && " · "}
                {debtCount > 0 && `${debtCount} חובות פתוחים (${fmt(debtTotal)})`}
              </p>
            </div>
          </div>
        )}

        {/* ── Plan next visits — link to the bulk-by-city planner ── */}
        <button
          onClick={() => router.push("/schedule/plan")}
          className="w-full bg-white border border-gray-100 rounded-3xl p-5 sm:p-6 flex items-center gap-3 hover:border-gray-200 hover:shadow-sm transition-all text-right"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Sparkles size={16} className="text-emerald-500" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-gray-900">תכנן את שבוע הבא</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              לקוחות שצריך לבקר אצלם — מקובצים לפי עיר
            </p>
          </div>
          <ArrowLeft size={14} className="text-gray-300 flex-shrink-0" />
        </button>

        {/* ── Tomorrow ── */}
        <section className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <Calendar size={16} className="text-blue-500" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-gray-900">מחר אצלך</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {tomorrowJobs.length === 0
                  ? "אין עבודות מתוכננות"
                  : `${tomorrowJobs.length} ${tomorrowJobs.length === 1 ? "עבודה" : "עבודות"}${tomorrowJobs[0]?.job_time ? ` · החל מ-${tomorrowJobs[0].job_time.slice(0,5)}` : ""}`}
              </p>
            </div>
            <button
              onClick={() => router.push("/schedule")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex-shrink-0"
            >
              ליומן <ChevronRight size={12} className="inline" />
            </button>
          </div>
          {tomorrowJobs.length > 0 && (
            <ul className="space-y-1 border-t border-gray-100 pt-2 mt-1">
              {tomorrowJobs.slice(0, 5).map(j => (
                <li key={j.id} className="flex items-center gap-3 text-sm py-1">
                  <span className="text-xs text-gray-400 tabular-nums w-12 flex-shrink-0">
                    {(j.job_time ?? "").slice(0,5)}
                  </span>
                  <span className="flex-1 text-gray-800 truncate">{j.customer_name}</span>
                </li>
              ))}
              {tomorrowJobs.length > 5 && (
                <li className="text-[11px] text-gray-400 mt-1">+ עוד {tomorrowJobs.length - 5}</li>
              )}
            </ul>
          )}
        </section>
      </main>

      {/* ── Sticky close-day footer ── */}
      <div className="fixed bottom-0 right-0 left-0 z-20 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.08)]">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={closeDay}
            disabled={dayClosed}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:bg-emerald-500 disabled:text-white text-white font-bold rounded-2xl py-3.5 text-sm transition-colors"
          >
            {dayClosed ? (
              <>
                <CheckCircle2 size={16} /> סיימת יום · נתראה מחר
              </>
            ) : (
              <>
                <ClipboardCheck size={16} /> סיימתי יום
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
