"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  DollarSign,
  BarChart2,
  Star,
  Lightbulb,
  MapPin,
  Leaf,
  Loader2,
  Info,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

// ─── static seasonal patterns (industry benchmarks) ──────────────────────────

const seasonalityData = [
  { month: "ינו׳", value: 65 },
  { month: "פבר׳", value: 70 },
  { month: "מרץ", value: 88 },
  { month: "אפר׳", value: 95 },
  { month: "מאי׳", value: 100 },
  { month: "יונ׳", value: 92 },
  { month: "יול׳", value: 85 },
  { month: "אוג׳", value: 80 },
  { month: "ספט׳", value: 90 },
  { month: "אוק׳", value: 88 },
  { month: "נוב׳", value: 75 },
  { month: "דצמ׳", value: 68 },
];

const radarData = [
  { subject: "ינו׳-מרץ", A: 70 },
  { subject: "אפר׳-יונ׳", A: 95 },
  { subject: "יול׳-ספט׳", A: 85 },
  { subject: "אוק׳-דצמ׳", A: 75 },
];

// ─── types ────────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

interface RevenuePoint {
  month: string;
  income: number | null;
  expense: number | null;
}

interface EmpPerf {
  name: string;
  fullName: string;
  revenue: number;
  jobs: number;
  rating: number;
  efficiency: number;
  hours: number;
  role: string;
}

interface CustomerSegment {
  name: string;
  value: number;
  color: string;
}

interface TopCustomer {
  name: string;
  revenue: number;
  status: string;
  monthly: number;
}

interface CityRow {
  city: string;
  customers: number;
  revenue: number;
  avgMonthly: number;
}

interface ServiceRow {
  name: string;
  revenue: number;
  jobs: number;
  color: string;
}

interface ComputedAnalytics {
  kpis: {
    periodIncome: number;
    profitability: number;
    avgCustomersPerEmployee: number;
    incomePerHour: number;
    totalCustomers: number;
    totalJobs: number;
  };
  revenueData: RevenuePoint[];
  chartTotals: { totalIncome: number; totalExpense: number };
  employeePerformance: EmpPerf[];
  customerSegments: CustomerSegment[];
  topCustomers: TopCustomer[];
  cityData: CityRow[];
  serviceRevenue: ServiceRow[];
  aiInsights: string[];
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return "₪" + n.toLocaleString("he-IL");
}

const STATUS_BADGE: Record<string, string> = {
  vip: "bg-amber-100 text-amber-700",
  active: "bg-green-100 text-green-700",
  new: "bg-blue-100 text-blue-700",
  inactive: "bg-slate-100 text-slate-500",
};
const STATUS_LABEL: Record<string, string> = {
  vip: "VIP",
  active: "פעיל",
  new: "חדש",
  inactive: "רדום",
};

