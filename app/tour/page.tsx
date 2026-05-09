"use client";

// Read-only marketing tour. No authentication, no DB. Anyone can visit
// /tour and click through the modules to see how the app feels with a
// "successful business"-grade dataset baked into the page itself.
//
// Every action button is intentionally inert — clicking shows a toast
// nudging the visitor to register. The point is "look, don't touch".

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Leaf, ArrowLeft, Sparkles, Users, Calendar, DollarSign, FolderKanban,
  PiggyBank, BarChart3, ChevronUp, ChevronDown, TrendingUp, AlertCircle,
  CheckCircle, Clock, MapPin, Phone, Briefcase, Lock, Eye,
  Flame, User, Menu, X,
} from "lucide-react";

// ── Mock data ─────────────────────────────────────────────────────────────────

const TODAY = new Date();
function offset(days: number): Date { const d = new Date(TODAY); d.setDate(d.getDate() + days); return d; }
function fmtDate(d: Date): string { return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`; }
function ils(n: number): string { return `₪${Math.round(n).toLocaleString("he-IL")}`; }

const CUSTOMERS = [
  { id: 1, name: "משפחת כהן",     city: "רעננה",    phone: "054-1234567", monthly: 600,  status: "vip",      tags: ["VIP","גינה גדולה"], total: 14400, balance: 0,    lastVisit: offset(-7),  nextVisit: offset(7) },
  { id: 2, name: "שרה אברהם",     city: "כפר סבא",  phone: "050-5551234", monthly: 800,  status: "vip",      tags: ["VIP","ורדים"],     total: 22400, balance: 0,    lastVisit: offset(-4),  nextVisit: offset(3) },
  { id: 3, name: "מלון פלאזה",     city: "נתניה",    phone: "09-8765432",  monthly: 4500, status: "vip",      tags: ["עסקי","VIP"],       total: 162000,balance: 0,    lastVisit: offset(-3),  nextVisit: offset(4) },
  { id: 4, name: "דוד לוי",        city: "הרצליה",   phone: "052-9876543", monthly: 350,  status: "active",   tags: ["עצי פרי"],          total: 4200,  balance: 350,  lastVisit: offset(-14), nextVisit: offset(16) },
  { id: 5, name: "נועה שפירא",     city: "רמת גן",   phone: "054-3334445", monthly: 400,  status: "active",   tags: ["גינת גג"],          total: 2400,  balance: 0,    lastVisit: offset(-10), nextVisit: offset(5) },
  { id: 6, name: "יורם בן דוד",    city: "תל אביב",  phone: "050-1112222", monthly: 500,  status: "active",   tags: ["בריכה"],            total: 7500,  balance: 500,  lastVisit: offset(-8),  nextVisit: offset(7) },
  { id: 7, name: "משפחת מזרחי",   city: "פתח תקווה",phone: "052-3334444", monthly: 450,  status: "active",   tags: ["חדש"],              total: 900,   balance: 450,  lastVisit: offset(-25), nextVisit: offset(5) },
  { id: 8, name: "אילן רוזן",      city: "מודיעין",  phone: "054-5556677", monthly: 300,  status: "inactive", tags: ["רדום"],             total: 1800,  balance: 0,    lastVisit: offset(-95), nextVisit: null },
];

const UPCOMING_JOBS = [
  { id: 1, customer: "שרה אברהם",  date: offset(3),  time: "09:00", type: "כיסוח דשא + השקיה", price: 800,  priority: "medium" },
  { id: 2, customer: "מלון פלאזה",  date: offset(4),  time: "07:00", type: "תחזוקה שבועית",     price: 4500, priority: "high" },
  { id: 3, customer: "נועה שפירא",  date: offset(5),  time: "10:00", type: "טיפול בורדים",       price: 400,  priority: "medium" },
  { id: 4, customer: "משפחת מזרחי", date: offset(5),  time: "13:00", type: "גיזום עצי פרי",       price: 450,  priority: "low" },
  { id: 5, customer: "יורם בן דוד", date: offset(7),  time: "08:00", type: "תחזוקת בריכה ודשא",  price: 500,  priority: "medium" },
  { id: 6, customer: "משפחת כהן",   date: offset(7),  time: "10:30", type: "ביקור חודשי",         price: 600,  priority: "medium" },
];

const MONTHLY_REVENUE = [
  { month: "דצמ׳", income: 14200, expense: 3100 },
  { month: "ינו׳", income: 16800, expense: 3400 },
  { month: "פבר׳", income: 15400, expense: 2900 },
  { month: "מרץ",  income: 18600, expense: 3800 },
  { month: "אפר׳", income: 21200, expense: 4100 },
  { month: "מאי",  income: 22850, expense: 3650 },
];

const ACTIVE_PROJECT = {
  name: "שיפוץ גינת מלון פלאזה — קיץ 2026",
  customer: "מלון פלאזה",
  budget: 28000,
  spent: 12500,
  progress: 45,
  startDate: offset(-14),
  endDate: offset(21),
  tasks: [
    { name: "גיזום עצים גדולים", done: true },
    { name: "החלפת מערכת השקיה", done: true },
    { name: "שתילת ורדים חדשים", done: false },
    { name: "התקנת תאורה", done: false },
    { name: "גינון סופי", done: false },
  ],
};

const PERSONAL_FIXED = [
  { cat: "דיור",     icon: "🏠", amount: 4800, label: "משכנתא" },
  { cat: "רכב",      icon: "🚗", amount: 900,  label: "ליסינג" },
  { cat: "מנויים",   icon: "📺", amount: 180,  label: "נטפליקס + ספוטיפיי" },
  { cat: "חשבונות", icon: "⚡", amount: 420,  label: "חשמל + מים + ארנונה" },
  { cat: "מזון",    icon: "🛒", amount: 2400, label: "קניות מזון" },
];

// ── Toast ────────────────────────────────────────────────────────────────────

function useTourToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const show = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 2200);
  };
  return { msg, show };
}

function ToastView({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-2 animate-fade-in">
      <Lock size={14} className="text-amber-400" />
      {msg}
    </div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

type TabKey = "dashboard" | "customers" | "schedule" | "finance" | "personal" | "projects";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { key: "dashboard", label: "דשבורד",        icon: BarChart3 },
  { key: "schedule",  label: "לוח זמנים",     icon: Calendar },
  { key: "customers", label: "לקוחות",         icon: Users },
  { key: "finance",   label: "פיננסים",        icon: DollarSign },
  { key: "personal",  label: "תזרים אישי",     icon: PiggyBank },
  { key: "projects",  label: "פרויקטים",       icon: FolderKanban },
];

// ── Main page ────────────────────────────────────────────────────────────────

export default function TourPage() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const { msg, show } = useTourToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Pre-derived stats so multiple tabs can share them.
  const monthlyRevenue = useMemo(
    () => MONTHLY_REVENUE.at(-1)!.income,
    []
  );
  const totalBalance = useMemo(
    () => CUSTOMERS.reduce((s, c) => s + c.balance, 0),
    []
  );
  const activeCount = useMemo(
    () => CUSTOMERS.filter(c => c.status === "active" || c.status === "vip").length,
    []
  );

  const handleAction = () => show("זה סיור צפייה בלבד — הירשם כדי לערוך");

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      {/* Tour banner */}
      <div className="sticky top-0 z-50 bg-gradient-to-l from-amber-500 via-amber-400 to-yellow-400 text-amber-950 shadow-md">
        <div className="max-w-screen-xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Eye size={15} className="flex-shrink-0 text-amber-700" />
            <p className="truncate font-bold">
              <span className="hidden sm:inline">סיור צפייה בגנן Pro · </span>
              <span>נתונים אמיתיים, ללא הרשמה</span>
            </p>
          </div>
          <Link href="/register" className="bg-amber-950 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-900 flex items-center gap-1 whitespace-nowrap">
            התחל את שלי
            <ArrowLeft size={12} />
          </Link>
        </div>
      </div>

      {/* App header */}
      <header className="bg-white border-b border-gray-100 sticky top-[44px] z-40">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link href="/landing" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
              <Leaf size={18} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="font-bold text-gray-900 text-sm">גנן Pro</p>
              <p className="text-xs text-gray-400">סיור הדגמה</p>
            </div>
          </Link>

          {/* Desktop tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-xl p-1">
            {TABS.map(t => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    active ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-800"
                  }`}>
                  <Icon size={13} className={active ? "text-green-600" : ""} />
                  {t.label}
                </button>
              );
            })}
          </nav>

          {/* Mobile menu button */}
          <button onClick={() => setMobileMenuOpen(s => !s)} aria-label="תפריט" className="md:hidden p-2 rounded-lg bg-gray-100">
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-gray-100 bg-white">
            {TABS.map(t => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button key={t.key}
                  onClick={() => { setTab(t.key); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-sm border-b border-gray-50 ${
                    active ? "bg-green-50 text-green-700 font-bold" : "text-gray-700"
                  }`}>
                  <Icon size={15} className={active ? "text-green-600" : "text-gray-400"} />
                  {t.label}
                </button>
              );
            })}
          </nav>
        )}
      </header>

      {/* Body */}
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        {tab === "dashboard"  && <DashboardTab monthlyRevenue={monthlyRevenue} activeCount={activeCount} totalBalance={totalBalance} onAction={handleAction} />}
        {tab === "schedule"   && <ScheduleTab onAction={handleAction} />}
        {tab === "customers"  && <CustomersTab onAction={handleAction} />}
        {tab === "finance"    && <FinanceTab monthlyRevenue={monthlyRevenue} onAction={handleAction} />}
        {tab === "personal"   && <PersonalTab onAction={handleAction} />}
        {tab === "projects"   && <ProjectsTab onAction={handleAction} />}
      </main>

      {/* Final CTA at bottom of every tab */}
      <section className="bg-gradient-to-br from-green-600 to-emerald-700 text-white py-12 px-4 mt-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">אהבת מה שראית?</h2>
          <p className="text-green-100 mb-6">14 יום ניסיון חינם · ללא כרטיס אשראי · הגדרה ב-5 דקות</p>
          <Link href="/register" className="inline-flex items-center gap-2 bg-white text-green-700 hover:bg-green-50 px-6 py-3 rounded-xl font-bold shadow-xl">
            התחל את שלי
            <ArrowLeft size={16} />
          </Link>
        </div>
      </section>

      <ToastView msg={msg} />

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in { animation: fade-in 200ms ease-out; }
      `}</style>
    </div>
  );
}

// ── Dashboard tab ────────────────────────────────────────────────────────────

function DashboardTab({ monthlyRevenue, activeCount, totalBalance, onAction }: {
  monthlyRevenue: number; activeCount: number; totalBalance: number; onAction: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">שלום אריאל 👋</h1>
        <p className="text-sm text-gray-500 mt-0.5">{TODAY.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={<TrendingUp size={20} className="text-green-600" />} bg="bg-green-50" label="הכנסה החודש" value={ils(monthlyRevenue)} trend="+8% MoM" trendUp />
        <KpiCard icon={<Users size={20} className="text-blue-600" />} bg="bg-blue-50" label="לקוחות פעילים" value={String(activeCount)} sub="פעיל + VIP" />
        <KpiCard icon={<Calendar size={20} className="text-purple-600" />} bg="bg-purple-50" label="עבודות השבוע" value="7" sub="היום ועד יום שבת" />
        <KpiCard icon={<AlertCircle size={20} className="text-orange-500" />} bg="bg-orange-50" label="חוב פתוח" value={ils(totalBalance)} sub="2 לקוחות" alert />
      </div>

      {/* Revenue chart (CSS bar chart, no recharts dependency for the tour) */}
      <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">הכנסות מול הוצאות</h2>
            <p className="text-xs text-gray-400 mt-0.5">6 חודשים אחרונים</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" />הכנסות</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400" />הוצאות</span>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-3 items-end h-40">
          {MONTHLY_REVENUE.map(m => {
            const max = Math.max(...MONTHLY_REVENUE.map(x => x.income));
            return (
              <div key={m.month} className="flex flex-col items-center gap-1.5">
                <div className="w-full flex gap-1 items-end h-32">
                  <div className="flex-1 bg-green-500 rounded-t-md transition-all" style={{ height: `${(m.income / max) * 100}%` }} />
                  <div className="flex-1 bg-orange-400 rounded-t-md transition-all" style={{ height: `${(m.expense / max) * 100}%` }} />
                </div>
                <span className="text-[10px] text-gray-500 font-medium">{m.month}</span>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-gray-50 text-center">
          <div><p className="text-sm font-bold text-green-600">{ils(MONTHLY_REVENUE.reduce((s,m) => s+m.income, 0))}</p><p className="text-xs text-gray-400">סה״כ הכנסות</p></div>
          <div><p className="text-sm font-bold text-orange-500">{ils(MONTHLY_REVENUE.reduce((s,m) => s+m.expense, 0))}</p><p className="text-xs text-gray-400">סה״כ הוצאות</p></div>
          <div><p className="text-sm font-bold text-blue-600">{ils(MONTHLY_REVENUE.reduce((s,m) => s+m.income-m.expense, 0))}</p><p className="text-xs text-gray-400">רווח נקי</p></div>
        </div>
      </div>

      {/* Upcoming jobs */}
      <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">עבודות קרובות</h2>
            <p className="text-xs text-gray-400 mt-0.5">5 הבאות</p>
          </div>
          <button onClick={onAction} className="text-xs text-green-600 font-semibold">+ הוסף עבודה</button>
        </div>
        <div className="space-y-2">
          {UPCOMING_JOBS.slice(0, 5).map(j => (
            <button key={j.id} onClick={onAction}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50/60 border border-gray-100 hover:bg-gray-50 transition text-right">
              <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <Calendar size={15} className="text-green-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{j.customer}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Clock size={11} />
                  {fmtDate(j.date)} · {j.time} · {j.type}
                </p>
              </div>
              <span className="text-sm font-bold text-green-700">{ils(j.price)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, bg, label, value, sub, trend, trendUp, alert }: {
  icon: React.ReactNode; bg: string; label: string; value: string;
  sub?: string; trend?: string; trendUp?: boolean; alert?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>{icon}</div>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-semibold ${trendUp ? "text-green-600" : "text-red-500"}`}>
            {trendUp ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {trend}
          </span>
        )}
        {alert && <AlertCircle size={14} className="text-orange-500" />}
      </div>
      <div>
        <p className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
      {sub && <p className="text-[11px] text-gray-400 border-t border-gray-50 pt-2">{sub}</p>}
    </div>
  );
}

// ── Schedule tab ─────────────────────────────────────────────────────────────

function ScheduleTab({ onAction }: { onAction: () => void }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">לוח זמנים</h1>
          <p className="text-sm text-gray-500 mt-0.5">השבוע הקרוב</p>
        </div>
        <button onClick={onAction} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5">
          + עבודה חדשה
        </button>
      </div>

      {/* Mini week calendar */}
      <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
        <div className="grid grid-cols-7 gap-2 mb-3">
          {["א","ב","ג","ד","ה","ו","ש"].map(d => (
            <div key={d} className="text-center text-[11px] font-bold text-gray-400 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 14 }, (_, i) => {
            const date = offset(i);
            const jobsThis = UPCOMING_JOBS.filter(j => j.date.toDateString() === date.toDateString());
            const isToday = i === 0;
            return (
              <button key={i} onClick={onAction}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs transition ${
                  isToday ? "bg-green-600 text-white shadow" :
                  jobsThis.length > 0 ? "bg-green-50 text-green-700 font-bold" :
                  "hover:bg-gray-50 text-gray-700"
                }`}>
                <span className="font-bold">{date.getDate()}</span>
                {jobsThis.length > 0 && (
                  <span className={`mt-1 text-[9px] ${isToday ? "text-white" : "text-green-600"}`}>
                    {jobsThis.length} עבודות
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Upcoming list */}
      <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
        <h2 className="text-base font-bold text-gray-900 mb-4">עבודות מתוכננות</h2>
        <div className="space-y-3">
          {UPCOMING_JOBS.map(j => {
            const priorityColor = j.priority === "high" ? "border-r-orange-500" : j.priority === "medium" ? "border-r-blue-400" : "border-r-gray-300";
            return (
              <button key={j.id} onClick={onAction}
                className={`w-full bg-white rounded-xl p-4 border border-gray-100 border-r-4 ${priorityColor} hover:shadow-md transition text-right`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-base truncate">{j.customer}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{j.type}</p>
                  </div>
                  <p className="text-green-700 font-bold text-base flex-shrink-0">{ils(j.price)}</p>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Calendar size={11} />{fmtDate(j.date)}</span>
                  <span className="flex items-center gap-1"><Clock size={11} />{j.time}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Customers tab ────────────────────────────────────────────────────────────

function CustomersTab({ onAction }: { onAction: () => void }) {
  const statusBadge = (s: string) => {
    const m: Record<string, string> = { vip: "bg-purple-100 text-purple-700", active: "bg-green-100 text-green-700", inactive: "bg-gray-100 text-gray-500" };
    const l: Record<string, string> = { vip: "VIP", active: "פעיל", inactive: "רדום" };
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m[s]}`}>{l[s]}</span>;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">לקוחות</h1>
          <p className="text-sm text-gray-500 mt-0.5">{CUSTOMERS.length} לקוחות במערכת</p>
        </div>
        <button onClick={onAction} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-bold">
          + לקוח חדש
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {CUSTOMERS.map(c => (
          <button key={c.id} onClick={onAction}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition text-right">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-gray-900 text-base truncate">{c.name}</h3>
                  {statusBadge(c.status)}
                </div>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><MapPin size={11} />{c.city}</p>
              </div>
              <div className="text-left flex-shrink-0">
                <p className="text-base font-bold text-gray-900">{ils(c.monthly)}<span className="text-xs font-normal text-gray-400">/חו׳</span></p>
                {c.balance > 0 && <p className="text-xs text-orange-600 font-bold mt-0.5">חוב: {ils(c.balance)}</p>}
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
              <span className="text-xs text-gray-500 flex items-center gap-1"><Phone size={11} />{c.phone}</span>
              <span className="text-xs text-gray-400">סה״כ שולם: {ils(c.total)}</span>
            </div>
            <div className="flex gap-1 mt-2 flex-wrap">
              {c.tags.map(t => (
                <span key={t} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Finance tab ──────────────────────────────────────────────────────────────

function FinanceTab({ monthlyRevenue, onAction }: { monthlyRevenue: number; onAction: () => void }) {
  const profit = monthlyRevenue - 3650;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">פיננסים</h1>
          <p className="text-sm text-gray-500 mt-0.5">{TODAY.toLocaleDateString("he-IL", { month: "long", year: "numeric" })}</p>
        </div>
        <button onClick={onAction} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-bold">
          + עסקה חדשה
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={<TrendingUp size={20} className="text-green-600" />} bg="bg-green-50" label="הכנסות החודש" value={ils(monthlyRevenue)} trend="+8%" trendUp />
        <KpiCard icon={<DollarSign size={20} className="text-orange-500" />} bg="bg-orange-50" label="הוצאות החודש" value={ils(3650)} sub="ציוד + חומרים" />
        <KpiCard icon={<Sparkles size={20} className="text-blue-600" />} bg="bg-blue-50" label="רווח נקי" value={ils(profit)} sub={`שולי רווח ${Math.round(profit/monthlyRevenue*100)}%`} />
        <KpiCard icon={<AlertCircle size={20} className="text-amber-500" />} bg="bg-amber-50" label="ממתין לתשלום" value={ils(850)} sub="2 חשבוניות" alert />
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
        <h2 className="text-base font-bold text-gray-900 mb-4">עסקאות אחרונות</h2>
        <div className="space-y-2">
          {[
            { customer: "שרה אברהם", type: "income", amount: 800,  desc: "תחזוקה שבועית", status: "paid",    days: 1 },
            { customer: "מלון פלאזה", type: "income", amount: 4500, desc: "ביקור שבועי",   status: "paid",    days: 3 },
            { customer: "דוד לוי",     type: "income", amount: 350,  desc: "ביקור חודשי",   status: "pending", days: 5 },
            { customer: "אגרוקש",      type: "expense", amount: 1200, desc: "דשנים ושתילים", status: "paid",   days: 6 },
            { customer: "משפחת כהן",  type: "income", amount: 600,  desc: "ביקור דו-שבועי", status: "paid",   days: 7 },
            { customer: "תחנת דלק",   type: "expense", amount: 850,  desc: "דלק לחודש",      status: "paid",   days: 8 },
          ].map((t, i) => (
            <button key={i} onClick={onAction}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50/60 border border-gray-100 hover:bg-gray-50 transition text-right">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${t.type === "income" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                {t.type === "income" ? <TrendingUp size={15} /> : <DollarSign size={15} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{t.customer}</p>
                <p className="text-xs text-gray-500">{t.desc} · לפני {t.days} ימים</p>
              </div>
              <div className="text-left flex-shrink-0">
                <p className={`text-sm font-bold ${t.type === "income" ? "text-green-700" : "text-orange-600"}`}>
                  {t.type === "income" ? "+" : "−"}{ils(t.amount)}
                </p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {t.status === "paid" ? "שולם" : "ממתין"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Personal cash flow tab ───────────────────────────────────────────────────

function PersonalTab({ onAction }: { onAction: () => void }) {
  const totalFixed = PERSONAL_FIXED.reduce((s, x) => s + x.amount, 0);
  const income = 22500;
  const net = income - totalFixed;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">תזרים אישי</h1>
          <p className="text-sm text-gray-500 mt-0.5">כמה באמת נשאר לך בסוף החודש</p>
        </div>
        <button onClick={onAction} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-bold">
          + תנועה חדשה
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={<PiggyBank size={20} className="text-green-600" />} bg="bg-green-50" label="נטו החודש" value={ils(net)} trend="+12% MoM" trendUp />
        <KpiCard icon={<Flame size={20} className="text-orange-500" />} bg="bg-orange-50" label="Burn Rate" value={ils(totalFixed)} sub="ממוצע הוצאה ב-6ח׳" />
        <KpiCard icon={<TrendingUp size={20} className="text-blue-600" />} bg="bg-blue-50" label="Savings Rate" value={`${Math.round(net/income*100)}%`} sub="חיסכון מההכנסות" />
        <KpiCard icon={<Sparkles size={20} className="text-purple-600" />} bg="bg-purple-50" label="צפי שנתי" value={ils(net*12)} sub="על בסיס ממוצע" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <h2 className="text-base font-bold text-gray-900 mb-1">הוצאות קבועות</h2>
          <p className="text-xs text-gray-400 mb-4">סה״כ {ils(totalFixed)} בחודש</p>
          <div className="space-y-2">
            {PERSONAL_FIXED.map(p => (
              <button key={p.cat} onClick={onAction}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50/60 border border-gray-100 hover:bg-gray-50 transition text-right">
                <div className="text-2xl">{p.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{p.label}</p>
                  <p className="text-[11px] text-gray-400">{p.cat} · חודשי</p>
                </div>
                <p className="text-sm font-bold text-gray-800">{ils(p.amount)}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <h2 className="text-base font-bold text-gray-900 mb-1">פילוח לפי שייכות</h2>
          <p className="text-xs text-gray-400 mb-4">כמה מההוצאות הלכו לעסק</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <User size={14} className="text-slate-700" />
                <span className="text-xs font-semibold text-slate-700">אישי טהור</span>
                <span className="text-xs text-slate-400 mr-auto">82%</span>
              </div>
              <p className="text-xl font-bold text-slate-900">{ils(7800)}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase size={14} className="text-emerald-700" />
                <span className="text-xs font-semibold text-emerald-700">עסקי-קשור</span>
                <span className="text-xs text-emerald-500 mr-auto">18%</span>
              </div>
              <p className="text-xl font-bold text-emerald-900">{ils(1700)}</p>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden flex">
            <div className="bg-slate-400 h-full" style={{ width: "82%" }} />
            <div className="bg-emerald-500 h-full" style={{ width: "18%" }} />
          </div>
          <p className="text-[11px] text-emerald-700 mt-3">💡 שקול לתבוע החזר על הוצאות שעשית עבור העסק</p>
        </div>
      </div>
    </div>
  );
}

// ── Projects tab ─────────────────────────────────────────────────────────────

function ProjectsTab({ onAction }: { onAction: () => void }) {
  const p = ACTIVE_PROJECT;
  const done = p.tasks.filter(t => t.done).length;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">פרויקטים</h1>
          <p className="text-sm text-gray-500 mt-0.5">2 פרויקטים — אחד פעיל</p>
        </div>
        <button onClick={onAction} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-bold">
          + פרויקט חדש
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">פעיל</span>
            <h2 className="text-lg font-bold text-gray-900 mt-2">{p.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">לקוח: {p.customer}</p>
          </div>
          <div className="text-left">
            <p className="text-xs text-gray-400">תקציב</p>
            <p className="text-lg font-bold text-gray-900">{ils(p.budget)}</p>
            <p className="text-xs text-gray-400 mt-1">הוצא: {ils(p.spent)}</p>
          </div>
        </div>

        <div className="bg-gray-100 rounded-full h-2 mb-2 overflow-hidden">
          <div className="bg-green-500 h-full transition-all" style={{ width: `${p.progress}%` }} />
        </div>
        <p className="text-xs text-gray-500 mb-5">{p.progress}% הושלם · {done}/{p.tasks.length} משימות</p>

        <div className="space-y-2">
          {p.tasks.map(t => (
            <button key={t.name} onClick={onAction}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50/60 border border-gray-100 hover:bg-gray-50 transition text-right">
              {t.done ? <CheckCircle size={16} className="text-green-600 flex-shrink-0" /> : <Clock size={16} className="text-gray-400 flex-shrink-0" />}
              <span className={`text-sm flex-1 ${t.done ? "line-through text-gray-400" : "text-gray-800"}`}>{t.name}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400">התחלה</p>
            <p className="text-sm font-semibold text-gray-800 mt-0.5">{p.startDate.toLocaleDateString("he-IL")}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">סיום מתוכנן</p>
            <p className="text-sm font-semibold text-gray-800 mt-0.5">{p.endDate.toLocaleDateString("he-IL")}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 opacity-70">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">הושלם</span>
            <h2 className="text-base font-bold text-gray-900 mt-2">גינת גג — נועה שפירא</h2>
            <p className="text-sm text-gray-500 mt-0.5">תכנון והקמה של גינת גג חדשה · {ils(8500)}</p>
          </div>
          <CheckCircle size={24} className="text-green-500" />
        </div>
      </div>
    </div>
  );
}
