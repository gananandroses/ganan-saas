"use client";

import { useState } from "react";
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
  Award,
  Leaf,
} from "lucide-react";
import {
  customers,
  employees,
  monthlyRevenue,
  jobTypeDistribution,
} from "@/lib/mock-data";

// ─── derived / extended data ────────────────────────────────────────────────

const extendedMonthlyRevenue = [
  { month: "מאי׳", income: 16800, expense: 2900, projected: null },
  { month: "יונ׳", income: 18400, expense: 3300, projected: null },
  { month: "יול׳", income: 21300, expense: 3700, projected: null },
  { month: "אוג׳", income: 23600, expense: 4000, projected: null },
  { month: "ספט׳", income: 22800, expense: 3500, projected: null },
  { month: "אוק׳", income: 20100, expense: 3200, projected: null },
  ...monthlyRevenue.map((m) => ({ ...m, projected: null })),
  { month: "מאי׳ 26", income: null, expense: null, projected: 26500 },
  { month: "יונ׳ 26", income: null, expense: null, projected: 28200 },
  { month: "יול׳ 26", income: null, expense: null, projected: 30100 },
];

const employeePerformance = employees.map((e) => ({
  name: e.name.split(" ")[0],
  fullName: e.name,
  revenue: Math.round(e.hoursThisMonth * e.hourlyRate * 1.6),
  jobs: Math.round(e.hoursThisMonth / 2.8),
  rating: +(e.performance / 20).toFixed(1),
  efficiency: e.performance,
  hours: e.hoursThisMonth,
  role: e.role,
}));

const customerSegments = [
  { name: "VIP", value: customers.filter((c) => c.status === "vip").length, color: "#f59e0b" },
  { name: "פעיל", value: customers.filter((c) => c.status === "active").length, color: "#22c55e" },
  { name: "חדש", value: customers.filter((c) => c.status === "new").length, color: "#3b82f6" },
  { name: "רדום", value: customers.filter((c) => c.status === "inactive").length, color: "#94a3b8" },
];

const topCustomers = [...customers]
  .sort((a, b) => b.totalPaid - a.totalPaid)
  .slice(0, 5)
  .map((c) => ({
    name: c.name,
    revenue: c.totalPaid,
    status: c.status,
    monthly: c.monthlyPrice,
  }));

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

const cityData = [
  { city: "רעננה", customers: 1, revenue: 8100, avgMonthly: 450 },
  { city: "הרצליה", customers: 1, revenue: 3900, avgMonthly: 300 },
  { city: "כפר סבא", customers: 1, revenue: 18600, avgMonthly: 600 },
  { city: "פתח תקווה", customers: 1, revenue: 1000, avgMonthly: 250 },
  { city: "נתניה", customers: 1, revenue: 147000, avgMonthly: 3500 },
  { city: "רמת גן", customers: 1, revenue: 700, avgMonthly: 350 },
];

const serviceRevenue = jobTypeDistribution.map((jt, i) => ({
  name: jt.name,
  revenue: [42000, 28000, 19500, 15600, 7800][i] ?? 5000,
  jobs: [185, 90, 62, 49, 24][i] ?? 20,
  color: jt.color,
}));

