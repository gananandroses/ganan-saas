"use client";

import { useState, useEffect } from "react";
import {
  Users,
  MapPin,
  Clock,
  DollarSign,
  Phone,
  MessageCircle,
  Navigation,
  Briefcase,
  TrendingUp,
  Wifi,
  WifiOff,
  Coffee,
  ChevronUp,
  ChevronDown,
  Star,
  Plus,
  Activity,
  Route,
  Bell,
  Loader2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

// ===== TYPES =====

type EmployeeStatus = "active" | "on_job" | "break" | "offline";

interface Employee {
  id: string;
  name: string;
  role: string;
  phone: string;
  status: EmployeeStatus;
  currentJob?: string;
  hourlyRate: number;
  hoursThisMonth: number;
  lat: number;
  lng: number;
  performance: number;
  joinDate: string;
  avatar: string;
}

// ===== TYPES & CONFIG =====

const statusConfig: Record<
  EmployeeStatus,
  {
    label: string;
    bg: string;
    text: string;
    dot: string;
    ring: string;
    mapColor: string;
    icon: React.ReactNode;
  }
> = {
  on_job: {
    label: "בשטח",
    bg: "bg-green-100",
    text: "text-green-800",
    dot: "bg-green-500",
    ring: "ring-green-400",
    mapColor: "#16a34a",
    icon: <Briefcase size={12} />,
  },
  active: {
    label: "זמין",
    bg: "bg-blue-100",
    text: "text-blue-800",
    dot: "bg-blue-500",
    ring: "ring-blue-400",
    mapColor: "#2563eb",
    icon: <Wifi size={12} />,
  },
  break: {
    label: "הפסקה",
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    dot: "bg-yellow-400",
    ring: "ring-yellow-400",
    mapColor: "#ca8a04",
    icon: <Coffee size={12} />,
  },
  offline: {
    label: "לא מחובר",
    bg: "bg-gray-100",
    text: "text-gray-600",
    dot: "bg-gray-400",
    ring: "ring-gray-300",
    mapColor: "#6b7280",
    icon: <WifiOff size={12} />,
  },
};

// Map coordinate normalization
const LAT_MIN = 32.06;
const LAT_MAX = 32.36;
const LNG_MIN = 34.80;
const LNG_MAX = 34.93;

function latToPercent(lat: number) {
  return ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * 100;
}
function lngToPercent(lng: number) {
  return ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * 100;
}

// ===== HELPER COMPONENTS =====

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800 leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ===== GPS MAP =====

function GpsMap({
  employees,
  selectedId,
  onSelect,
}: {
  employees: Employee[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Map header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-green-600" />
          <h2 className="font-semibold text-slate-800">מיקום GPS בזמן אמת</h2>
          <span className="flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            חי
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: cfg.mapColor }}
              />
              {cfg.label}
            </span>
          ))}
        </div>
      </div>

      {/* Map body */}
      <div
        className="relative w-full"
        style={{ height: 400 }}
      >
        {/* Terrain background */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 40%, #e0f2e9 70%, #dcedc8 100%)",
          }}
        />

        {/* Grid lines — horizontal */}
        {[20, 40, 60, 80].map((p) => (
          <div
            key={`h-${p}`}
            className="absolute left-0 right-0 border-t border-green-200/60"
            style={{ top: `${p}%` }}
          />
        ))}
        {/* Grid lines — vertical */}
        {[20, 40, 60, 80].map((p) => (
          <div
            key={`v-${p}`}
            className="absolute top-0 bottom-0 border-r border-green-200/60"
            style={{ left: `${p}%` }}
          />
        ))}

        {/* Decorative road lines */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
          <polyline
            points="0,280 120,240 260,200 380,180 500,175 620,170"
            fill="none"
            stroke="#c8e6c9"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <polyline
            points="200,0 220,80 230,180 240,280 250,400"
            fill="none"
            stroke="#c8e6c9"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <polyline
            points="0,160 100,155 200,160 320,140 440,145 600,130"
            fill="none"
            stroke="#dde8c9"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>

        {/* Region labels */}
        <span className="absolute top-3 right-4 text-[10px] font-medium text-green-700/50 select-none">נתניה</span>
        <span className="absolute top-[32%] right-[28%] text-[10px] font-medium text-green-700/50 select-none">רעננה</span>
        <span className="absolute top-[36%] right-[55%] text-[10px] font-medium text-green-700/50 select-none">כ"ס</span>
        <span className="absolute bottom-[28%] left-[38%] text-[10px] font-medium text-green-700/50 select-none">פ"ת</span>
        <span className="absolute bottom-[20%] left-[18%] text-[10px] font-medium text-green-700/50 select-none">רמת גן</span>
        <span className="absolute bottom-[30%] left-[24%] text-[10px] font-medium text-green-700/50 select-none">הרצליה</span>

        {/* Employee markers */}
        {employees.map((emp) => {
          const top = latToPercent(emp.lat);
          const left = lngToPercent(emp.lng);
          const cfg = statusConfig[emp.status];
          const isSelected = selectedId === emp.id;
          const isHovered = hoveredId === emp.id;
          const isPulsing = emp.status === "on_job";

          return (
            <div
              key={emp.id}
              className="absolute"
              style={{
                top: `${top}%`,
                left: `${left}%`,
                transform: "translate(-50%, -50%)",
                zIndex: isSelected || isHovered ? 30 : 10,
              }}
            >
              {/* Pulse ring for on_job */}
              {isPulsing && (
                <span
                  className="absolute inset-0 rounded-full animate-ping opacity-40"
                  style={{
                    backgroundColor: cfg.mapColor,
                    width: 40,
                    height: 40,
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%,-50%)",
                  }}
                />
              )}

              {/* Outer ring for selected */}
              {isSelected && (
                <span
                  className="absolute rounded-full"
                  style={{
                    width: 50,
                    height: 50,
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%,-50%)",
                    border: `3px solid ${cfg.mapColor}`,
                    opacity: 0.7,
                  }}
                />
              )}

              {/* Marker circle */}
              <button
                onClick={() => onSelect(emp.id)}
                onMouseEnter={() => setHoveredId(emp.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="relative flex items-center justify-center rounded-full text-white text-xs font-bold shadow-lg transition-transform hover:scale-110 focus:outline-none"
                style={{
                  width: isSelected ? 40 : 34,
                  height: isSelected ? 40 : 34,
                  backgroundColor: cfg.mapColor,
                  border: `2px solid white`,
                }}
                title={emp.name}
              >
                {emp.avatar}
              </button>

              {/* Tooltip on hover */}
              {isHovered && (
                <div
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl border border-slate-200 px-3 py-2 min-w-[140px] text-right z-50"
                  style={{ pointerEvents: "none" }}
                >
                  <p className="text-sm font-semibold text-slate-800">{emp.name}</p>
                  <p className="text-xs text-slate-500">{emp.role}</p>
                  <div className={`inline-flex items-center gap-1 mt-1 text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </div>
                  {emp.currentJob && (
                    <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                      <MapPin size={10} />
                      {emp.currentJob}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Compass */}
        <div className="absolute bottom-4 left-4 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow text-xs font-bold text-slate-600">
          N
        </div>

        {/* Scale bar */}
        <div className="absolute bottom-4 right-4 flex items-end gap-1">
          <div className="h-1 w-16 bg-slate-500 rounded-full" />
          <span className="text-[9px] text-slate-500">10 ק"מ</span>
        </div>
      </div>
    </div>
  );
}

// ===== EMPLOYEE CARD =====

function EmployeeCard({
  emp,
  isSelected,
  onSelect,
  onUpdate,
}: {
  emp: Employee;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: () => void;
}) {
  const cfg = statusConfig[emp.status];
  const monthlyEarnings = emp.hourlyRate * emp.hoursThisMonth;

  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-2xl shadow-sm border transition-all cursor-pointer hover:shadow-md ${
        isSelected
          ? "border-green-400 ring-2 ring-green-200"
          : "border-slate-100 hover:border-slate-200"
      }`}
    >
      {/* Card top */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between mb-4">
          {/* Avatar + name */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow"
                style={{ backgroundColor: cfg.mapColor }}
              >
                {emp.avatar}
              </div>
              {/* Status dot */}
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${cfg.dot} ${
                  emp.status === "on_job" ? "animate-pulse" : ""
                }`}
              />
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-800 leading-tight">{emp.name}</p>
              <p className="text-xs text-slate-500">{emp.role}</p>
            </div>
          </div>

          {/* Status badge */}
          <span
            className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}
          >
            {cfg.icon}
            {cfg.label}
          </span>
        </div>

        {/* Current job */}
        {emp.currentJob ? (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4 text-right">
            <MapPin size={13} className="text-green-600 shrink-0" />
            <span className="text-xs text-green-800 font-medium">{emp.currentJob}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mb-4 text-right">
            <MapPin size={13} className="text-slate-400 shrink-0" />
            <span className="text-xs text-slate-400">אין משימה פעילה</span>
          </div>
        )}

        {/* Performance bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500">ביצועים</span>
            <span
              className={`text-xs font-bold ${
                emp.performance >= 90
                  ? "text-green-600"
                  : emp.performance >= 80
                  ? "text-blue-600"
                  : "text-yellow-600"
              }`}
            >
              {emp.performance}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                emp.performance >= 90
                  ? "bg-green-500"
                  : emp.performance >= 80
                  ? "bg-blue-500"
                  : "bg-yellow-500"
              }`}
              style={{ width: `${emp.performance}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-xl p-3 text-right">
            <div className="flex items-center gap-1 mb-1">
              <Clock size={12} className="text-slate-400" />
              <span className="text-xs text-slate-500">שעות חודש</span>
            </div>
            <p className="text-base font-bold text-slate-800">{emp.hoursThisMonth}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-right">
            <div className="flex items-center gap-1 mb-1">
              <DollarSign size={12} className="text-slate-400" />
              <span className="text-xs text-slate-500">הכנסה חודשית</span>
            </div>
            <p className="text-base font-bold text-slate-800">
              ₪{monthlyEarnings.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Card footer — actions */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onUpdate(); }}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-xl py-2 transition-colors">
          <Activity size={13} />
          עדכן משימה
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/maps?q=${emp.lat},${emp.lng}`, "_blank"); }}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl py-2 transition-colors">
          <Route size={13} />
          נווט אליו
        </button>
        {emp.phone && (
          <button
            onClick={(e) => { e.stopPropagation(); const num = emp.phone.startsWith("0") ? "972" + emp.phone.slice(1).replace(/[-\s]/g,"") : emp.phone.replace(/[-\s]/g,""); window.open(`https://wa.me/${num}`, "_blank"); }}
            className="flex items-center justify-center gap-1 text-xs font-medium bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-xl px-3 py-2 transition-colors">
            <MessageCircle size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

// ===== PERFORMANCE TABLE =====

type SortDir = "asc" | "desc";
type SortKey = "name" | "performance" | "hoursThisMonth" | "earnings" | "status";

function PerformanceTable({
  employees,
  selectedId,
  onSelect,
}: {
  employees: Employee[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("performance");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...employees].sort((a, b) => {
    let aVal: number | string = 0;
    let bVal: number | string = 0;

    if (sortKey === "name") { aVal = a.name; bVal = b.name; }
    else if (sortKey === "performance") { aVal = a.performance; bVal = b.performance; }
    else if (sortKey === "hoursThisMonth") { aVal = a.hoursThisMonth; bVal = b.hoursThisMonth; }
    else if (sortKey === "earnings") { aVal = a.hourlyRate * a.hoursThisMonth; bVal = b.hourlyRate * b.hoursThisMonth; }
    else if (sortKey === "status") { aVal = a.status; bVal = b.status; }

    if (typeof aVal === "string") {
      return sortDir === "asc" ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
    }
    return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronDown size={13} className="text-slate-300" />;
    return sortDir === "desc" ? (
      <ChevronDown size={13} className="text-green-600" />
    ) : (
      <ChevronUp size={13} className="text-green-600" />
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <TrendingUp size={18} className="text-green-600" />
        <h2 className="font-semibold text-slate-800">טבלת ביצועים</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
              <th className="px-5 py-3 font-medium">
                <button
                  onClick={() => toggleSort("name")}
                  className="flex items-center gap-1 hover:text-slate-700"
                >
                  עובד <SortIcon col="name" />
                </button>
              </th>
              <th className="px-5 py-3 font-medium">
                <button
                  onClick={() => toggleSort("performance")}
                  className="flex items-center gap-1 hover:text-slate-700"
                >
                  ביצועים% <SortIcon col="performance" />
                </button>
              </th>
              <th className="px-5 py-3 font-medium">
                <button
                  onClick={() => toggleSort("hoursThisMonth")}
                  className="flex items-center gap-1 hover:text-slate-700"
                >
                  שעות <SortIcon col="hoursThisMonth" />
                </button>
              </th>
              <th className="px-5 py-3 font-medium">
                <button
                  onClick={() => toggleSort("earnings")}
                  className="flex items-center gap-1 hover:text-slate-700"
                >
                  הכנסה <SortIcon col="earnings" />
                </button>
              </th>
              <th className="px-5 py-3 font-medium">
                <button
                  onClick={() => toggleSort("status")}
                  className="flex items-center gap-1 hover:text-slate-700"
                >
                  סטטוס <SortIcon col="status" />
                </button>
              </th>
              <th className="px-5 py-3 font-medium">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((emp) => {
              const cfg = statusConfig[emp.status];
              const earnings = emp.hourlyRate * emp.hoursThisMonth;
              const isSelected = selectedId === emp.id;

              return (
                <tr
                  key={emp.id}
                  onClick={() => onSelect(emp.id)}
                  className={`border-b border-slate-50 text-sm cursor-pointer transition-colors hover:bg-slate-50 ${
                    isSelected ? "bg-green-50" : ""
                  }`}
                >
                  {/* Employee */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: cfg.mapColor }}
                      >
                        {emp.avatar}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-slate-800">{emp.name}</p>
                        <p className="text-xs text-slate-400">{emp.role}</p>
                      </div>
                    </div>
                  </td>

                  {/* Performance */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            emp.performance >= 90
                              ? "bg-green-500"
                              : emp.performance >= 80
                              ? "bg-blue-500"
                              : "bg-yellow-500"
                          }`}
                          style={{ width: `${emp.performance}%` }}
                        />
                      </div>
                      <span
                        className={`text-sm font-bold w-9 text-left ${
                          emp.performance >= 90
                            ? "text-green-600"
                            : emp.performance >= 80
                            ? "text-blue-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {emp.performance}%
                      </span>
                    </div>
                  </td>

                  {/* Hours */}
                  <td className="px-5 py-3 text-slate-700 font-medium">
                    {emp.hoursThisMonth} ש'
                  </td>

                  {/* Earnings */}
                  <td className="px-5 py-3 font-semibold text-slate-800">
                    ₪{earnings.toLocaleString()}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${
                          emp.status === "on_job" ? "animate-pulse" : ""
                        }`}
                      />
                      {cfg.label}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => onSelect(emp.id)} className="p-1.5 hover:bg-green-50 text-green-600 rounded-lg transition-colors" title="עדכן משימה">
                        <Activity size={14} />
                      </button>
                      <button onClick={() => window.open(`https://www.google.com/maps?q=${emp.lat},${emp.lng}`, "_blank")} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" title="נווט אליו">
                        <Route size={14} />
                      </button>
                      {emp.phone && (
                        <button onClick={() => { const num = emp.phone.startsWith("0") ? "972" + emp.phone.slice(1).replace(/[-\s]/g,"") : emp.phone.replace(/[-\s]/g,""); window.open(`https://wa.me/${num}`, "_blank"); }} className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors" title="שלח הודעה בוואטסאפ">
                          <MessageCircle size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== UPDATE EMPLOYEE MODAL =====

function UpdateEmployeeModal({
  emp,
  onClose,
  onUpdated,
}: {
  emp: Employee;
  onClose: () => void;
  onUpdated: (updated: Employee) => void;
}) {
  const [status, setStatus] = useState<EmployeeStatus>(emp.status);
  const [currentJob, setCurrentJob] = useState(emp.currentJob ?? "");
  const [hours, setHours] = useState(String(emp.hoursThisMonth));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await supabase.from("employees").update({
      status,
      current_job: currentJob || null,
      hours_this_month: parseFloat(hours) || 0,
    }).eq("id", emp.id);
    setSaving(false);
    onUpdated({ ...emp, status, currentJob: currentJob || undefined, hoursThisMonth: parseFloat(hours) || 0 });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-md sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col" style={{maxHeight: '92dvh'}} dir="rtl">
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800">עדכון עובד — {emp.name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">סטטוס</label>
            <select value={status} onChange={e => setStatus(e.target.value as EmployeeStatus)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 bg-white">
              <option value="active">זמין</option>
              <option value="on_job">בשטח</option>
              <option value="break">הפסקה</option>
              <option value="offline">לא מחובר</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">משימה נוכחית</label>
            <input type="text" placeholder="לדוגמה: גינת משפחת לוי, רמת גן"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              value={currentJob} onChange={e => setCurrentJob(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">שעות החודש</label>
            <input type="number" min="0"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              value={hours} onChange={e => setHours(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-slate-100 flex-shrink-0 bg-white">
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-700 font-semibold rounded-2xl py-3 text-sm">ביטול</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold rounded-2xl py-3 text-sm transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? "שומר..." : "שמור"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== NEW EMPLOYEE MODAL =====

interface NewEmployeeForm {
  name: string;
  role: string;
  phone: string;
  hourly_rate: string;
  status: EmployeeStatus;
}

function NewEmployeeModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (emp: Employee) => void;
}) {
  const [form, setForm] = useState<NewEmployeeForm>({
    name: "",
    role: "",
    phone: "",
    hourly_rate: "",
    status: "active",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("שם העובד הוא שדה חובה");
      return;
    }
    setSaving(true);
    setError(null);

    const initials = form.name
      .trim()
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2);

    const { data: { user } } = await supabase.auth.getUser();
    const { data, error: dbError } = await supabase
      .from("employees")
      .insert({
        name: form.name.trim(),
        role: form.role.trim() || null,
        phone: form.phone.trim() || null,
        hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : 0,
        status: form.status,
        avatar: initials,
        hours_this_month: 0,
        performance: 100,
        lat: 32.185,
        lng: 34.871,
        user_id: user?.id,
      })
      .select()
      .single();

    setSaving(false);

    if (dbError) {
      setError("שגיאה בשמירה: " + dbError.message);
      return;
    }

    if (data) {
      onCreated({
        id: data.id,
        name: data.name,
        role: data.role ?? "",
        phone: data.phone ?? "",
        status: data.status as EmployeeStatus,
        currentJob: data.current_job ?? undefined,
        hourlyRate: Number(data.hourly_rate),
        hoursThisMonth: Number(data.hours_this_month),
        lat: data.lat ?? 32.185,
        lng: data.lng ?? 34.871,
        performance: data.performance ?? 100,
        joinDate: data.join_date ?? "",
        avatar: data.avatar ?? initials,
      });
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full sm:max-w-md sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col" style={{maxHeight: '92dvh'}} dir="rtl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800">עובד חדש</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              שם מלא <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="יוסי ביטון"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              תפקיד
            </label>
            <input
              name="role"
              value={form.role}
              onChange={handleChange}
              placeholder="גנן ראשי"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              טלפון
            </label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="054-1234567"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400"
            />
          </div>

          {/* Hourly Rate */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              שכר שעתי (₪)
            </label>
            <input
              name="hourly_rate"
              value={form.hourly_rate}
              onChange={handleChange}
              type="number"
              min="0"
              placeholder="55"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              סטטוס
            </label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 bg-white"
            >
              <option value="active">זמין</option>
              <option value="on_job">בשטח</option>
              <option value="break">הפסקה</option>
              <option value="offline">לא מחובר</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Sticky buttons */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 flex-shrink-0 bg-white">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold rounded-2xl py-3.5 text-sm transition-colors"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {saving ? "שומר..." : "הוסף עובד"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-slate-200 text-slate-700 font-semibold rounded-2xl py-3.5 text-sm"
          >
            ביטול
          </button>
        </div>
        </form>
      </div>
    </div>
  );
}

// ===== MAIN PAGE =====

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [updatingEmployee, setUpdatingEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("employees")
      .select("*")
      .eq("user_id", user?.id)
      .order("name");

    if (data) {
      setEmployees(
        data.map((row) => ({
          id: row.id,
          name: row.name,
          role: row.role ?? "",
          phone: row.phone ?? "",
          status: row.status as EmployeeStatus,
          currentJob: row.current_job ?? undefined,
          hourlyRate: Number(row.hourly_rate),
          hoursThisMonth: Number(row.hours_this_month),
          lat: row.lat ?? 32.185,
          lng: row.lng ?? 34.871,
          performance: row.performance ?? 100,
          joinDate: row.join_date ?? "",
          avatar: row.avatar ?? row.name.slice(0, 2),
        }))
      );
    }
    setLoading(false);
  }

  function handleSelect(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  function handleEmployeeCreated(emp: Employee) {
    setEmployees((prev) => [...prev, emp].sort((a, b) => a.name.localeCompare(b.name)));
  }

  function handleEmployeeUpdated(updated: Employee) {
    setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  // Stats
  const totalEmployees = employees.length;
  const onJobCount = employees.filter((e) => e.status === "on_job").length;
  const totalHours = employees.reduce((s, e) => s + e.hoursThisMonth, 0);
  const totalWage = employees.reduce((s, e) => s + e.hourlyRate * e.hoursThisMonth, 0);

  return (
    <div className="p-6 max-w-screen-xl mx-auto" dir="rtl">
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ניהול עובדים</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            מעקב GPS, ביצועים וניהול שכר
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl px-4 py-2.5 shadow-sm transition-colors"
        >
          <Plus size={16} />
          עובד חדש +
        </button>
      </div>

      {/* ===== LOADING ===== */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-green-600" />
        </div>
      ) : (
        <>
          {/* ===== STATS ROW ===== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={<Users size={20} className="text-blue-600" />}
              label='סה"כ עובדים'
              value={String(totalEmployees)}
              sub="כולל כל הסטטוסים"
              color="bg-blue-50"
            />
            <StatCard
              icon={<MapPin size={20} className="text-green-600" />}
              label="בשטח כרגע"
              value={String(onJobCount)}
              sub="עובדים פעילים בזמן אמת"
              color="bg-green-50"
            />
            <StatCard
              icon={<Clock size={20} className="text-purple-600" />}
              label="שעות החודש"
              value={String(totalHours)}
              sub="סה״כ שעות עבודה"
              color="bg-purple-50"
            />
            <StatCard
              icon={<DollarSign size={20} className="text-orange-600" />}
              label="עלות שכר החודש"
              value={`₪${totalWage.toLocaleString()}`}
              sub="עלות עובדים כוללת"
              color="bg-orange-50"
            />
          </div>

          {/* ===== GPS MAP ===== */}
          <div className="mb-6">
            <GpsMap
              employees={employees}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          </div>

          {/* ===== EMPLOYEE CARDS GRID ===== */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Users size={18} className="text-green-600" />
              <h2 className="font-semibold text-slate-800">כרטיסי עובדים</h2>
              <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">
                {totalEmployees} עובדים
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {employees.map((emp) => (
                <EmployeeCard
                  key={emp.id}
                  emp={emp}
                  isSelected={selectedId === emp.id}
                  onSelect={() => handleSelect(emp.id)}
                  onUpdate={() => setUpdatingEmployee(emp)}
                />
              ))}
            </div>
          </div>

          {/* ===== PERFORMANCE TABLE ===== */}
          <PerformanceTable
            employees={employees}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </>
      )}

      {/* ===== UPDATE EMPLOYEE MODAL ===== */}
      {updatingEmployee && (
        <UpdateEmployeeModal
          emp={updatingEmployee}
          onClose={() => setUpdatingEmployee(null)}
          onUpdated={handleEmployeeUpdated}
        />
      )}

      {/* ===== NEW EMPLOYEE MODAL ===== */}
      {showNewModal && (
        <NewEmployeeModal
          onClose={() => setShowNewModal(false)}
          onCreated={handleEmployeeCreated}
        />
      )}
    </div>
  );
}
