"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase/client";
import {
  TrendingUp,
  Users,
  Briefcase,
  AlertCircle,
  Sun,
  UserPlus,
  CalendarPlus,
  MessageSquare,
  FileText,
  Clock,
  Leaf,
  ChevronUp,
  Loader2,
  X,
  ChevronRight,
  Phone,
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
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-3 border border-gray-100 hover:shadow-md transition-all ${onClick ? "cursor-pointer hover:border-green-200 active:scale-[0.98]" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`flex items-center gap-1 text-xs font-semibold ${trendColor}`}>
            {trendIcon}
            {trend}
          </span>
          {onClick && <ChevronRight size={14} className="text-gray-300" />}
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      </div>
      <p className="text-xs text-gray-400 border-t border-gray-50 pt-2">{sub}</p>
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

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-base font-bold text-gray-900">{titles[type]}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
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
            customers.filter(c => (c.balance as number) > 0).length === 0
              ? <p className="text-center text-gray-400 py-10 text-sm">🎉 הכל שולם! אין יתרות פתוחות</p>
              : customers.filter(c => (c.balance as number) > 0)
                  .sort((a, b) => (b.balance as number) - (a.balance as number))
                  .map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-orange-50 border border-orange-100">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{c.name as string}</p>
                        {!!c.phone && (
                          <a href={`https://wa.me/972${String(c.phone).replace(/^0/, "")}`}
                            target="_blank" rel="noreferrer"
                            className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                            💬 שלח תזכורת בוואטסאפ
                          </a>
                        )}
                      </div>
                      <span className="text-orange-600 font-bold text-base">₪{(c.balance as number).toLocaleString()}</span>
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
        {type === "balance" && customers.filter(c => (c.balance as number) > 0).length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0 flex justify-between items-center">
            <span className="text-sm text-gray-500">{customers.filter(c => (c.balance as number) > 0).length} לקוחות</span>
            <span className="text-base font-bold text-orange-600">
              סה"כ ₪{customers.filter(c => (c.balance as number) > 0).reduce((s, c) => s + ((c.balance as number)||0), 0).toLocaleString()}
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
  const [stats, setStats] = useState({ monthlyIncome: 0, activeCustomers: 0, openBalance: 0, todayJobs: 0, debtorsSub: "טוען..." });
  const [recentJobs, setRecentJobs] = useState<Record<string, unknown>[]>([]);
  const [chartData, setChartData] = useState<{month: string; income: number; expense: number}[]>([]);
  const [chartTotals, setChartTotals] = useState({ totalIncome: 0, totalExpense: 0, netProfit: 0 });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalType>(null);
  const [modalData, setModalData] = useState<Record<string, unknown>>({});
  const [userName, setUserName] = useState("");
  const [weather, setWeather] = useState<{ temp: number; humidity: number; icon: string; city: string } | null>(null);
  const [miniStats, setMiniStats] = useState({ activeEmployees: 0, activeProjects: 0 });
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [pushStatus, setPushStatus] = useState<"idle"|"loading"|"enabled"|"denied"|"unsupported">("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (!("Notification" in window) || !("PushManager" in window) || !("serviceWorker" in navigator)) {
      setPushStatus("unsupported"); return;
    }
    if (Notification.permission === "granted") setPushStatus("enabled");
    else if (Notification.permission === "denied") setPushStatus("denied");
    else setPushStatus("idle");
  }, []);

  async function enablePush() {
    setPushStatus("loading");
    try {
      const p = await Notification.requestPermission();
      if (p !== "granted") { setPushStatus("denied"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      });
      const { data: { user } } = await supabase.auth.getUser();
      await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON(), userId: user?.id }) });
      setPushStatus("enabled");
    } catch { setPushStatus("idle"); }
  }

  // Show install banner once per device
  useEffect(() => {
    const dismissed = localStorage.getItem("install_banner_dismissed");
    if (!dismissed) setShowInstallBanner(true);
  }, []);

  function dismissInstallBanner() {
    localStorage.setItem("install_banner_dismissed", "1");
    setShowInstallBanner(false);
  }

  useEffect(() => {
    async function load() {
      const thisMonth = new Date().toISOString().slice(0, 7);
      const today = new Date().toISOString().split("T")[0];

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
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
      const [custRes, txRes, jobsRes, txRes2, empRes, projRes] = await Promise.all([
        supabase.from("customers").select("id, status, monthly_price, balance, name, phone").eq("user_id", user?.id),
        supabase.from("transactions").select("type, amount, status, transaction_date, description, customer_name").eq("type", "income").eq("user_id", user?.id),
        supabase.from("jobs").select("*").eq("user_id", user?.id).gte("job_date", today).order("job_date").limit(50),
        supabase.from("transactions").select("type, amount, transaction_date").eq("user_id", user?.id),
        supabase.from("employees").select("id, status").eq("user_id", user?.id),
        supabase.from("projects").select("id, status").eq("user_id", user?.id),
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

      const monthlyIncome = transactions
        .filter((t: Record<string, unknown>) => (t.transaction_date as string)?.startsWith(thisMonth))
        .reduce((sum: number, t: Record<string, unknown>) => sum + ((t.amount as number) || 0), 0);

      const debtors = customers
        .filter((c: Record<string, unknown>) => (c.balance as number) > 0)
        .slice(0, 2)
        .map((c: Record<string, unknown>) => `${c.name} ₪${c.balance}`)
        .join(' · ');

      setStats({
        monthlyIncome,
        activeCustomers: customers.filter((c: Record<string, unknown>) => c.status === "active" || c.status === "vip").length,
        openBalance: customers.reduce((sum: number, c: Record<string, unknown>) => sum + ((c.balance as number) || 0), 0),
        todayJobs: jobs.filter((j: Record<string, unknown>) => j.job_date === today).length,
        debtorsSub: debtors || "אין חובות פתוחים",
      });
      setRecentJobs(jobs.slice(0, 5));

      // Store full data for modals
      const thisMonthTx = transactions.filter((t: Record<string, unknown>) => (t.transaction_date as string)?.startsWith(thisMonth));
      const activeCustomers = customers.filter((c: Record<string, unknown>) => c.status === "active" || c.status === "vip");
      setModalData({ transactions: thisMonthTx, customers: activeCustomers, allCustomers: customers, jobs });

      // Calculate chart data from real transactions
      const computed = Array.from({length: 6}, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - 5 + i);
        const month = d.toISOString().slice(0, 7);
        const label = new Date(month + "-01").toLocaleDateString("he-IL", { month: "short" });
        const income = allTx.filter((t: Record<string,unknown>) => t.type === "income" && (t.transaction_date as string)?.startsWith(month)).reduce((s: number, t: Record<string,unknown>) => s + ((t.amount as number)||0), 0);
        const expense = allTx.filter((t: Record<string,unknown>) => t.type === "expense" && (t.transaction_date as string)?.startsWith(month)).reduce((s: number, t: Record<string,unknown>) => s + ((t.amount as number)||0), 0);
        return { month: label, income, expense };
      });
      setChartData(computed);

      const totalIncome = allTx.filter((t: Record<string,unknown>) => t.type === "income").reduce((s: number, t: Record<string,unknown>) => s + ((t.amount as number)||0), 0);
      const totalExpense = allTx.filter((t: Record<string,unknown>) => t.type === "expense").reduce((s: number, t: Record<string,unknown>) => s + ((t.amount as number)||0), 0);
      setChartTotals({ totalIncome, totalExpense, netProfit: totalIncome - totalExpense });

      setLoading(false);
    }
    load();
  }, []);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <Header title="דשבורד" subtitle="סקירה כללית של העסק" />

      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">

        {/* ── Greeting + Weather ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">שלום {userName} 👋</h1>
            <p className="text-sm text-gray-500 mt-0.5">{hebrewDate()}</p>
            <div className="mt-2">
              {pushStatus === "enabled" && (
                <span className="inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1.5 font-medium">🔔 התראות פעילות ✓</span>
              )}
              {pushStatus === "denied" && (
                <span className="inline-flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-3 py-1.5">🔕 אפשר התראות בהגדרות הדפדפן</span>
              )}
              {pushStatus === "unsupported" && (
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5">📧 תזכורות במייל פעילות ✓</span>
              )}
              {(pushStatus === "idle" || pushStatus === "loading") && (
                <button onClick={enablePush} disabled={pushStatus === "loading"}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-full px-4 py-2 transition-colors disabled:opacity-60">
                  {pushStatus === "loading" ? "⏳ מאשר..." : "🔔 הפעל התראות"}
                </button>
              )}
            </div>
          </div>
          {weather ? (
            <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-5 py-3 shadow-sm self-start sm:self-auto">
              <span className="text-2xl">{weather.icon}</span>
              <div>
                <p className="text-base font-bold text-gray-800">{weather.temp}°C</p>
                <p className="text-xs text-gray-500">{weather.city}</p>
              </div>
              <div className="w-px h-8 bg-gray-100 mx-1" />
              <div className="text-right">
                <p className="text-xs text-gray-400">לחות</p>
                <p className="text-xs font-semibold text-gray-600">{weather.humidity}%</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-5 py-3 shadow-sm self-start sm:self-auto">
              <Sun className="text-yellow-400" size={22} />
              <div>
                <p className="text-xs text-gray-400">מזג האוויר</p>
                <p className="text-xs text-gray-500">הגדר עיר בהגדרות</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Install Banner ── */}
        {showInstallBanner && (
          <div className="bg-gradient-to-l from-green-600 to-green-700 rounded-2xl px-5 py-4 flex items-start gap-4 shadow-md relative">
            <div className="text-3xl flex-shrink-0">📲</div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm mb-1">הוסף את גנן Pro למסך הבית שלך</p>
              <p className="text-green-100 text-xs leading-relaxed mb-3">
                גש לאפליקציה בקליק אחד — בדיוק כמו אפליקציה רגילה
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                {/* iPhone */}
                <div className="bg-white/15 rounded-xl px-3 py-2 flex-1">
                  <p className="text-white text-xs font-bold mb-1">🍎 iPhone (Safari)</p>
                  <ol className="text-green-100 text-xs space-y-0.5 list-none">
                    <li>1. לחץ על כפתור השיתוף <span className="font-bold">⬆</span> בתחתית</li>
                    <li>2. גלול ובחר <span className="font-bold">"הוסף למסך הבית"</span></li>
                    <li>3. לחץ <span className="font-bold">"הוסף"</span> בפינה הימנית</li>
                  </ol>
                </div>
                {/* Android */}
                <div className="bg-white/15 rounded-xl px-3 py-2 flex-1">
                  <p className="text-white text-xs font-bold mb-1">🤖 Android (Chrome)</p>
                  <ol className="text-green-100 text-xs space-y-0.5 list-none">
                    <li>1. לחץ על שלוש הנקודות <span className="font-bold">⋮</span> למעלה</li>
                    <li>2. בחר <span className="font-bold">"הוסף למסך הבית"</span></li>
                    <li>3. לחץ <span className="font-bold">"הוסף"</span></li>
                  </ol>
                </div>
              </div>
            </div>
            <button
              onClick={dismissInstallBanner}
              className="text-white/60 hover:text-white transition-colors flex-shrink-0 mt-0.5"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            icon={<TrendingUp size={20} className="text-green-600" />}
            iconBg="bg-green-50"
            label="הכנסה החודש"
            value={`₪${stats.monthlyIncome.toLocaleString("he-IL")}`}
            trend="+12%"
            trendColor="text-green-600"
            trendIcon={<ChevronUp size={13} />}
            sub="לחץ לפירוט העסקאות"
            onClick={() => setModal("income")}
          />
          <KpiCard
            icon={<Users size={20} className="text-blue-600" />}
            iconBg="bg-blue-50"
            label="לקוחות פעילים"
            value={String(stats.activeCustomers)}
            trend="פעיל + VIP"
            trendColor="text-blue-600"
            trendIcon={<ChevronUp size={13} />}
            sub="לחץ לרשימת הלקוחות"
            onClick={() => setModal("customers")}
          />
          <KpiCard
            icon={<Briefcase size={20} className="text-purple-600" />}
            iconBg="bg-purple-50"
            label="עבודות מתוכננות"
            value={String(stats.todayJobs)}
            trend="לחץ לכל העבודות"
            trendColor="text-purple-600"
            sub="היום ועבודות הבאות"
            onClick={() => setModal("jobs")}
          />
          <KpiCard
            icon={<AlertCircle size={20} className="text-orange-500" />}
            iconBg="bg-orange-50"
            label="יתרות פתוחות"
            value={`₪${stats.openBalance.toLocaleString("he-IL")}`}
            trend={stats.openBalance > 0 ? "דורש טיפול" : "הכל שולם ✓"}
            trendColor="text-orange-500"
            trendIcon={<AlertCircle size={13} />}
            sub="לחץ לרשימת החייבים"
            onClick={() => setModal("balance")}
          />
        </div>

        {/* Detail Modal */}
        <DetailModal
          type={modal}
          data={{
            transactions: modalData.transactions,
            customers: modal === "balance" ? modalData.allCustomers : modalData.customers,
            jobs: modalData.jobs,
          }}
          onClose={() => setModal(null)}
        />

        {/* ── Main Row: Chart + Today's Jobs ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Revenue Bar Chart */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
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
              <div className="flex items-center justify-center h-[240px]">
                <Loader2 size={28} className="animate-spin text-green-500" />
              </div>
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

          {/* Upcoming Jobs */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col">
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
              {recentJobs.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-400 text-sm">אין עבודות קרובות</div>
              )}
              {recentJobs.map((job) => {
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

        {/* ── Bottom Row: Quick Actions ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 md:col-start-3">
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