const aiInsights = [
  "הכנסות מלקוח VIP גבוהות ב-340% מלקוח ממוצע — כדאי להגדיל את מספר לקוחות ה-VIP",
  "יום שלישי ורביעי הם הימים הרווחיים ביותר — שקול תמחור פרמיום לביקושים גבוהים",
  "לקוחות בתדירות שבועית שומרים 94% לעומת 67% בלבד בתדירות נמוכה — כדאי לעודד שדרוג",
  "מלון פלאזה מייצר 78% מסך ההכנסות — גיוון בסיס הלקוחות יפחית סיכון עסקי",
  "מיכל גרין מציגה ביצועים גבוהים ב-20% מהממוצע — שקול לקדם לתפקיד ניהולי",
];

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
              isPositive
                ? "bg-green-50 text-green-600"
                : "bg-red-50 text-red-500"
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Array<{ name: string; value: number | string | null; color: string }>;
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
            {p.name === "income"
              ? "הכנסות"
              : p.name === "expense"
              ? "הוצאות"
              : "תחזית"}
            : {fmt(Number(p.value))}
          </p>
        ))}
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<30 | 90 | 365>(365);

  const ranges: { label: string; value: 30 | 90 | 365 }[] = [
    { label: "30 יום", value: 30 },
    { label: "90 יום", value: 90 },
    { label: "שנה", value: 365 },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart2 className="text-green-600" size={26} />
            אנליטיקה BI
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            תמונת מצב עסקית מלאה · עודכן לאחרונה: היום
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          {ranges.map((r) => (
            <button
              key={r.value}
              onClick={() => setDateRange(r.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                dateRange === r.value
                  ? "bg-green-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          icon={DollarSign}
          label="הכנסה שנתית"
          value="₪298,200"
          sub="בסיס על 12 חודשים אחרונים"
          trend={{ pct: 18, label: "YoY" }}
          color="green"
        />
        <KpiCard
          icon={TrendingUp}
          label="רווחיות"
          value="84.7%"
          sub="מרווח גולמי ממוצע"
          trend={{ pct: 3.2, label: "vs. אשתקד" }}
          color="teal"
        />
        <KpiCard
          icon={Users}
          label="לקוחות ממוצע לגנן"
          value="18"
          sub="לגנן במשרה מלאה"
          trend={{ pct: 5, label: "vs. אשתקד" }}
          color="blue"
        />
        <KpiCard
          icon={Award}
          label="שימור לקוחות"
          value="91%"
          sub="חידוש חוזים 12 חודשים"
          trend={{ pct: 2, label: "vs. אשתקד" }}
          color="purple"
        />
        <KpiCard
          icon={Clock}
          label="זמן ביקור ממוצע"
          value="2.8 שעות"
          sub="לביקור תחזוקה רגיל"
          color="amber"
        />
        <KpiCard
          icon={Leaf}
          label="הכנסה לשעה"
          value="₪115"
          sub="ממוצע על כלל השירותים"
          trend={{ pct: 8, label: "vs. אשתקד" }}
          color="rose"
        />
      </div>

      {/* ── Revenue Trend (full width) ── */}
      <SectionCard title="מגמת הכנסות — 12 חודשים + תחזית">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={extendedMonthlyRevenue} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}K`} />
            <Tooltip content={<RevenueTooltip />} />
            <Legend
              formatter={(value) =>
                value === "income" ? "הכנסות" : value === "expense" ? "הוצאות" : "תחזית"
              }
              wrapperStyle={{ fontSize: 12, direction: "rtl" }}
            />
            <Line
              type="monotone"
              dataKey="income"
              stroke="#22c55e"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#22c55e" }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="expense"
              stroke="#f87171"
              strokeWidth={1.5}
              dot={{ r: 2, fill: "#f87171" }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="projected"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={{ r: 3, fill: "#3b82f6" }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* ── Employee Comparison ── */}
      <SectionCard title="השוואת עובדים — הכנסות ומשרות">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={employeePerformance} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}K`} />
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

      {/* ── Middle Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie – customer segments */}
        <SectionCard title="פילוח לקוחות לפי ערך">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={customerSegments}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {customerSegments.map((entry, i) => (
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
            {customerSegments.map((s) => (
              <span
                key={s.name}
                className="flex items-center gap-1 text-xs text-slate-600"
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ background: s.color }}
                />
                {s.name} ({s.value})
              </span>
            ))}
          </div>
        </SectionCard>

        {/* Top 5 customers */}
        <SectionCard title="לקוחות הכי רווחיים — Top 5">
          <div className="space-y-2.5">
            {topCustomers.map((c, i) => (
              <div key={c.name} className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium text-slate-700 truncate">{c.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_BADGE[c.status]}`}
                      >
                        {STATUS_LABEL[c.status]}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">
                        {fmt(c.revenue)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (c.revenue / topCustomers[0].revenue) * 100)}%`,
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
        </SectionCard>

        {/* Seasonality */}
        <SectionCard title="עונתיות — עומס חודשי">
          <ResponsiveContainer width="100%" height={230}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "#cbd5e1" }} />
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

      {/* Seasonality bar (monthly detail) */}
      <SectionCard title="עומס חודשי מפורט — ינואר עד דצמבר">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={seasonalityData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis domain={[0, 110]} tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => v + "%"} />
            <Tooltip
              formatter={(v) => [v + "%", "עומס יחסי"]}
              contentStyle={CUSTOM_TOOLTIP_STYLE}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {seasonalityData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.value >= 90 ? "#16a34a" : entry.value >= 75 ? "#4ade80" : "#bbf7d0"}
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-right pb-2 text-xs font-semibold text-slate-500 pr-1">
                    <MapPin size={12} className="inline ml-1" />
                    עיר
                  </th>
                  <th className="text-center pb-2 text-xs font-semibold text-slate-500">לקוחות</th>
                  <th className="text-left pb-2 text-xs font-semibold text-slate-500">סה&quot;כ הכנסות</th>
                  <th className="text-left pb-2 text-xs font-semibold text-slate-500">ממוצע חודשי</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {cityData
                  .sort((a, b) => b.revenue - a.revenue)
                  .map((row) => (
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
        </SectionCard>

        {/* Service revenue */}
        <SectionCard title="שירותים רווחיים — הכנסות לפי סוג שירות">
          <div className="space-y-3">
            {serviceRevenue
              .sort((a, b) => b.revenue - a.revenue)
              .map((s) => (
                <div key={s.name} className="flex items-center gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: s.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-sm text-slate-700">{s.name}</span>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{s.jobs} משרות</span>
                        <span className="font-semibold text-slate-700">{fmt(s.revenue)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (s.revenue / serviceRevenue[0].revenue) * 100)}%`,
                          background: s.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </SectionCard>
      </div>

      {/* ── Employee Performance Table ── */}
      <SectionCard title="ביצועי עובדים — סיכום מלא">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-right pb-2 text-xs font-semibold text-slate-500 pr-1">שם</th>
                <th className="text-right pb-2 text-xs font-semibold text-slate-500">תפקיד</th>
                <th className="text-center pb-2 text-xs font-semibold text-slate-500">משרות</th>
                <th className="text-center pb-2 text-xs font-semibold text-slate-500">דירוג</th>
                <th className="text-left pb-2 text-xs font-semibold text-slate-500">הכנסות שנוצרו</th>
                <th className="text-center pb-2 text-xs font-semibold text-slate-500">יעילות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {employeePerformance
                .sort((a, b) => b.revenue - a.revenue)
                .map((emp) => (
                  <tr key={emp.fullName} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 pr-1">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {emp.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
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
                    <td className="py-2.5 font-semibold text-slate-700">{fmt(emp.revenue)}</td>
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

      {/* ── AI Insights Panel ── */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-green-600 rounded-xl">
            <Lightbulb size={16} className="text-white" />
          </div>
          <h3 className="text-base font-bold text-slate-800">תובנות AI</h3>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium mr-auto">
            מעודכן אוטומטית
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {aiInsights.map((insight, i) => (
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
    </div>
  );
}
