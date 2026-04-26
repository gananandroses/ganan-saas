"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import {
  monthlyRevenue,
  jobTypeDistribution,
  upsellAlerts,
  employees,
} from "@/lib/mock-data";
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
  MapPin,
  ChevronUp,
  Leaf,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function hebrewDate() {
  const now = new Date("2026-04-25");
  return now.toLocaleDateString("he-IL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const employeeMap: Record<string, string> = Object.fromEntries(
  employees.map((e) => [e.id, e.name])
);

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "ממתין", color: "bg-yellow-100 text-yellow-700" },
  in_progress: { label: "בביצוע", color: "bg-blue-100 text-blue-700" },
  completed: { label: "הושלם", color: "bg-green-100 text-green-700" },
  cancelled: { label: "בוטל", color: "bg-red-100 text-red-700" },
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-200",
  medium: "bg-yellow-400",
  high: "bg-orange-400",
  urgent: "bg-red-500",
};

// Jobs display computed inside component from recentJobs state

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
}

function KpiCard({ icon, iconBg, label, value, trend, trendColor, trendIcon, sub }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-3 border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        <span className={`flex items-center gap-1 text-xs font-semibold ${trendColor}`}>
          {trendIcon}
          {trend}
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      </div>
      <p className="text-xs text-gray-400 border-t border-gray-50 pt-2">{sub}</p>
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

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({ monthlyIncome: 0, activeCustomers: 0, openBalance: 0, todayJobs: 0 });
  const [recentJobs, setRecentJobs] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    async function load() {
      const thisMonth = new Date().toISOString().slice(0, 7);
      const today = new Date().toISOString().split("T")[0];

      const [custRes, txRes, jobsRes] = await Promise.all([
        supabase.from("customers").select("id, status, monthly_price, balance"),
        supabase.from("transactions").select("type, amount, status, transaction_date").eq("type", "income"),
        supabase.from("jobs").select("*").order("job_date").limit(10),
      ]);

      const customers = custRes.data || [];
      const transactions = txRes.data || [];
      const jobs = jobsRes.data || [];

      const monthlyIncome = transactions
        .filter((t: Record<string, unknown>) => (t.transaction_date as string)?.startsWith(thisMonth))
        .reduce((sum: number, t: Record<string, unknown>) => sum + ((t.amount as number) || 0), 0);

      setStats({
        monthlyIncome,
        activeCustomers: customers.filter((c: Record<string, unknown>) => c.status === "active" || c.status === "vip").length,
        openBalance: customers.reduce((sum: number, c: Record<string, unknown>) => sum + ((c.balance as number) || 0), 0),
        todayJobs: jobs.filter((j: Record<string, unknown>) => j.job_date === today).length,
      });
      setRecentJobs(jobs.slice(0, 5));
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
            <h1 className="text-2xl font-bold text-gray-900">שלום אריאל 👋</h1>
            <p className="text-sm text-gray-500 mt-0.5">{hebrewDate()}</p>
          </div>
          <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-5 py-3 shadow-sm self-start sm:self-auto">
            <Sun className="text-yellow-400" size={22} />
            <div>
              <p className="text-base font-bold text-gray-800">22°C</p>
              <p className="text-xs text-gray-500">רעננה ☀️</p>
            </div>
            <div className="w-px h-8 bg-gray-100 mx-1" />
            <div className="text-right">
              <p className="text-xs text-gray-400">לחות</p>
              <p className="text-xs font-semibold text-gray-600">52%</p>
            </div>
          </div>
        </div>

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
            sub="מכל הלקוחות החודש"
          />
          <KpiCard
            icon={<Users size={20} className="text-blue-600" />}
            iconBg="bg-blue-50"
            label="לקוחות פעילים"
            value={String(stats.activeCustomers)}
            trend="פעיל + VIP"
            trendColor="text-blue-600"
            trendIcon={<ChevronUp size={13} />}
            sub="לקוחות מנוהלים במערכת"
          />
          <KpiCard
            icon={<Briefcase size={20} className="text-purple-600" />}
            iconBg="bg-purple-50"
            label="עבודות היום"
            value={String(stats.todayJobs)}
            trend="עבודות מתוכננות"
            trendColor="text-purple-600"
            sub="לחץ ללוח הזמנים המלא"
          />
          <KpiCard
            icon={<AlertCircle size={20} className="text-orange-500" />}
            iconBg="bg-orange-50"
            label="יתרות פתוחות"
            value={`₪${stats.openBalance.toLocaleString("he-IL")}`}
            trend={stats.openBalance > 0 ? "דורש טיפול" : "הכל שולם ✓"}
            trendColor="text-orange-500"
            trendIcon={<AlertCircle size={13} />}
            sub="דוד לוי ₪300 · רון מזרחי ₪250"
          />
        </div>

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
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyRevenue} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={4}>
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

            {/* Summary row */}
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-gray-50 pt-4">
              {[
                { label: "סה״כ הכנסות", value: "₪117,950", color: "text-green-600" },
                { label: "סה״כ הוצאות", value: "₪21,600", color: "text-orange-500" },
                { label: "רווח נקי", value: "₪96,350", color: "text-blue-600" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Jobs */}
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

        {/* ── Bottom Row: Upsells + Pie + Quick Actions ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Upsell Alerts */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                <TrendingUp size={16} className="text-amber-500" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">הזדמנויות מכירה</h2>
                <p className="text-xs text-gray-400">{upsellAlerts.length} המלצות פעילות</p>
              </div>
            </div>

            <div className="space-y-3">
              {upsellAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-100 hover:border-amber-200 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800">{alert.customerName}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{alert.message}</p>
                  </div>
                  <span className="flex-shrink-0 text-xs font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full whitespace-nowrap">
                    ₪{alert.potential.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-400">פוטנציאל כולל</p>
              <p className="text-sm font-bold text-green-600">
                ₪{upsellAlerts.reduce((s, a) => s + a.potential, 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Job Type Pie Chart */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
                <Briefcase size={16} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">פילוח סוגי עבודות</h2>
                <p className="text-xs text-gray-400">לפי אחוזים</p>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={jobTypeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={44}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {jobTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value}%`, ""]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="mt-3 space-y-1.5">
              {jobTypeDistribution.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-gray-600">{item.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-700">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
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
                <p className="text-lg font-bold text-gray-900">4</p>
                <p className="text-xs text-gray-400">עובדים פעילים</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">6</p>
                <p className="text-xs text-gray-400">פרויקטים שוטפים</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
