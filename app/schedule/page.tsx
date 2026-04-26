"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Clock, MapPin, User, X,
  Calendar, AlertCircle, Loader2, CheckCircle, Circle, Phone,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

// ── types ─────────────────────────────────────────────────────────────────────

type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
type Priority = "low" | "medium" | "high" | "urgent";

interface Job {
  id: string;
  customerId: string | null;
  customerName: string;
  address: string;
  date: string;
  time: string;
  duration: number;
  type: string;
  status: TaskStatus;
  assignedTo: string[];
  price: number;
  notes?: string;
  priority: Priority;
}

// ── helpers ──────────────────────────────────────────────────────────────────

const HEBREW_DAYS_SHORT = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const HEBREW_DAYS_FULL = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const HEBREW_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function priorityColors(priority: string) {
  switch (priority) {
    case "urgent": return { border: "border-r-red-500", dot: "bg-red-500", badge: "bg-red-100 text-red-700", header: "bg-red-500" };
    case "high":   return { border: "border-r-orange-500", dot: "bg-orange-500", badge: "bg-orange-100 text-orange-700", header: "bg-orange-500" };
    case "medium": return { border: "border-r-blue-400", dot: "bg-blue-400", badge: "bg-blue-100 text-blue-700", header: "bg-blue-500" };
    default:       return { border: "border-r-gray-300", dot: "bg-gray-400", badge: "bg-gray-100 text-gray-600", header: "bg-gray-400" };
  }
}

function statusConfig(status: string) {
  switch (status) {
    case "completed":  return { label: "הושלם", color: "text-green-700 bg-green-100", icon: <CheckCircle size={12} /> };
    case "in_progress":return { label: "בביצוע", color: "text-blue-700 bg-blue-100", icon: <Circle size={12} /> };
    case "pending":    return { label: "ממתין", color: "text-yellow-700 bg-yellow-100", icon: <Circle size={12} /> };
    case "cancelled":  return { label: "בוטל", color: "text-red-700 bg-red-100", icon: <X size={12} /> };
    default:           return { label: status, color: "text-gray-700 bg-gray-100", icon: <Circle size={12} /> };
  }
}

function priorityLabel(p: string) {
  return { urgent: "דחוף", high: "גבוה", medium: "בינוני", low: "נמוך" }[p] ?? p;
}

// ── Job Detail Modal ──────────────────────────────────────────────────────────