/** Build computed analytics from raw rows + dateRange */
function compute(
  transactions: Row[],
  customers: Row[],
  jobs: Row[],
  employees: Row[],
  dateRange: 30 | 90 | 365
): ComputedAnalytics {
  // ── date window ────────────────────────────────────────────────────────────
  const numMonths = dateRange === 30 ? 1 : dateRange === 90 ? 3 : 12;
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - dateRange);
  const fromStr = fromDate.toISOString().split("T")[0];

  const incomeAll = transactions.filter((t) => t.type === "income");
  const expenseAll = transactions.filter((t) => t.type === "expense");

  // Transactions within the selected period
  const incomePeriod = incomeAll.filter(
    (t) => (t.transaction_date as string) >= fromStr
  );
  const expensePeriod = expenseAll.filter(
    (t) => (t.transaction_date as string) >= fromStr
  );
  const jobsPeriod = jobs.filter(
    (j) => (j.job_date as string) >= fromStr
  );

  const periodIncome = incomePeriod.reduce((s, t) => s + ((t.amount as number) || 0), 0);
  const totalIncomeAll = incomeAll.reduce((s, t) => s + ((t.amount as number) || 0), 0);
  const totalExpenseAll = expenseAll.reduce((s, t) => s + ((t.amount as number) || 0), 0);
  const periodExpense = expensePeriod.reduce((s, t) => s + ((t.amount as number) || 0), 0);

  const profitability =
    periodIncome > 0
      ? Math.round(((periodIncome - periodExpense) / periodIncome) * 1000) / 10
      : 0;

  const activeEmps = employees.filter((e) => e.status !== "offline").length;
  const avgCustomersPerEmployee =
    activeEmps > 0 ? Math.round(customers.length / activeEmps) : customers.length;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyIncome = incomeAll
    .filter((t) => (t.transaction_date as string)?.startsWith(thisMonth))
    .reduce((s, t) => s + ((t.amount as number) || 0), 0);
  const totalHours = employees.reduce((s, e) => s + ((e.hours_this_month as number) || 0), 0);
  const incomePerHour = totalHours > 0 ? Math.round(monthlyIncome / totalHours) : 0;

  // ── Revenue chart ──────────────────────────────────────────────────────────
  const revenueData: RevenuePoint[] = Array.from({ length: numMonths }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (numMonths - 1) + i);
    const key = d.toISOString().slice(0, 7);
    const label = new Date(key + "-01").toLocaleDateString("he-IL", {
      month: "short",
      ...(numMonths === 12 && i >= 10 ? { year: "2-digit" } : {}),
    });
    const inc = incomePeriod
      .filter((t) => (t.transaction_date as string)?.startsWith(key))
      .reduce((s, t) => s + ((t.amount as number) || 0), 0);
    const exp = expensePeriod
      .filter((t) => (t.transaction_date as string)?.startsWith(key))
      .reduce((s, t) => s + ((t.amount as number) || 0), 0);
    return { month: label, income: inc || null, expense: exp || null };
  });

  // ── Customer segments (always current state) ───────────────────────────────
  const segments: CustomerSegment[] = [
    { name: "VIP", value: customers.filter((c) => c.status === "vip").length, color: "#f59e0b" },
    { name: "פעיל", value: customers.filter((c) => c.status === "active").length, color: "#22c55e" },
    { name: "חדש", value: customers.filter((c) => c.status === "new").length, color: "#3b82f6" },
    { name: "רדום", value: customers.filter((c) => c.status === "inactive").length, color: "#94a3b8" },
  ].filter((s) => s.value > 0);

  // ── Top customers ──────────────────────────────────────────────────────────
  const top5: TopCustomer[] = [...customers]
    .sort((a, b) => ((b.monthly_price as number) || 0) - ((a.monthly_price as number) || 0))
    .slice(0, 5)
    .map((c) => ({
      name: (c.name as string) || "",
      revenue: ((c.monthly_price as number) || 0) * 12,
      status: (c.status as string) || "active",
      monthly: (c.monthly_price as number) || 0,
    }));

  // ── City aggregation ───────────────────────────────────────────────────────
  const cityMap = new Map<string, { count: number; totalMonthly: number }>();
  customers.forEach((c) => {
    const city = (c.city as string) || "אחר";
    const prev = cityMap.get(city) || { count: 0, totalMonthly: 0 };
    cityMap.set(city, {
      count: prev.count + 1,
      totalMonthly: prev.totalMonthly + ((c.monthly_price as number) || 0),
    });
  });
  const cities: CityRow[] = Array.from(cityMap.entries())
    .map(([city, d]) => ({
      city,
      customers: d.count,
      revenue: d.totalMonthly * 12,
      avgMonthly: Math.round(d.totalMonthly / d.count),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // ── Service revenue (filtered by period) ──────────────────────────────────
  const jobTypeMap = new Map<string, { count: number; revenue: number }>();
  jobsPeriod.forEach((j) => {
    const type = (j.type as string) || "אחר";
    const prev = jobTypeMap.get(type) || { count: 0, revenue: 0 };
    jobTypeMap.set(type, {
      count: prev.count + 1,
      revenue: prev.revenue + ((j.price as number) || 0),
    });
  });
  const serviceColors = ["#22c55e", "#4ade80", "#16a34a", "#86efac", "#bbf7d0", "#6ee7b7"];
  const services: ServiceRow[] = Array.from(jobTypeMap.entries())
    .map(([name, d], i) => ({
      name,
      revenue: d.revenue,
      jobs: d.count,
      color: serviceColors[i % serviceColors.length],
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  // ── Employee performance (current month) ──────────────────────────────────
  const empPerf: EmpPerf[] = employees.map((e) => ({
    name: ((e.name as string) || "").split(" ")[0],
    fullName: (e.name as string) || "",
    revenue: ((e.hours_this_month as number) || 0) * ((e.hourly_rate as number) || 0) * 1.6,
    jobs: Math.round(((e.hours_this_month as number) || 0) / 2.8),
    rating: +((((e.performance as number) || 80) / 20).toFixed(1)),
    efficiency: (e.performance as number) || 80,
    hours: (e.hours_this_month as number) || 0,
    role: (e.role as string) || "",
  }));

  // ── AI insights ────────────────────────────────────────────────────────────
  const insights: string[] = [];

  const vipList = customers.filter((c) => c.status === "vip");
  const activeList = customers.filter((c) => c.status === "active");
  const vipAvg =
    vipList.length > 0
      ? vipList.reduce((s, c) => s + ((c.monthly_price as number) || 0), 0) / vipList.length
      : 0;
  const activeAvg =
    activeList.length > 0
      ? activeList.reduce((s, c) => s + ((c.monthly_price as number) || 0), 0) / activeList.length
      : 0;
  if (vipAvg > 0 && activeAvg > 0) {
    const pct = Math.round(((vipAvg - activeAvg) / activeAvg) * 100);
    if (pct > 0)
      insights.push(`הכנסות מלקוחות VIP גבוהות ב-${pct}% מלקוח פעיל ממוצע — כדאי להגדיל את מספר לקוחות ה-VIP`);
  }

  const debtors = customers.filter((c) => ((c.balance as number) || 0) > 0);
  if (debtors.length > 0) {
    const totalDebt = debtors.reduce((s, c) => s + ((c.balance as number) || 0), 0);
    insights.push(
      `יש ${debtors.length} לקוחות עם חוב פתוח בסך ₪${totalDebt.toLocaleString()} — מומלץ לשלוח תזכורות`
    );
  }

  if (cities.length > 1) {
    const totalCityRev = cities.reduce((s, c) => s + c.revenue, 0);
    const topCity = cities[0];
    const topPct = totalCityRev > 0 ? Math.round((topCity.revenue / totalCityRev) * 100) : 0;
    if (topPct > 60)
      insights.push(`${topCity.city} מייצרת ${topPct}% מסך ההכנסות — גיוון גיאוגרפי יפחית סיכון עסקי`);
  }

  if (services.length > 0) {
    const totalSrvRev = services.reduce((s, sv) => s + sv.revenue, 0);
    const topSrv = services[0];
    if (totalSrvRev > 0) {
      const topSrvPct = Math.round((topSrv.revenue / totalSrvRev) * 100);
      if (topSrvPct > 40)
        insights.push(`"${topSrv.name}" הוא השירות הרווחי ביותר שלך (${topSrvPct}%) — שקול חבילות מיוחדות`);
    }
  }

  if (profitability > 0) {
    insights.push(
      `מרווח גולמי של ${profitability}% — ${
        profitability >= 70 ? "מצוין! המשך לשמור על רמה זו" : "יש מקום לשיפור בניהול הוצאות"
      }`
    );
  }

  const inactiveList = customers.filter((c) => c.status === "inactive");
  if (inactiveList.length > 0)
    insights.push(
      `יש ${inactiveList.length} לקוחות רדומים — שקול לפנות אליהם עם הצעה מיוחדת להחזרה`
    );

  const bestEmp = [...empPerf].sort((a, b) => b.efficiency - a.efficiency)[0];
  if (bestEmp?.fullName)
    insights.push(
      `${bestEmp.fullName} מציג/ה ביצועים של ${bestEmp.efficiency}% — שקול/י לקדם לתפקיד בכיר`
    );

  if (insights.length === 0)
    insights.push("הוסף לקוחות, עבודות ועסקאות כדי לראות תובנות מותאמות אישית לעסק שלך");

  return {
    kpis: {
      periodIncome,
      profitability,
      avgCustomersPerEmployee,
      incomePerHour,
      totalCustomers: customers.length,
      totalJobs: jobs.length,
    },
    revenueData,
    chartTotals: { totalIncome: totalIncomeAll, totalExpense: totalExpenseAll },
    employeePerformance: empPerf,
    customerSegments:
      segments.length > 0 ? segments : [{ name: "אין לקוחות", value: 1, color: "#e2e8f0" }],
    topCustomers: top5,
    cityData: cities,
    serviceRevenue: services,
    aiInsights: insights,
  };
}

// ─── sub-components ──────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  color = "green",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  trend?: { pct: number; label: string };
  color?: "green" | "blue" | "amber" | "purple" | "rose" | "teal";
}) {
  const colorMap = {
    green: "bg-green-50 text-green-600 border-green-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    teal: "bg-teal-50 text-teal-600 border-teal-100",
  };
  const isPositive = trend ? trend.pct >= 0 : true;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl border ${colorMap[color]}`}>
          <Icon size={18} />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
              isPositive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
            }`}
          >
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend.pct)}% {trend.label}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-800 mt-1">{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function SectionCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
      {children}
    </div>
  );
}

