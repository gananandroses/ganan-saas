"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { toast, confirmDialog } from "@/components/Toaster";
import OnboardingFlow from "@/components/OnboardingFlow";
import { SkeletonKpi, SkeletonList, SkeletonChart } from "@/components/Skeleton";
import { supabase } from "@/lib/supabase/client";
import {
  TrendingUp,
  Users,
  Briefcase,
  AlertCircle,
  UserPlus,
  CalendarPlus,
  MessageSquare,
  FileText,
  Clock,
  Leaf,
  ChevronUp,
  ChevronDown,
  X,
  ChevronRight,
  Phone,
  CheckCircle2,
  Square,
  CheckSquare,
  Plus,
  Trash2,
  ClipboardList,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function hebrewDate() {
  const now = new Date();
  return now.toLocaleDateString("he-IL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "ממתין", color: "bg-yellow-100 text-yellow-700" },
  in_progress: { label: "בביצוע", color: "bg-blue-100 text-blue-700" },
  completed: { label: "הושלם", color: "bg-green-100 text-green-700" },
  cancelled: { label: "בוטל", color: "bg-red-100 text-red-700" },
};

// ───────────────────────────────────────────────
// KPI Card
// ───────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  trend: string;
  trendColor: string;
  trendIcon?: React.ReactNode;
  sub: string;
  onClick?: () => void;
}

function KpiCard({ icon, iconBg, label, value, trend, trendColor, trendIcon, sub, onClick }: KpiCardProps) {
  // Tighter on mobile so 2x2 grid feels designed, not cramped. Sub line
  // hidden on small screens — the label + value tell the story; the
  // explanatory caption is desktop polish.
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all p-4 sm:p-5 flex flex-col gap-2 sm:gap-3 ${onClick ? "cursor-pointer active:scale-[0.98]" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-[10px] sm:text-xs font-semibold ${trendColor}`}>
            {trendIcon}
            <span className="truncate">{trend}</span>
          </span>
        )}
      </div>
      <div>
        <p className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight tabular-nums">{value}</p>
        <p className="text-[11px] sm:text-sm text-gray-500 mt-0.5 truncate">{label}</p>
      </div>
      <p className="hidden sm:block text-xs text-gray-400 border-t border-gray-50 pt-2">{sub}</p>
    </div>
  );
}

// ── Debtors KPI card: compact list instead of one giant number ──
interface DebtorsCardProps {
  items: { name: string; balance: number }[];
  total: number;
  onClick: () => void;
}

function DebtorsCard({ items, total, onClick }: DebtorsCardProps) {
  const hasDebtors = items.length > 0;
  // On mobile we show 2 names to keep the 2x2 grid balanced. Desktop keeps
  // the original 3 since there's more vertical room next to the KPIs.

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 hover:border-orange-200 hover:shadow-sm transition-all p-4 sm:p-5 flex flex-col gap-2 sm:gap-3 cursor-pointer active:scale-[0.98]"
    >
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-orange-50">
          <AlertCircle size={18} className="text-orange-500" />
        </div>
        {hasDebtors && (
          <span className="text-[10px] sm:text-xs font-bold text-orange-500 tabular-nums">
            ₪{total.toLocaleString("he-IL")}
          </span>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight tabular-nums">
          {hasDebtors ? items.length : 0}
        </p>
        <p className="text-[11px] sm:text-sm text-gray-500 mt-0.5 truncate">
          {hasDebtors ? "יתרות פתוחות" : "אין חובות פתוחים"}
        </p>
      </div>

      {hasDebtors && (
        // Show up to 3 names so a "+1" rollup doesn't hide a customer the
        // gardener just finished today and is looking for. Truncates on
        // mobile via the parent card's clipping; explicit on sm+ via
        // truncate utility — better than dropping names silently.
        <p className="hidden sm:block text-xs text-gray-400 border-t border-gray-50 pt-2 truncate">
          {items.slice(0, 3).map(i => i.name).join(" · ")}{items.length > 3 ? ` · +${items.length - 3}` : ""}
        </p>
      )}
      {!hasDebtors && (
        <p className="hidden sm:block text-xs text-emerald-600 border-t border-gray-50 pt-2">🎉 הכל שולם</p>
      )}
    </div>
  );
}

// ── Detail Modal ──────────────────────────────────────────────

type ModalType = "income" | "customers" | "jobs" | "balance" | null;

function DetailModal({ type, data, onClose }: {
  type: ModalType;
  data: Record<string, unknown>;
  onClose: () => void;
}) {
  if (!type) return null;

  const titles: Record<string, string> = {
    income: "הכנסות החודש",
    customers: "לקוחות פעילים",
    jobs: "עבודות מתוכננות",
    balance: "יתרות פתוחות",
  };

  const transactions = (data.transactions as Record<string,unknown>[]) || [];
  const customers = (data.customers as Record<string,unknown>[]) || [];
  const jobs = (data.jobs as Record<string,unknown>[]) || [];
  const openBalanceItems = (data.openBalanceItems as { name: string; phone: string; balance: number }[]) || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-base font-bold text-gray-900">{titles[type]}</h3>
          <button onClick={onClose} aria-label="סגור" className="hit-44 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">

          {/* הכנסות */}
          {type === "income" && (
            transactions.length === 0
              ? <p className="text-center text-gray-400 py-10">אין הכנסות החודש</p>
              : transactions.map((t, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{(t.description as string) || "הכנסה"}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {(t.transaction_date as string)?.slice(5).replace("-", "/")}
                      {t.customer_name ? ` · ${t.customer_name}` : ""}
                    </p>
                  </div>
                  <span className="text-green-600 font-bold text-sm">+₪{((t.amount as number)||0).toLocaleString()}</span>
                </div>
              ))
          )}

          {/* לקוחות פעילים */}
          {type === "customers" && (
            customers.length === 0
              ? <p className="text-center text-gray-400 py-10">אין לקוחות פעילים</p>
              : customers.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{c.name as string}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === "vip" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                        {c.status === "vip" ? "VIP" : "פעיל"}
                      </span>
                      {!!c.phone && (
                        <a href={`tel:${String(c.phone)}`} className="text-xs text-gray-400 flex items-center gap-1">
                          <Phone size={10} /> {String(c.phone)}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="text-left">
                    {(c.monthly_price as number) > 0 && (
                      <p className="text-sm font-bold text-gray-800">₪{(c.monthly_price as number).toLocaleString()}<span className="text-xs font-normal text-gray-400">/חודש</span></p>
                    )}
                    {(c.balance as number) > 0 && (
                      <p className="text-xs text-orange-500 font-semibold">חוב: ₪{(c.balance as number).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              ))
          )}

          {/* עבודות מתוכננות */}
          {type === "jobs" && (
            jobs.length === 0
              ? <p className="text-center text-gray-400 py-10">אין עבודות מתוכננות</p>
              : jobs.map((j, i) => {
                const today = new Date().toISOString().split("T")[0];
                const jobDate = (j.job_date ?? j.date ?? "") as string;
                const isToday = jobDate === today;
                const st = statusLabels[(j.status as string)] ?? { label: j.status as string, color: "bg-gray-100 text-gray-600" };
                return (
                  <div key={i} className={`p-3 rounded-xl border ${isToday ? "border-green-200 bg-green-50/40" : "border-gray-100 bg-gray-50"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">{(j.customer_name ?? j.customerName) as string}</p>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <Clock size={10} />
                          {isToday ? "היום" : jobDate.slice(5).replace("-", "/")} · {(j.job_time ?? j.time ?? "") as string}
                          {j.type ? ` · ${j.type}` : ""}
                        </p>
                        {!!j.notes && <p className="text-xs text-gray-400 mt-0.5">{String(j.notes)}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-bold text-green-700">₪{((j.price as number)||0).toLocaleString()}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                      </div>
                    </div>
                  </div>
                );
              })
          )}

          {/* יתרות פתוחות */}
          {type === "balance" && (
            openBalanceItems.length === 0
              ? <p className="text-center text-gray-400 py-10 text-sm">🎉 הכל שולם! אין יתרות פתוחות</p>
              : openBalanceItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-orange-50 border border-orange-100">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                      {!!item.phone && (
                        <a href={`https://wa.me/972${item.phone.replace(/^0/, "")}`}
                          target="_blank" rel="noreferrer"
                          className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                          💬 שלח תזכורת בוואטסאפ
                        </a>
                      )}
                    </div>
                    <span className="text-orange-600 font-bold text-base">₪{item.balance.toLocaleString("he-IL")}</span>
                  </div>
                ))
          )}
        </div>

        {/* Summary footer */}
        {type === "income" && transactions.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0 flex justify-between items-center">
            <span className="text-sm text-gray-500">{transactions.length} עסקאות</span>
            <span className="text-base font-bold text-green-600">
              סה"כ ₪{transactions.reduce((s, t) => s + ((t.amount as number)||0), 0).toLocaleString()}
            </span>
          </div>
        )}
        {type === "balance" && openBalanceItems.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0 flex justify-between items-center">
            <span className="text-sm text-gray-500">{openBalanceItems.length} לקוחות</span>
            <span className="text-base font-bold text-orange-600">
              סה"כ ₪{openBalanceItems.reduce((s, c) => s + c.balance, 0).toLocaleString("he-IL")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────
// Custom Tooltip for BarChart
// ───────────────────────────────────────────────

function CustomBarTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-sm" dir="rtl">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: i === 0 ? "#16a34a" : "#f97316" }}>
          {i === 0 ? "הכנסות" : "הוצאות"}: ₪{p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// ───────────────────────────────────────────────
// Main Dashboard Page
// ───────────────────────────────────────────────

// ── City coords for weather ──────────────────────────────────────────────────
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  "תל אביב": { lat: 32.07, lon: 34.79 },
  "רעננה": { lat: 32.18, lon: 34.87 },
  "הרצליה": { lat: 32.16, lon: 34.84 },
  "כפר סבא": { lat: 32.18, lon: 34.91 },
  "פתח תקווה": { lat: 32.09, lon: 34.89 },
  "נתניה": { lat: 32.33, lon: 34.86 },
  "רמת גן": { lat: 32.08, lon: 34.82 },
  "ירושלים": { lat: 31.77, lon: 35.21 },
  "חיפה": { lat: 32.79, lon: 34.99 },
  "באר שבע": { lat: 31.25, lon: 34.79 },
  "אשדוד": { lat: 31.81, lon: 34.65 },
  "ראשון לציון": { lat: 31.97, lon: 34.80 },
  "חולון": { lat: 32.01, lon: 34.78 },
  "הוד השרון": { lat: 32.15, lon: 34.89 },
  "מודיעין": { lat: 31.89, lon: 35.01 },
  "גבעתיים": { lat: 32.07, lon: 34.81 },
};

function getWeatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "⛅";
  if (code <= 9) return "🌤️";
  if (code <= 49) return "🌧️";
  if (code <= 69) return "🌧️";
  return "⛈️";
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({ monthlyIncome: 0, monthlyIncomeMomPct: 0 as number | null, activeCustomers: 0, openBalance: 0, todayJobs: 0, debtorsSub: "טוען..." });
  const [recentJobs, setRecentJobs] = useState<Record<string, unknown>[]>([]);
  const [chartData, setChartData] = useState<{month: string; income: number; expense: number}[]>([]);
  const [chartTotals, setChartTotals] = useState({ totalIncome: 0, totalExpense: 0, netProfit: 0 });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalType>(null);
  const [modalData, setModalData] = useState<Record<string, unknown>>({});
  const [userName, setUserName] = useState("");
  const [weather, setWeather] = useState<{ temp: number; humidity: number; icon: string; city: string } | null>(null);
  const [miniStats, setMiniStats] = useState({ activeEmployees: 0, activeProjects: 0 });
  const [pushStatus, setPushStatus] = useState<"idle"|"loading"|"enabled"|"denied">("idle");
  const [refreshTick, setRefreshTick] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  // Today snapshot — answers "מה אצלי היום?" in 3 seconds.
  // todayDone counts completed work (so we can show progress, not just todo).
  const [todaySnap, setTodaySnap] = useState({
    total: 0,
    done: 0,
    expectedRevenue: 0,
    nextJobLabel: "" as string,
  });

  // Daily verification checklist. Items are personal (stored in
  // user_profile.checklist_items, synced across devices). The "checked
  // today" state lives in localStorage keyed by date so it resets
  // every morning automatically. This is a *verification* — leaving
  // an item unchecked is fine, no consequences elsewhere.
  // once=true → a one-time task (removed once ticked). Absent/false → a
  // recurring task that resets every morning (the classic daily checklist).
  type ChecklistItem = { id: string; label: string; once?: boolean };
  // Hard caps so a runaway loop / paste-in mistake can't bloat the JSONB
  // row in user_profile or the localStorage entry.
  const MAX_CHECKLIST_ITEMS = 30;
  const MAX_LABEL_LEN = 120;
  // Empty by default — the gardener builds their own list and chooses per
  // task whether it's recurring or one-time.
  const DEFAULT_CHECKLIST: ChecklistItem[] = [];
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);
  const [checkedToday, setCheckedToday] = useState<Set<string>>(new Set());
  const [newChecklistLabel, setNewChecklistLabel] = useState("");
  // false = recurring (resets daily) · true = one-time (removed once done)
  const [newChecklistOnce, setNewChecklistOnce] = useState(false);
  const [showAddChecklistInput, setShowAddChecklistInput] = useState(false);
  // Collapsed by default so the dashboard isn't dominated by the
  // checklist. Persisted in localStorage so the gardener doesn't have to
  // re-collapse every visit.
  const [checklistCollapsed, setChecklistCollapsed] = useState(true);
  const todayISO = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") setPushStatus("enabled");
    else if (Notification.permission === "denied") setPushStatus("denied");
  }, []);

  async function enablePush() {
    setPushStatus("loading");
    try {
      if (!("Notification" in window)) {
        toast.success("הדפדפן לא תומך בהתראות — תזכורות ישלחו במייל אוטומטית");
        setPushStatus("idle"); return;
      }
      const p = await Notification.requestPermission();
      if (p !== "granted") { setPushStatus("denied"); return; }
      if (!("PushManager" in window) || !("serviceWorker" in navigator)) {
        toast.success("ההרשמה נרשמה! תזכורות ישלחו במייל.");
        setPushStatus("enabled"); return;
      }
      const reg = await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const pad = "=".repeat((4 - key.length % 4) % 4);
      const appKey = Uint8Array.from([...atob((key + pad).replace(/-/g,"+").replace(/_/g,"/"))].map(c => c.charCodeAt(0)));
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey });
      const { data: { user } } = await supabase.auth.getUser();
      await fetch("/api/push/subscribe", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ subscription: sub.toJSON(), userId: user?.id }) });
      setPushStatus("enabled");
    } catch { setPushStatus("idle"); }
  }

  // Install reminder moved to /settings (see "התקנת אפליקציה" card).

  // ─── Daily checklist load ──
  // Items list source-of-truth ladder:
  //   1. user_profile.checklist_items (Supabase) — best, syncs devices
  //   2. localStorage `checklist_items_<uid>` — survives reload pre-migration
  //   3. DEFAULT_CHECKLIST — first-time experience
  //
  // "Checked today" is per-device in localStorage, keyed by date so it
  // auto-resets each morning.
  //
  // Storage hygiene:
  //   • Each day creates a new localStorage entry. We sweep yesterday-
  //     and-older keys for this user on every load so the bag doesn't
  //     grow unbounded over the gardener's career on the app.
  //   • The items list is capped at MAX_CHECKLIST_ITEMS so a stray loop
  //     can never blow up user_profile.checklist_items.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_profile")
        .select("checklist_items")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      // Prefer the synced Supabase value when present.
      if (!error && data && Array.isArray(data.checklist_items) && data.checklist_items.length > 0) {
        setChecklistItems((data.checklist_items as ChecklistItem[]).slice(0, MAX_CHECKLIST_ITEMS));
        return;
      }
      // Fall back to localStorage so adds survive reload even before
      // the migration is run.
      try {
        const raw = localStorage.getItem(`checklist_items_${userId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setChecklistItems(parsed.slice(0, MAX_CHECKLIST_ITEMS));
          }
        }
      } catch {
        // ignore — defaults remain
      }
    })();
    // Restore today's checks from localStorage.
    try {
      const raw = localStorage.getItem(`checklist_checks_${userId}_${todayISO}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCheckedToday(new Set(parsed.map(String)));
      }
    } catch {
      // Corrupt JSON — ignore, start fresh.
    }
    // Restore collapsed/expanded preference (per-user).
    try {
      const c = localStorage.getItem(`checklist_collapsed_${userId}`);
      if (c === "0") setChecklistCollapsed(false);
      else if (c === "1") setChecklistCollapsed(true);
    } catch {
      // ignore
    }
    // Garbage-collect stale check entries from previous days. We don't
    // show history anywhere, so any key that isn't today's is dead weight.
    try {
      const prefix = `checklist_checks_${userId}_`;
      const todayKey = `${prefix}${todayISO}`;
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix) && key !== todayKey) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // private mode / quota → can't read keys, give up silently
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, todayISO]);

  // Persist checked state to localStorage on every change.
  useEffect(() => {
    if (!userId) return;
    try {
      localStorage.setItem(
        `checklist_checks_${userId}_${todayISO}`,
        JSON.stringify(Array.from(checkedToday)),
      );
    } catch {
      // Storage full / private-mode — silent.
    }
  }, [checkedToday, userId, todayISO]);

  function toggleChecklistItem(id: string) {
    const item = checklistItems.find(i => i.id === id);
    const willCheck = !checkedToday.has(id);
    // A one-time task is finished for good the moment it's ticked — remove it
    // so it doesn't linger or come back tomorrow.
    if (item?.once && willCheck) {
      deleteChecklistItem(id);
      toast.success("המשימה בוצעה ✓");
      return;
    }
    setCheckedToday(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleChecklistCollapsed() {
    setChecklistCollapsed(prev => {
      const next = !prev;
      try {
        if (userId) localStorage.setItem(`checklist_collapsed_${userId}`, next ? "1" : "0");
      } catch { /* ignore */ }
      return next;
    });
  }

  // Track whether we've already nagged about the missing migration so
  // the warning doesn't fire on every single add/delete.
  const [migrationNagged, setMigrationNagged] = useState(false);

  async function persistChecklistItems(items: typeof checklistItems) {
    setChecklistItems(items);
    if (!userId) return;
    // Local mirror first — guarantees adds survive a refresh even when
    // the gardener hasn't run the Supabase migration yet.
    try {
      localStorage.setItem(`checklist_items_${userId}`, JSON.stringify(items));
    } catch {
      // quota / private mode — silent
    }
    const { error } = await supabase
      .from("user_profile")
      .update({ checklist_items: items })
      .eq("user_id", userId);
    if (error && /checklist_items|column/i.test(error.message)) {
      // Migration not run yet — local copy already saved (see above),
      // so the gardener doesn't lose anything. Nag once per session.
      if (!migrationNagged) {
        toast.info("הצ'ק־ליסט נשמר על המכשיר", "הרץ את המיגרציה ב-Supabase כדי שיסונכרן בין מכשירים");
        setMigrationNagged(true);
      }
    }
  }

  async function addChecklistItem() {
    const label = newChecklistLabel.trim().slice(0, MAX_LABEL_LEN);
    if (!label) return;
    if (checklistItems.length >= MAX_CHECKLIST_ITEMS) {
      toast.error(`מקסימום ${MAX_CHECKLIST_ITEMS} משימות`, "מחק קודם משימה ישנה");
      return;
    }
    const next = [...checklistItems, { id: `c-${Date.now()}`, label, once: newChecklistOnce }];
    await persistChecklistItems(next);
    setNewChecklistLabel("");
    setNewChecklistOnce(false);
    setShowAddChecklistInput(false);
  }

  async function deleteChecklistItem(id: string) {
    await persistChecklistItems(checklistItems.filter(i => i.id !== id));
    setCheckedToday(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  useEffect(() => {
    async function load() {
      const thisMonth = new Date().toISOString().slice(0, 7);
      const today = new Date().toISOString().split("T")[0];

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const savedSettings = localStorage.getItem(`garden_settings_${user.id}`);
        let userCity = "תל אביב";
        if (savedSettings) {
          try {
            const parsed = JSON.parse(savedSettings);
            setUserName(parsed.ownerName || "");
            if (parsed.city) userCity = parsed.city;
          } catch {}
        }
        if (!userName) setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "");

        // Load weather
        try {
          const coords = CITY_COORDS[userCity] || CITY_COORDS["תל אביב"];
          const wRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`
          );
          if (wRes.ok) {
            const wJson = await wRes.json();
            const curr = wJson.current;
            setWeather({
              temp: Math.round(curr.temperature_2m),
              humidity: curr.relative_humidity_2m,
              icon: getWeatherEmoji(curr.weather_code),
              city: userCity,
            });
          }
        } catch {
          // weather unavailable — keep null
        }
      }
      const [custRes, txRes, jobsRes, txRes2, empRes, projRes, allJobsRes] = await Promise.all([
        supabase.from("customers").select("id, status, monthly_price, balance, name, phone").eq("user_id", user?.id),
        supabase.from("transactions").select("type, amount, status, transaction_date, description, customer_name").eq("type", "income").eq("user_id", user?.id),
        supabase.from("jobs").select("*").eq("user_id", user?.id).gte("job_date", today).order("job_date").limit(50),
        supabase.from("transactions").select("type, amount, status, transaction_date").eq("user_id", user?.id),
        supabase.from("employees").select("id, status").eq("user_id", user?.id),
        supabase.from("projects").select("id, status").eq("user_id", user?.id),
        // Today-snapshot only needs basic job fields; the bell owns the
        // "missed visits / unbooked / inactive" detection now.
        supabase.from("jobs").select("id, customer_id, customer_name, job_date, status, cancellation_reason").eq("user_id", user?.id),
      ]);

      const customers = custRes.data || [];
      const transactions = txRes.data || [];
      const jobs = jobsRes.data || [];
      const allTx = txRes2.data || [];
      const employees = empRes.data || [];
      const projects = projRes.data || [];

      // Mini stats
      const activeEmps = employees.filter((e: Record<string,unknown>) => e.status !== "offline").length;
      const activeProjs = projects.filter((p: Record<string,unknown>) => p.status === "active").length;
      setMiniStats({ activeEmployees: activeEmps, activeProjects: activeProjs });

      // Hot actions calc removed — the bell dropdown (Header.tsx) now
      // owns all "needs your attention" signals via lib/customer-alerts.
      // We still cast allJobsRes into a typed local for the today-snapshot
      // block immediately below.
      const allJobsForHot = (allJobsRes.data || []) as Array<{ id: string; customer_id: string | null; customer_name: string; job_date: string | null; status: string; cancellation_reason: string | null }>;

      // ── Today snapshot ──
      const todaysJobs = (allJobsForHot || []).filter(j => j.job_date === today);
      const todayDone = todaysJobs.filter(j => j.status === "completed").length;
      const todayActive = todaysJobs.filter(j => j.status !== "cancelled");
      // Expected revenue from active jobs today — pull price from jobs table directly.
      const todayJobsFull = (jobs as Record<string, unknown>[]).filter(j => (j.job_date as string) === today && j.status !== "cancelled");
      const expectedRevenue = todayJobsFull.reduce((s, j) => {
        const price = (j.price as number) || 0;
        const beforeVat = (j.price_before_vat as boolean) || false;
        return s + (beforeVat ? price : Math.round(price / 1.18));
      }, 0);
      // Find the next pending job today (ordered by time).
      const nextJob = todayActive
        .filter(j => j.status !== "completed")
        .sort((a, b) => ((a as Record<string, unknown>).job_time as string || "").localeCompare((b as Record<string, unknown>).job_time as string || ""))[0] as Record<string, unknown> | undefined;
      const nextJobLabel = nextJob ? `${(nextJob.job_time as string) || ""} · ${(nextJob.customer_name as string) || ""}` : "";

      // total = active + done so the "X של Y הושלמו" reflects the full day.
      setTodaySnap({ total: todayActive.length, done: todayDone, expectedRevenue, nextJobLabel });

      // Monthly income counts transactions that have actually been received.
      // We treat anything not explicitly pending/overdue as collected — this
      // includes legacy rows where status is null/missing and modern paid rows.
      const isCollected = (t: Record<string, unknown>) =>
        t.status !== "pending" && t.status !== "overdue";

      const monthlyIncome = transactions
        .filter((t: Record<string, unknown>) =>
          t.type === "income"
          && isCollected(t)
          && (t.transaction_date as string)?.startsWith(thisMonth),
        )
        .reduce((sum: number, t: Record<string, unknown>) => sum + ((t.amount as number) || 0), 0);

      // Real MoM percent change vs previous calendar month, not a hardcoded
      // "+12%". Returns null when previous month had no income (avoids
      // infinite/NaN and lets us hide the trend chip in that case).
      const prevMonthDate = new Date();
      prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
      const prevMonth = prevMonthDate.toISOString().slice(0, 7);
      const prevMonthlyIncome = transactions
        .filter((t: Record<string, unknown>) =>
          t.type === "income"
          && isCollected(t)
          && (t.transaction_date as string)?.startsWith(prevMonth),
        )
        .reduce((sum: number, t: Record<string, unknown>) => sum + ((t.amount as number) || 0), 0);
      const monthlyIncomeMomPct: number | null = prevMonthlyIncome > 0
        ? Math.round(((monthlyIncome - prevMonthlyIncome) / prevMonthlyIncome) * 100)
        : null;

      // Open-balance source of truth = pending/overdue income transactions.
      // (The legacy customers.balance field is rarely kept in sync with project/job
      // completions, which auto-create pending transactions.)
      const openIncome = transactions.filter((t: Record<string, unknown>) =>
        t.type === "income" && (t.status === "pending" || t.status === "overdue"),
      );
      const debtorsByName = new Map<string, number>();
      openIncome.forEach((t: Record<string, unknown>) => {
        const name = (t.customer_name as string) || "ללא שם";
        debtorsByName.set(name, (debtorsByName.get(name) ?? 0) + ((t.amount as number) || 0));
      });
      const debtors = Array.from(debtorsByName.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([name, amount]) => `${name} ₪${Math.round(amount).toLocaleString("he-IL")}`)
        .join(' · ');
      const openBalanceTotal = openIncome.reduce(
        (sum: number, t: Record<string, unknown>) => sum + ((t.amount as number) || 0),
        0,
      );

      setStats({
        monthlyIncome,
        monthlyIncomeMomPct,
        activeCustomers: customers.filter((c: Record<string, unknown>) => c.status === "active" || c.status === "vip").length,
        openBalance: openBalanceTotal,
        todayJobs: jobs.filter((j: Record<string, unknown>) =>
          j.job_date === today && j.status !== "completed" && j.status !== "cancelled",
        ).length,
        debtorsSub: debtors || "אין חובות פתוחים",
      });
      // Upcoming jobs widget — hide completed/cancelled so finished work
      // doesn't keep cluttering the "what's next" list.
      const upcomingJobs = jobs.filter((j: Record<string, unknown>) =>
        j.status !== "completed" && j.status !== "cancelled",
      );
      setRecentJobs(upcomingJobs.slice(0, 5));

      // Store full data for modals — same paid-income filter as the KPI,
      // so the drill-down list and the headline number stay in sync.
      const thisMonthTx = transactions.filter((t: Record<string, unknown>) =>
        t.type === "income"
        && isCollected(t)
        && (t.transaction_date as string)?.startsWith(thisMonth),
      );
      const activeCustomers = customers.filter((c: Record<string, unknown>) => c.status === "active" || c.status === "vip");

      // Build open-balance items from pending income transactions, aggregated by customer
      // (matches the openBalance KPI calculation above — single source of truth).
      const phoneByName = new Map<string, string>();
      customers.forEach((c: Record<string, unknown>) => {
        if (c.name && c.phone) phoneByName.set(c.name as string, c.phone as string);
      });
      const openBalanceItems = Array.from(debtorsByName.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, total]) => ({
          name,
          phone: phoneByName.get(name) ?? "",
          balance: Math.round(total),
        }));

      setModalData({ transactions: thisMonthTx, customers: activeCustomers, allCustomers: customers, jobs, openBalanceItems });

      // Calculate chart data from real transactions
      const computed = Array.from({length: 6}, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - 5 + i);
        const month = d.toISOString().slice(0, 7);
        const label = new Date(month + "-01").toLocaleDateString("he-IL", { month: "short" });
        // Income chart counts paid income only — pending receivables are tracked
        // separately under "open balance" so the chart reflects actual cash collected.
        const income = allTx.filter((t: Record<string,unknown>) => t.type === "income" && isCollected(t) && (t.transaction_date as string)?.startsWith(month)).reduce((s: number, t: Record<string,unknown>) => s + ((t.amount as number)||0), 0);
        const expense = allTx.filter((t: Record<string,unknown>) => t.type === "expense" && (t.transaction_date as string)?.startsWith(month)).reduce((s: number, t: Record<string,unknown>) => s + ((t.amount as number)||0), 0);
        return { month: label, income, expense };
      });
      setChartData(computed);

      // Chart totals = sum of the bars actually shown in the chart (last 6 months),
      // so the headline numbers stay consistent with the visual.
      const totalIncome = computed.reduce((s, m) => s + m.income, 0);
      const totalExpense = computed.reduce((s, m) => s + m.expense, 0);
      setChartTotals({ totalIncome, totalExpense, netProfit: totalIncome - totalExpense });

      setLoading(false);
    }
    load();
  }, [refreshTick]);

  // Refetch when the tab regains focus / becomes visible — keeps the dashboard
  // in sync after a job is completed on /schedule and the user comes back.
  useEffect(() => {
    function onFocus() { setRefreshTick(t => t + 1); }
    function onVisibility() { if (document.visibilityState === "visible") setRefreshTick(t => t + 1); }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const dayProgress = todaySnap.total > 0 ? Math.round((todaySnap.done / todaySnap.total) * 100) : 0;

  return (
    <div dir="rtl" className="min-h-screen bg-[#F7F8FA]">
      <Header title="דשבורד" subtitle="סקירה כללית של העסק" />

      {/* First-run onboarding — only shows for users with zero customers */}
      {userId && <OnboardingFlow userId={userId} ownerName={userName} />}

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-w-screen-xl mx-auto">

        {/* ── HERO — single compact bar answering "מה אצלי היום?" in
            one line. Replaces the previous 3-section card (greeting +
            today snapshot + end-of-day) which was the biggest source of
            visual crowding above the fold. Now: name · date · weather
            on the right, today summary inline, end-of-day as a small
            chip on the left. Progress bar tucked under for jobs days. */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 sm:px-5 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
              שלום {userName || "👋"}
            </h1>
            <span className="text-gray-300">·</span>
            <p className="text-xs sm:text-sm text-gray-500">{hebrewDate()}</p>
            {weather && (
              <>
                <span className="text-gray-300">·</span>
                <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-1">
                  <span className="text-base leading-none">{weather.icon}</span>
                  <span className="font-semibold">{weather.temp}°</span>
                </p>
              </>
            )}
            {!loading && todaySnap.total > 0 && (
              <>
                <span className="text-gray-300">·</span>
                <p className="text-xs sm:text-sm text-emerald-700 font-semibold">
                  {todaySnap.done}/{todaySnap.total} הושלמו
                </p>
              </>
            )}
            {!loading && todaySnap.total === 0 && (
              <>
                <span className="text-gray-300">·</span>
                <p className="text-xs sm:text-sm text-gray-500">🌱 אין עבודות היום</p>
              </>
            )}
          </div>
          {!loading && todaySnap.total > 0 && (
            <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${dayProgress}%` }}
              />
            </div>
          )}
        </div>

        {/* ── DAILY CHECKLIST — personal verification list. Items live in
              user_profile.checklist_items (synced); the "checked today"
              state lives in localStorage by date so it resets each morning.
              Collapsible to keep the dashboard footprint small — when
              collapsed it's just a single-row pill showing progress. */}
        {(() => {
          const checkedCount = checklistItems.filter(i => checkedToday.has(i.id)).length;
          const total = checklistItems.length;
          const allDone = total > 0 && checkedCount === total;
          const progressPct = total > 0 ? Math.round((checkedCount / total) * 100) : 0;
          return (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Header — always visible, doubles as the collapse toggle */}
              <button
                onClick={toggleChecklistCollapsed}
                className="w-full px-4 sm:px-5 py-3 flex items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors text-right"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    allDone ? "bg-emerald-50" : "bg-gray-50"
                  }`}>
                    {allDone
                      ? <CheckCircle2 size={14} className="text-emerald-500" />
                      : <ClipboardList size={14} className="text-gray-500" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-gray-900">צ&apos;ק־ליסט יומי</h2>
                      {total > 0 && (
                        <span className={`text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-full ${
                          allDone
                            ? "bg-emerald-50 text-emerald-700"
                            : checkedCount > 0
                            ? "bg-gray-100 text-gray-700"
                            : "bg-gray-50 text-gray-400"
                        }`}>
                          {checkedCount}/{total}
                        </span>
                      )}
                    </div>
                    {/* Tiny progress bar — gives the at-a-glance read even
                        when collapsed */}
                    {total > 0 && (
                      <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            allDone ? "bg-emerald-500" : "bg-gray-700"
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                {checklistCollapsed
                  ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
                  : <ChevronUp size={14} className="text-gray-400 flex-shrink-0" />}
              </button>

              {/* Expanded body — only renders when not collapsed */}
              {!checklistCollapsed && (
                <div className="border-t border-gray-100 px-2 sm:px-3 pt-1 pb-2">
                  {checklistItems.map(item => {
                    const isChecked = checkedToday.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className="group flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <button
                          onClick={() => toggleChecklistItem(item.id)}
                          className="flex items-center gap-2.5 flex-1 text-right"
                        >
                          {isChecked ? (
                            <CheckSquare size={16} className="text-emerald-500 flex-shrink-0" />
                          ) : (
                            <Square size={16} className="text-gray-300 flex-shrink-0" />
                          )}
                          <span className={`text-[13px] leading-tight transition-all ${
                            isChecked ? "text-gray-400 line-through" : "text-gray-800"
                          }`}>
                            {item.label}
                          </span>
                          {item.once && (
                            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                              חד־פעמי
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => deleteChecklistItem(item.id)}
                          aria-label="מחק משימה"
                          className="opacity-0 group-hover:opacity-100 hit-44 w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}

                  {checklistItems.length === 0 && !showAddChecklistInput && (
                    <button
                      onClick={() => setShowAddChecklistInput(true)}
                      className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-colors my-1"
                    >
                      + הוסף משימת checklist
                    </button>
                  )}

                  {showAddChecklistInput ? (
                    <div className="px-2 py-1.5 mt-0.5 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          autoFocus
                          value={newChecklistLabel}
                          onChange={(e) => setNewChecklistLabel(e.target.value.slice(0, MAX_LABEL_LEN))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); addChecklistItem(); }
                            if (e.key === "Escape") { setNewChecklistLabel(""); setShowAddChecklistInput(false); }
                          }}
                          maxLength={MAX_LABEL_LEN}
                          placeholder="משימה חדשה..."
                          autoComplete="off"
                          className="flex-1 bg-gray-50 border border-transparent rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:bg-white focus:border-gray-200 transition-colors"
                        />
                        <button
                          onClick={addChecklistItem}
                          disabled={!newChecklistLabel.trim()}
                          className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white text-xs font-bold transition-colors"
                        >
                          הוסף
                        </button>
                        <button
                          onClick={() => { setNewChecklistLabel(""); setNewChecklistOnce(false); setShowAddChecklistInput(false); }}
                          className="hit-44 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                          aria-label="ביטול"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      {/* Task type — recurring (resets each day) vs one-time */}
                      <div className="flex items-center gap-1.5 flex-wrap pr-1">
                        <button
                          type="button"
                          onClick={() => setNewChecklistOnce(false)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${!newChecklistOnce ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                        >
                          🔁 קבועה
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewChecklistOnce(true)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${newChecklistOnce ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                        >
                          ✓ חד־פעמית
                        </button>
                        <span className="text-[10px] text-gray-400">
                          {newChecklistOnce ? "נמחקת אוטומטית לאחר ביצוע" : "חוזרת ומתאפסת בכל יום"}
                        </span>
                      </div>
                      {checklistItems.length >= MAX_CHECKLIST_ITEMS - 3 && (
                        <p className="text-[10px] text-gray-400 tabular-nums pr-2">
                          {checklistItems.length}/{MAX_CHECKLIST_ITEMS} משימות ברשימה
                        </p>
                      )}
                    </div>
                  ) : checklistItems.length > 0 && (
                    <button
                      onClick={() => setShowAddChecklistInput(true)}
                      className="w-full mt-1 mx-2 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Plus size={11} /> הוסף משימה
                    </button>
                  )}
                </div>
              )}

              {/* End-of-day shortcut — pinned footer of the checklist
                  card. Always visible. When the day's checklist is
                  fully checked the strip lights up emerald to nudge the
                  user toward the wrap-up summary; otherwise it's quiet. */}
              <button
                onClick={() => router.push("/end-of-day")}
                className={`w-full border-t flex items-center justify-between px-4 sm:px-5 py-2.5 text-xs font-semibold transition-colors text-right group ${
                  allDone
                    ? "border-emerald-100 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    : "border-gray-100 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="flex items-center gap-2">
                  🌙 <span>{allDone ? "סכם את היום ›" : "סיכום יום — בדיקה לפני שמכבים"}</span>
                </span>
                <ChevronRight size={13} className="text-gray-400 group-hover:text-gray-700 transition-colors" />
              </button>
            </div>
          );
        })()}

        {/* Hot actions / all-clear strip removed — the bell dropdown in
            the global Header is now the single source of truth for
            "things that need your attention" (grouped by category). */}

        {/* Push notifications — moved out of the hero so it doesn't compete
            with the day snapshot. Shows only if user hasn't acted on it. */}
        {pushStatus === "idle" && (
          <button
            onClick={enablePush}
            className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-right"
          >
            <span className="text-lg flex-shrink-0">🔔</span>
            <span className="flex-1 text-xs font-semibold text-gray-700">הפעל התראות לתזכורות יומיות</span>
            <span className="text-xs text-emerald-600 font-bold">הפעל</span>
          </button>
        )}

        {/* Install reminder moved to /settings → "התקנת אפליקציה". The
            previous dashboard banner pulled too much attention to a
            once-in-a-lifetime action. */}

        {/* ── KPI Cards — 2x2 on mobile, 4-up on desktop ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {loading ? (
            <>
              <SkeletonKpi /><SkeletonKpi /><SkeletonKpi /><SkeletonKpi />
            </>
          ) : (<>
          <KpiCard
            icon={<TrendingUp size={18} className="text-green-600" />}
            iconBg="bg-green-50"
            label="הכנסה החודש"
            value={`₪${stats.monthlyIncome.toLocaleString("he-IL")}`}
            trend={stats.monthlyIncomeMomPct !== null ? `${stats.monthlyIncomeMomPct >= 0 ? "+" : ""}${stats.monthlyIncomeMomPct}%` : ""}
            trendColor={(stats.monthlyIncomeMomPct ?? 0) >= 0 ? "text-green-600" : "text-red-500"}
            trendIcon={(stats.monthlyIncomeMomPct ?? 0) >= 0 ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            sub="לחץ לפירוט העסקאות"
            onClick={() => setModal("income")}
          />
          <KpiCard
            icon={<Users size={18} className="text-blue-600" />}
            iconBg="bg-blue-50"
            label="לקוחות פעילים"
            value={String(stats.activeCustomers)}
            trend=""
            trendColor="text-blue-600"
            sub="לחץ לרשימת הלקוחות"
            onClick={() => setModal("customers")}
          />
          <KpiCard
            icon={<Briefcase size={18} className="text-purple-600" />}
            iconBg="bg-purple-50"
            label="עבודות מתוכננות"
            value={String(stats.todayJobs)}
            trend=""
            trendColor="text-purple-600"
            sub="היום ועבודות הבאות"
            onClick={() => setModal("jobs")}
          />
          <DebtorsCard
            items={(modalData.openBalanceItems as { name: string; balance: number }[]) ?? []}
            total={stats.openBalance}
            onClick={() => setModal("balance")}
          />
          </>)}
        </div>

        {/* Detail Modal */}
        <DetailModal
          type={modal}
          data={{
            transactions: modalData.transactions,
            customers: modal === "balance" ? modalData.allCustomers : modalData.customers,
            jobs: modalData.jobs,
            openBalanceItems: modalData.openBalanceItems,
          }}
          onClose={() => setModal(null)}
        />

        {/* ── Main Row: Chart + Today's Jobs ──
            On mobile (single column) we want "עבודות קרובות" FIRST — that's
            the gardener's morning question. On desktop the chart leads
            because it's the wider, headlining widget. We achieve this with
            `order` utilities: jobs get `order-1 lg:order-2`, chart `order-2
            lg:order-1`. */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Revenue Bar Chart */}
          <div className="order-2 lg:order-1 lg:col-span-3 bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-gray-900">הכנסות מול הוצאות</h2>
                <p className="text-xs text-gray-400 mt-0.5">6 חודשים אחרונים</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                  הכנסות
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />
                  הוצאות
                </span>
              </div>
            </div>
            {loading ? (
              <SkeletonChart height={240} />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`}
                    width={46}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="income" fill="#22c55e" radius={[5, 5, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="expense" fill="#fb923c" radius={[5, 5, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Summary row */}
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-gray-50 pt-4">
              {[
                { label: "סה״כ הכנסות", value: `₪${chartTotals.totalIncome.toLocaleString()}`, color: "text-green-600" },
                { label: "סה״כ הוצאות", value: `₪${chartTotals.totalExpense.toLocaleString()}`, color: "text-orange-500" },
                { label: "רווח נקי", value: `₪${chartTotals.netProfit.toLocaleString()}`, color: "text-blue-600" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Jobs — order-1 on mobile so "what am I doing today?" leads */}
          <div className="order-1 lg:order-2 lg:col-span-2 bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">עבודות קרובות</h2>
                <p className="text-xs text-gray-400 mt-0.5">היום ועבודות הבאות</p>
              </div>
              <span className="bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                {recentJobs.length} עבודות
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {loading && <SkeletonList rows={3} />}
              {recentJobs.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-400 text-sm">אין עבודות קרובות</div>
              )}
              {!loading && recentJobs.map((job) => {
                const j = job as Record<string, unknown>;
                const jobDate = (j.job_date ?? j.date ?? "") as string;
                const today = new Date().toISOString().split("T")[0];
                const isToday = jobDate === today;
                const st = statusLabels[(j.status as string)] ?? { label: j.status as string, color: "bg-gray-100 text-gray-600" };
                return (
                  <div
                    key={j.id as string}
                    className={`rounded-xl p-3.5 border transition-colors hover:border-green-200 ${
                      isToday ? "border-green-200 bg-green-50/40" : "border-gray-100 bg-gray-50/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {isToday && <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />}
                          <p className="text-sm font-semibold text-gray-900 truncate">{(j.customer_name ?? j.customerName) as string}</p>
                        </div>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock size={10} className="flex-shrink-0" />
                          {isToday ? "היום" : jobDate.slice(5).replace("-", "/")} · {(j.job_time ?? j.time ?? "") as string}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Leaf size={10} className="flex-shrink-0 text-green-500" />
                          {j.type as string}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className="text-sm font-bold text-green-700">₪{((j.price as number) || 0).toLocaleString()}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Bottom Row: Quick Actions — desktop only ──
            On mobile the BottomNav already covers customers/schedule/finance,
            so this block was pure visual duplication. We hide it below md
            and the gardener saves a screen of scroll. */}
        <div className="hidden md:grid md:grid-cols-3 gap-4">

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 md:col-start-3">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                <Leaf size={16} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">פעולות מהירות</h2>
                <p className="text-xs text-gray-400">קיצורי דרך שימושיים</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  icon: <UserPlus size={18} className="text-green-600" />,
                  label: "לקוח חדש",
                  bg: "bg-green-50 hover:bg-green-100 border-green-100",
                  text: "text-green-700",
                  href: "/customers",
                },
                {
                  icon: <CalendarPlus size={18} className="text-blue-600" />,
                  label: "קבע עבודה",
                  bg: "bg-blue-50 hover:bg-blue-100 border-blue-100",
                  text: "text-blue-700",
                  href: "/schedule",
                },
                {
                  icon: <MessageSquare size={18} className="text-purple-600" />,
                  label: "עובדים",
                  bg: "bg-purple-50 hover:bg-purple-100 border-purple-100",
                  text: "text-purple-700",
                  href: "/employees",
                },
                {
                  icon: <FileText size={18} className="text-orange-500" />,
                  label: "פיננסים",
                  bg: "bg-orange-50 hover:bg-orange-100 border-orange-100",
                  text: "text-orange-600",
                  href: "/finance",
                },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => router.push(action.href)}
                  className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border transition-colors ${action.bg}`}
                >
                  <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center">
                    {action.icon}
                  </div>
                  <span className={`text-xs font-semibold ${action.text}`}>{action.label}</span>
                </button>
              ))}
            </div>

            {/* Mini stat */}
            <div className="mt-5 pt-4 border-t border-gray-50 grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{miniStats.activeEmployees}</p>
                <p className="text-xs text-gray-400">עובדים פעילים</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{miniStats.activeProjects}</p>
                <p className="text-xs text-gray-400">פרויקטים שוטפים</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