function JobDetailModal({ job, onClose, onMarkCompleted }: {
  job: Job; onClose: () => void; onMarkCompleted: (id: string) => void;
}) {
  const colors = priorityColors(job.priority);
  const status = statusConfig(job.status);
  const [completing, setCompleting] = useState(false);

  async function handleComplete() {
    setCompleting(true);
    const { error } = await supabase.from("jobs").update({ status: "completed" }).eq("id", job.id);
    setCompleting(false);
    if (!error) { onMarkCompleted(job.id); onClose(); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-md sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl" dir="rtl">
        {/* Handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className={`${colors.header} px-6 py-4 sm:rounded-t-3xl flex items-center justify-between`}>
          <div>
            <h2 className="text-white font-bold text-lg">{job.customerName}</h2>
            <p className="text-white/80 text-sm">{job.type || "עבודת גינון"}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Badges */}
          <div className="flex gap-2 flex-wrap">
            <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
              {status.icon} {status.label}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.badge}`}>
              עדיפות {priorityLabel(job.priority)}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Calendar size={16} className="text-gray-400 flex-shrink-0" />
              <span className="text-gray-700">{job.date} · {job.time}</span>
              <span className="text-gray-400">({job.duration} ש׳)</span>
            </div>
            {job.address && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin size={16} className="text-gray-400 flex-shrink-0" />
                <span className="text-gray-700">{job.address}</span>
              </div>
            )}
            {job.assignedTo.length > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <User size={16} className="text-gray-400 flex-shrink-0" />
                <span className="text-gray-700">{job.assignedTo.join(", ")}</span>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center">
            <span className="text-gray-500 text-sm">מחיר</span>
            <span className="font-bold text-xl text-gray-800">₪{job.price.toLocaleString()}</span>
          </div>

          {/* Notes */}
          {job.notes && (
            <div className="bg-yellow-50 rounded-2xl p-3 text-sm text-yellow-800">
              <span className="font-semibold">הערות: </span>{job.notes}
            </div>
          )}

          {/* Waze */}
          {job.address && (
            <button
              onClick={() => window.open(`https://waze.com/ul?q=${encodeURIComponent(job.address)}`, "_blank")}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-blue-200 text-blue-600 text-sm font-medium"
            >
              <MapPin size={15} />
              נווט עם Waze
            </button>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1 pb-2">
            {job.status !== "completed" && job.status !== "cancelled" && (
              <button
                onClick={handleComplete}
                disabled={completing}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-2xl py-3 text-sm font-bold transition-colors"
              >
                {completing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={15} />}
                סמן הושלם
              </button>
            )}
            <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 rounded-2xl py-3 text-sm font-semibold">
              סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── New Job Modal ─────────────────────────────────────────────────────────────

function NewJobModal({ onClose, onCreated, defaultDate }: {
  onClose: () => void; onCreated: (job: Job) => void; defaultDate?: string;
}) {
  const [form, setForm] = useState({
    customer_name: "", address: "", job_date: defaultDate || new Date().toISOString().split("T")[0],
    job_time: "09:00", duration: "2", type: "", priority: "medium" as Priority, price: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!form.customer_name.trim()) { setError("שם לקוח חובה"); return; }
    setSaving(true);
    setError(null);
    const { error: dbError } = await supabase.from("jobs").insert({
      customer_name: form.customer_name.trim(),
      address: form.address.trim() || null,
      job_date: form.job_date,
      job_time: form.job_time || null,
      duration: parseFloat(form.duration) || 1,
      type: form.type.trim() || null,
      priority: form.priority,
      price: parseFloat(form.price) || 0,
      notes: form.notes.trim() || null,
      status: "pending",
      assigned_to: [],
    });
    if (dbError) { setError("שגיאה: " + dbError.message); setSaving(false); return; }

    // reload
    const { data: fresh } = await supabase.from("jobs").select("*").order("job_date").order("job_time");
    if (fresh && fresh.length > 0) {
      const last = fresh[fresh.length - 1];
      onCreated({
        id: last.id, customerId: last.customer_id ?? null, customerName: last.customer_name ?? "",
        address: last.address ?? "", date: last.job_date, time: (last.job_time ?? "00:00").slice(0, 5),
        duration: Number(last.duration), type: last.type ?? "", status: last.status as TaskStatus,
        assignedTo: last.assigned_to ?? [], price: Number(last.price), notes: last.notes ?? undefined,
        priority: (last.priority ?? "medium") as Priority,
      });
    }
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal — fixed to bottom, never covers keyboard */}
      <div className="absolute bottom-0 right-0 left-0 bg-white rounded-t-3xl shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">עבודה חדשה</h2>
          <button onClick={onClose} className="text-gray-400 p-1"><X size={20} /></button>
        </div>

        {/* Scrollable fields */}
        <div className="overflow-y-auto px-5 py-4 space-y-3" style={{maxHeight: '55vh'}}>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">שם לקוח *</label>
            <input name="customer_name" value={form.customer_name} onChange={handleChange}
              placeholder="משפחת כהן"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">כתובת</label>
            <input name="address" value={form.address} onChange={handleChange}
              placeholder="רחוב הורד 12, רעננה"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">תאריך *</label>
              <input name="job_date" type="date" value={form.job_date} onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">שעה</label>
              <input name="job_time" type="time" value={form.job_time} onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">משך (שעות)</label>
              <input name="duration" type="number" min="0.5" step="0.5" value={form.duration} onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">מחיר (₪)</label>
              <input name="price" type="number" min="0" value={form.price} onChange={handleChange} placeholder="350"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">סוג עבודה</label>
              <input name="type" value={form.type} onChange={handleChange} placeholder="גיזום, השקיה..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">עדיפות</label>
              <select name="priority" value={form.priority} onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white">
                <option value="low">נמוך</option>
                <option value="medium">בינוני</option>
                <option value="high">גבוה</option>
                <option value="urgent">דחוף</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">הערות</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
              placeholder="הערות נוספות..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}
        </div>

        {/* Buttons — always at bottom, outside scroll area */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-700 font-semibold rounded-2xl py-4 text-sm">
            ביטול
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold rounded-2xl py-4 text-sm">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {saving ? "שומר..." : "הוסף עבודה"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Job Card (list view) ──────────────────────────────────────────────────────

function JobListCard({ job, onClick }: { job: Job; onClick: () => void }) {
  const colors = priorityColors(job.priority);
  const status = statusConfig(job.status);
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-4 shadow-sm border-r-4 ${colors.border} cursor-pointer active:scale-[0.98] transition-transform`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${status.color}`}>
              {status.label}
            </span>
            {job.priority === "urgent" && (
              <span className="text-xs font-bold text-red-600 flex items-center gap-0.5">
                <AlertCircle size={11} /> דחוף
              </span>
            )}
          </div>
          <h3 className="font-bold text-gray-900 text-base truncate">{job.customerName}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{job.type || "עבודת גינון"}</p>
        </div>
        <div className="text-left flex-shrink-0">
          <p className="text-green-700 font-bold text-base">₪{job.price.toLocaleString()}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><Clock size={12} />{job.time} ({job.duration}ש׳)</span>
        {job.address && <span className="flex items-center gap-1 truncate"><MapPin size={12} />{job.address.split(",")[0]}</span>}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDayOffset, setSelectedDayOffset] = useState(0); // 0=today

  const today = useMemo(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d;
  }, []);

  const selectedDate = useMemo(() => addDays(today, selectedDayOffset), [today, selectedDayOffset]);
  const selectedISO = formatDateISO(selectedDate);

  // Week days for the strip (7 days from week start)
  const weekStart = useMemo(() => addDays(getWeekStart(today), weekOffset * 7), [today, weekOffset]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  useEffect(() => { fetchJobs(); }, []);

  async function fetchJobs() {
    setLoading(true);
    const { data } = await supabase.from("jobs").select("*").order("job_date").order("job_time");
    if (data) {
      setJobs(data.map(row => ({
        id: row.id, customerId: row.customer_id ?? null,
        customerName: row.customer_name ?? "", address: row.address ?? "",
        date: row.job_date, time: (row.job_time ?? "00:00").slice(0, 5),
        duration: Number(row.duration), type: row.type ?? "",
        status: row.status as TaskStatus, assignedTo: row.assigned_to ?? [],
        price: Number(row.price), notes: row.notes ?? undefined,
        priority: (row.priority ?? "medium") as Priority,
      })));
    }
    setLoading(false);
  }

  function handleJobCreated(job: Job) {
    setJobs(prev => [...prev, job].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)));
  }

  function handleMarkCompleted(id: string) {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: "completed" as TaskStatus } : j));
  }

  const selectedDayJobs = useMemo(
    () => jobs.filter(j => j.date === selectedISO).sort((a, b) => a.time.localeCompare(b.time)),
    [jobs, selectedISO]
  );

  // Stats for selected day
  const dayRevenue = selectedDayJobs.reduce((s, j) => s + j.price, 0);
  const dayCompleted = selectedDayJobs.filter(j => j.status === "completed").length;

  const todayISO = formatDateISO(today);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">לוח זמנים</h1>
            <p className="text-xs text-gray-500 mt-0.5">{jobs.length} עבודות סה״כ</p>
          </div>
          <button
            onClick={() => setShowNewJobModal(true)}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors"
          >
            <Plus size={16} />
            עבודה חדשה
          </button>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setWeekOffset(o => o - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => { setWeekOffset(0); setSelectedDayOffset(0); }}
            className="px-3 py-1 text-xs font-semibold text-green-700 bg-green-50 rounded-lg border border-green-200"
          >
            היום
          </button>
          <button onClick={() => setWeekOffset(o => o + 1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft size={18} />
          </button>
          <span className="text-xs text-gray-500 font-medium">
            {weekDays[0].getDate()} – {weekDays[6].getDate()} {HEBREW_MONTHS[weekDays[6].getMonth()]}
          </span>
        </div>

        {/* Day strip */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day, i) => {
            const iso = formatDateISO(day);
            const isToday = iso === todayISO;
            const isSelected = iso === selectedISO;
            const dayJobCount = jobs.filter(j => j.date === iso).length;
            return (
              <button
                key={iso}
                onClick={() => setSelectedDayOffset(Math.round((day.getTime() - today.getTime()) / 86400000))}
                className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all ${
                  isSelected ? "bg-green-600 text-white shadow-sm" :
                  isToday ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className={`text-xs font-medium mb-1 ${isSelected ? "text-white/80" : "text-gray-400"}`}>
                  {HEBREW_DAYS_SHORT[day.getDay()]}
                </span>
                <span className={`text-sm font-bold ${isSelected ? "text-white" : isToday ? "text-green-700" : "text-gray-800"}`}>
                  {day.getDate()}
                </span>
                {dayJobCount > 0 && (
                  <div className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? "bg-white" : "bg-green-500"}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Day summary bar ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-800">
            {HEBREW_DAYS_FULL[selectedDate.getDay()]}{" "}
            {selectedDate.getDate()} {HEBREW_MONTHS[selectedDate.getMonth()]}
          </p>
          <p className="text-xs text-gray-500">{selectedDayJobs.length} עבודות</p>
        </div>
        <div className="flex gap-4 text-center">
          <div>
            <p className="text-sm font-bold text-green-600">₪{dayRevenue.toLocaleString()}</p>
            <p className="text-xs text-gray-400">הכנסה</p>
          </div>
          <div>
            <p className="text-sm font-bold text-blue-600">{dayCompleted}/{selectedDayJobs.length}</p>
            <p className="text-xs text-gray-400">הושלמו</p>
          </div>
        </div>
      </div>

      {/* ── Job list ── */}
      <div className="px-4 py-4 space-y-3 pb-28">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-green-600" />
          </div>
        ) : selectedDayJobs.length === 0 ? (
          <div className="text-center py-16">
            <Calendar size={48} className="mx-auto mb-3 text-gray-200" />
            <p className="text-gray-500 font-medium">אין עבודות ביום זה</p>
            <button
              onClick={() => setShowNewJobModal(true)}
              className="mt-4 flex items-center gap-2 mx-auto px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold"
            >
              <Plus size={15} />
              הוסף עבודה
            </button>
          </div>
        ) : (
          selectedDayJobs.map(job => (
            <JobListCard key={job.id} job={job} onClick={() => setSelectedJob(job)} />
          ))
        )}
      </div>

      {/* Modals */}
      {selectedJob && (
        <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} onMarkCompleted={handleMarkCompleted} />
      )}
      {showNewJobModal && (
        <NewJobModal onClose={() => setShowNewJobModal(false)} onCreated={handleJobCreated} defaultDate={selectedISO} />
      )}
    </div>
  );
}