const CUSTOM_TOOLTIP_STYLE = {
  backgroundColor: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  fontSize: 12,
  direction: "rtl" as const,
};

function RevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number | null; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={CUSTOM_TOOLTIP_STYLE} className="px-3 py-2 shadow-lg">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload
        .filter((p) => p.value != null)
        .map((p) => (
          <p key={p.name} style={{ color: p.color }} className="text-xs">
            {p.name === "income" ? "הכנסות" : "הוצאות"}: {fmt(Number(p.value))}
          </p>
        ))}
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

const RANGE_LABELS: Record<number, string> = { 30: "30 יום", 90: "90 יום", 365: "שנה" };

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<30 | 90 | 365>(365);
  const [fetching, setFetching] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  // Raw data (fetched once)
  const [rawData, setRawData] = useState<{
    transactions: Row[];
    customers: Row[];
    jobs: Row[];
    employees: Row[];
  }>({ transactions: [], customers: [], jobs: [], employees: [] });

  // Computed (re-derived when dateRange changes)
  const [analytics, setAnalytics] = useState<ComputedAnalytics | null>(null);

  // ── Fetch once ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setFetching(false); return; }

      const [txRes, custRes, jobsRes, empRes] = await Promise.all([
        supabase.from("transactions").select("*").eq("user_id", user.id),
        supabase.from("customers").select("*").eq("user_id", user.id),
        supabase.from("jobs").select("*").eq("user_id", user.id),
        supabase.from("employees").select("*").eq("user_id", user.id),
      ]);

      setRawData({
        transactions: (txRes.data || []) as Row[],
        customers: (custRes.data || []) as Row[],
        jobs: (jobsRes.data || []) as Row[],
        employees: (empRes.data || []) as Row[],
      });
      setFetching(false);
    }
    load();
  }, []);

  // ── Recompute whenever dateRange or raw data changes ──────────────────────
  const recompute = useCallback(() => {
    if (fetching) return;
    const { transactions, customers, jobs, employees } = rawData;
    setAnalytics(compute(transactions, customers, jobs, employees, dateRange));
  }, [rawData, dateRange, fetching]);

  useEffect(() => {
    recompute();
  }, [recompute]);

  const loading = fetching || !analytics;

  const a = analytics!; // safe after loading check

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-start gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <BarChart2 className="text-green-600" size={26} />
              אנליטיקה BI
              {/* Info button */}
              <div className="relative">
                <button
                  onClick={() => setShowInfo((v) => !v)}
                  aria-label="מידע על העמוד"
                  className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors ml-1"
                >
                  <Info size={13} className="text-slate-500" />
                </button>
                {showInfo && (
                  <div className="absolute top-8 right-0 z-30 bg-white border border-slate-200 rounded-xl shadow-xl p-4 w-72 text-sm text-slate-600 leading-relaxed">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-semibold text-slate-800 text-sm">על העמוד</span>
                      <button onClick={() => setShowInfo(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={14} />
                      </button>
                    </div>
                    עמוד זה מציג ניתוח נתונים וביצועי המערכת על בסיס הפעילות שלך באפליקציה — לקוחות, עסקאות, עבודות ועובדים.
                    <br /><br />
                    <span className="text-slate-400 text-xs">הנתונים מתעדכנים בזמן אמת ומסוננים לפי טווח הזמן שנבחר בחלק העליון.</span>
                  </div>
                )}
              </div>
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              תמונת מצב עסקית מלאה · עודכן לאחרונה: היום
            </p>
          </div>
        </div>

        {/* Date range selector */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          {([30, 90, 365] as const).map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                dateRange === r
                  ? "bg-green-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-green-500" />
          <p className="text-slate-500 text-sm">טוען נתונים...</p>
        </div>
      ) : (
        <>
          {/* ── Period indicator ── */}
          <div className="flex items-center gap-2 text-xs text-slate-400 -mt-2">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            מציג נתוני {RANGE_LABELS[dateRange]} אחרונים · לקוחות ועובדים — מצב נוכחי
          </div>

          {/* ── KPI Row ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard
              icon={DollarSign}
              label={`הכנסות — ${RANGE_LABELS[dateRange]} אחרונים`}
              value={fmt(a.kpis.periodIncome)}
              sub="מבוסס על עסקאות אמיתיות"
              color="green"
            />
            <KpiCard
              icon={TrendingUp}
              label="רווחיות גולמית"
              value={a.kpis.profitability > 0 ? `${a.kpis.profitability}%` : "—"}
              sub="הכנסות פחות הוצאות בתקופה"
              color="teal"
            />
            <KpiCard
              icon={Users}
              label="לקוחות לעובד"
              value={a.kpis.avgCustomersPerEmployee > 0 ? String(a.kpis.avgCustomersPerEmployee) : "—"}
              sub={`סה"כ ${a.kpis.totalCustomers} לקוחות`}
              color="blue"
            />
            <KpiCard
              icon={Users}
              label='סה"כ לקוחות'
              value={String(a.kpis.totalCustomers)}
              sub="כולל כל הסטטוסים"
              color="purple"
            />
            <KpiCard
              icon={Clock}
              label="עבודות בתקופה"
              value={String(a.kpis.totalJobs)}
              sub={`${RANGE_LABELS[dateRange]} אחרונים`}
              color="amber"
            />
            <KpiCard
              icon={Leaf}
              label="הכנסה לשעה"
              value={a.kpis.incomePerHour > 0 ? fmt(a.kpis.incomePerHour) : "—"}
              sub="מבוסס על שעות עובדים החודש"
              color="rose"
            />
          </div>

          {/* ── Revenue Trend ── */}
          <SectionCard title={`מגמת הכנסות — ${RANGE_LABELS[dateRange]} אחרונים`}>
            {a.revenueData.every((d) => !d.income && !d.expense) ? (
              <div className="flex items-center justify-center h-[280px] text-slate-400 text-sm">
                אין עסקאות בתקופה זו — הוסף עסקאות בדף הפיננסים
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={a.revenueData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip content={<RevenueTooltip />} />
                  <Legend
                    formatter={(v) => (v === "income" ? "הכנסות" : "הוצאות")}
                    wrapperStyle={{ fontSize: 12, direction: "rtl" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#22c55e"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    stroke="#f87171"
                    strokeWidth={1.5}
                    dot={{ r: 2 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
            {(a.chartTotals.totalIncome > 0 || a.chartTotals.totalExpense > 0) && (
              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-50 pt-4">
                {[
                  { label: "סה״כ הכנסות (כל הזמנים)", value: fmt(a.chartTotals.totalIncome), color: "text-green-600" },
                  { label: "סה״כ הוצאות (כל הזמנים)", value: fmt(a.chartTotals.totalExpense), color: "text-red-500" },
                  {
                    label: "רווח נקי",
                    value: fmt(a.chartTotals.totalIncome - a.chartTotals.totalExpense),
                    color: "text-blue-600",
                  },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* ── Employee Comparison ── */}
          {a.employeePerformance.length > 0 && (
            <SectionCard title="השוואת עובדים — הכנסות ומשרות">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={a.employeePerformance}
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}K`}
                  />
                  <YAxis yAxisId="right" orientation="left" hide />
                  <Tooltip
                    formatter={(value, name) =>
                      name === "revenue"
                        ? [fmt(value as number), "הכנסות"]
                        : [value + " משרות", "משרות"]
                    }
                    contentStyle={CUSTOM_TOOLTIP_STYLE}
                  />
                  <Legend
                    formatter={(v) => (v === "revenue" ? "הכנסות" : "משרות")}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Bar yAxisId="left" dataKey="revenue" fill="#22c55e" radius={[6, 6, 0, 0]} />
                  <Bar yAxisId="right" dataKey="jobs" fill="#bfdbfe" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          )}

          {/* ── Middle Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Pie – customer segments */}
            <SectionCard title="פילוח לקוחות לפי ערך">
              {a.kpis.totalCustomers === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">
                  אין לקוחות
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={a.customerSegments}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {a.customerSegments.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v, n) => [v + " לקוחות", n]}
                        contentStyle={CUSTOM_TOOLTIP_STYLE}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {a.customerSegments.map((s) => (
                      <span key={s.name} className="flex items-center gap-1 text-xs text-slate-600">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ background: s.color }}
                        />
                        {s.name} ({s.value})
                      </span>
                    ))}
                  </div>
                </>
              )}
            </SectionCard>

            {/* Top 5 customers */}
            <SectionCard title="לקוחות הכי רווחיים — Top 5">
              {a.topCustomers.length === 0 ? (
                <div className="flex items-center justify-center h-[150px] text-slate-400 text-sm">
                  אין לקוחות
                </div>
              ) : (
                <div className="space-y-2.5">
                  {a.topCustomers.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-medium text-slate-700 truncate">{c.name}</span>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                STATUS_BADGE[c.status] || "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {STATUS_LABEL[c.status] || c.status}
                            </span>
                            <span className="text-xs font-semibold text-slate-600">
                              {fmt(c.monthly)}
                              <span className="text-slate-400 font-normal">/חודש</span>
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${
                                a.topCustomers[0].monthly > 0
                                  ? Math.min(100, (c.monthly / a.topCustomers[0].monthly) * 100)
                                  : 0
                              }%`,
                              background:
                                c.status === "vip"
                                  ? "#f59e0b"
                                  : c.status === "active"
                                  ? "#22c55e"
                                  : "#3b82f6",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Seasonality radar */}
            <SectionCard title="עונתיות — עומס חודשי (ענף)">
              <ResponsiveContainer width="100%" height={230}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fontSize: 9, fill: "#cbd5e1" }}
                  />
                  <Radar
                    name="עומס"
                    dataKey="A"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Tooltip
                    formatter={(v) => [v + "%", "עומס"]}
                    contentStyle={CUSTOM_TOOLTIP_STYLE}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>

          {/* Seasonality bar */}
          <SectionCard title="עומס חודשי מפורט — ינואר עד דצמבר (ענף)">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={seasonalityData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis
                  domain={[0, 110]}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={(v) => v + "%"}
                />
                <Tooltip
                  formatter={(v) => [v + "%", "עומס יחסי"]}
                  contentStyle={CUSTOM_TOOLTIP_STYLE}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {seasonalityData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.value >= 90 ? "#16a34a" : entry.value >= 75 ? "#4ade80" : "#bbf7d0"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>

          {/* ── Bottom Section ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Geographic analysis */}
            <SectionCard title="ניתוח גיאוגרפי — הכנסות לפי עיר">
              {a.cityData.length === 0 ? (
                <div className="flex items-center justify-center h-[150px] text-slate-400 text-sm">
                  הוסף עיר ללקוחות כדי לראות ניתוח גיאוגרפי
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-right pb-2 text-xs font-semibold text-slate-500 pr-1">
                          <MapPin size={12} className="inline ml-1" />
                          עיר
                        </th>
                        <th className="text-center pb-2 text-xs font-semibold text-slate-500">
                          לקוחות
                        </th>
                        <th className="text-left pb-2 text-xs font-semibold text-slate-500">
                          הכנסה שנתית
                        </th>
                        <th className="text-left pb-2 text-xs font-semibold text-slate-500">
                          ממוצע חודשי
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {a.cityData.map((row) => (
                        <tr key={row.city} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 font-medium text-slate-700 pr-1">{row.city}</td>
                          <td className="py-2 text-center text-slate-600">{row.customers}</td>
                          <td className="py-2 text-slate-700 font-semibold">{fmt(row.revenue)}</td>
                          <td className="py-2 text-slate-500">{fmt(row.avgMonthly)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            {/* Service revenue */}
            <SectionCard
              title={`שירותים רווחיים — ${RANGE_LABELS[dateRange]} אחרונים`}
            >
              {a.serviceRevenue.length === 0 ? (
                <div className="flex items-center justify-center h-[150px] text-slate-400 text-sm">
                  אין עבודות בתקופה זו
                </div>
              ) : (
                <div className="space-y-3">
                  {a.serviceRevenue.map((s) => (
                    <div key={s.name} className="flex items-center gap-3">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: s.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-sm text-slate-700">{s.name}</span>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>{s.jobs} עבודות</span>
                            <span className="font-semibold text-slate-700">{fmt(s.revenue)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${
                                a.serviceRevenue[0].revenue > 0
                                  ? Math.min(
                                      100,
                                      (s.revenue / a.serviceRevenue[0].revenue) * 100
                                    )
                                  : 0
                              }%`,
                              background: s.color,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── Employee Performance Table ── */}
          {a.employeePerformance.length > 0 && (
            <SectionCard title="ביצועי עובדים — סיכום מלא">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-right pb-2 text-xs font-semibold text-slate-500 pr-1">שם</th>
                      <th className="text-right pb-2 text-xs font-semibold text-slate-500">תפקיד</th>
                      <th className="text-center pb-2 text-xs font-semibold text-slate-500">משרות</th>
                      <th className="text-center pb-2 text-xs font-semibold text-slate-500">דירוג</th>
                      <th className="text-left pb-2 text-xs font-semibold text-slate-500">הכנסות</th>
                      <th className="text-center pb-2 text-xs font-semibold text-slate-500">יעילות</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {[...a.employeePerformance]
                      .sort((x, y) => y.revenue - x.revenue)
                      .map((emp) => (
                        <tr key={emp.fullName} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 pr-1">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {emp.fullName
                                  .split(" ")
                                  .map((w) => w[0])
                                  .join("")
                                  .slice(0, 2)}
                              </div>
                              <span className="font-medium text-slate-700">{emp.fullName}</span>
                            </div>
                          </td>
                          <td className="py-2.5 text-slate-500 text-xs">{emp.role}</td>
                          <td className="py-2.5 text-center text-slate-600">{emp.jobs}</td>
                          <td className="py-2.5 text-center">
                            <span className="flex items-center justify-center gap-0.5 text-amber-500">
                              <Star size={11} fill="currentColor" />
                              <span className="text-slate-700 text-xs">{emp.rating}</span>
                            </span>
                          </td>
                          <td className="py-2.5 font-semibold text-slate-700">
                            {emp.revenue > 0 ? fmt(emp.revenue) : "—"}
                          </td>
                          <td className="py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: emp.efficiency + "%",
                                    background:
                                      emp.efficiency >= 90
                                        ? "#22c55e"
                                        : emp.efficiency >= 80
                                        ? "#4ade80"
                                        : "#fbbf24",
                                  }}
                                />
                              </div>
                              <span className="text-xs text-slate-500">{emp.efficiency}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* ── AI Insights Panel ── */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-green-600 rounded-xl">
                <Lightbulb size={16} className="text-white" />
              </div>
              <h3 className="text-base font-bold text-slate-800">תובנות AI</h3>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium mr-auto">
                מבוסס על הנתונים שלך
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {a.aiInsights.map((insight, i) => (
                <div
                  key={i}
                  className="bg-white/70 backdrop-blur-sm rounded-xl p-3.5 border border-green-100/60 flex gap-2.5"
                >
                  <span className="text-green-600 mt-0.5 flex-shrink-0">💡</span>
                  <p className="text-sm text-slate-700 leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
