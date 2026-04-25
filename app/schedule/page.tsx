"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Zap,
  Send,
  Clock,
  MapPin,
  User,
  X,
  Calendar,
  Bell,
  AlertCircle,
  Circle,
  Loader2,
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

const HEBREW_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי"];
const HEBREW_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];
const HOUR_START = 7;
const HOUR_END = 18;
const TOTAL_HOURS = HOUR_END - HOUR_START;

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDateHebrew(date: Date): string {
  return `${date.getDate()} ${HEBREW_MONTHS[date.getMonth()]}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function priorityColors(priority: string) {
  switch (priority) {
    case "urgent":
      return {
        bg: "bg-red-100 border-red-400",
        dot: "bg-red-500",
        text: "text-red-800",
        header: "bg-red-400",
      };
    case "high":
      return {
        bg: "bg-orange-100 border-orange-400",
        dot: "bg-orange-500",
        text: "text-orange-800",
        header: "bg-orange-400",
      };
    case "medium":
      return {
        bg: "bg-blue-100 border-blue-400",
        dot: "bg-blue-500",
        text: "text-blue-800",
        header: "bg-blue-400",
      };
    default:
      return {
        bg: "bg-gray-100 border-gray-300",
        dot: "bg-gray-400",
        text: "text-gray-700",
        header: "bg-gray-400",
      };
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "completed": return { label: "הושלם", color: "text-green-700 bg-green-100" };
    case "in_progress": return { label: "בביצוע", color: "text-blue-700 bg-blue-100" };
    case "pending": return { label: "ממתין", color: "text-yellow-700 bg-yellow-100" };
    case "cancelled": return { label: "בוטל", color: "text-red-700 bg-red-100" };
    default: return { label: status, color: "text-gray-700 bg-gray-100" };
  }
}

function priorityLabel(priority: string) {
  switch (priority) {
    case "urgent": return "דחוף";
    case "high": return "גבוה";
    case "medium": return "בינוני";
    case "low": return "נמוך";
    default: return priority;
  }
}

// ── sub-components ────────────────────────────────────────────────────────────

function JobCard({
  job,
  onClick,
  style,
}: {
  job: Job;
  onClick: () => void;
  style?: React.CSSProperties;
}) {
  const colors = priorityColors(job.priority);
  const assignedDisplay = job.assignedTo.join(", ");

  return (
    <div
      onClick={onClick}
      style={style}
      className={`absolute left-0.5 right-0.5 rounded border-r-4 cursor-pointer hover:shadow-md transition-shadow overflow-hidden ${colors.bg} text-xs`}
    >
      <div className={`${colors.header} px-1.5 py-0.5`}>
        <span className="font-semibold text-white truncate block">{job.customerName}</span>
      </div>
      <div className="px-1.5 py-1 space-y-0.5">
        <div className="flex items-center gap-1 text-gray-600">
          <Clock size={10} />
          <span>{job.time} ({job.duration}ש')</span>
        </div>
        <div className="font-medium truncate text-gray-700">{job.type}</div>
        {assignedDisplay && (
          <div className="flex items-center gap-1 text-gray-500 truncate">
            <User size={10} />
            <span className="truncate">{assignedDisplay}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function JobDetailModal({
  job,
  onClose,
  onMarkCompleted,
}: {
  job: Job;
  onClose: () => void;
  onMarkCompleted: (id: string) => void;
}) {
  const colors = priorityColors(job.priority);
  const status = statusLabel(job.status);
  const [completing, setCompleting] = useState(false);

  async function handleComplete() {
    setCompleting(true);
    const { error } = await supabase
      .from("jobs")
      .update({ status: "completed" })
      .eq("id", job.id);
    setCompleting(false);
    if (!error) {
      onMarkCompleted(job.id);
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
        dir="rtl"
      >
        {/* Header */}
        <div className={`${colors.header} rounded-t-2xl px-6 py-4 flex items-center justify-between`}>
          <div>
            <h2 className="text-white font-bold text-lg">{job.customerName}</h2>
            <p className="text-white/80 text-sm">{job.type}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Status + priority badges */}
          <div className="flex gap-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
              {status.label}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.text} ${colors.bg} border ${colors.bg}`}>
              עדיפות {priorityLabel(job.priority)}
            </span>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <Calendar size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-gray-400 text-xs">תאריך</p>
                <p className="font-medium">{job.date}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-gray-400 text-xs">שעה ומשך</p>
                <p className="font-medium">{job.time} | {job.duration} שעות</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-gray-400 text-xs">כתובת</p>
                <p className="font-medium">{job.address}</p>
              </div>
            </div>
            {job.assignedTo.length > 0 && (
              <div className="flex items-start gap-2">
                <User size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-400 text-xs">צוות</p>
                  <p className="font-medium">{job.assignedTo.join(", ")}</p>
                </div>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="bg-gray-50 rounded-xl p-3 flex justify-between items-center">
            <span className="text-gray-500 text-sm">מחיר</span>
            <span className="font-bold text-lg text-gray-800">₪{job.price.toLocaleString()}</span>
          </div>

          {/* Notes */}
          {job.notes && (
            <div className="bg-yellow-50 rounded-xl p-3 text-sm text-yellow-800">
              <span className="font-semibold">הערות: </span>{job.notes}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            {job.status !== "completed" && job.status !== "cancelled" && (
              <button
                onClick={handleComplete}
                disabled={completing}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
              >
                {completing ? <Loader2 size={14} className="animate-spin" /> : null}
                הושלם
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl py-2.5 text-sm font-semibold transition-colors"
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── New Job Modal ─────────────────────────────────────────────────────────────

interface NewJobForm {
  customer_name: string;
  address: string;
  job_date: string;
  job_time: string;
  duration: string;
  type: string;
  priority: Priority;
  price: string;
  notes: string;
}

function NewJobModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (job: Job) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState<NewJobForm>({
    customer_name: "",
    address: "",
    job_date: today,
    job_time: "09:00",
    duration: "2",
    type: "",
    priority: "medium",
    price: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer_name.trim() || !form.job_date) {
      setError("שם לקוח ותאריך הם שדות חובה");
      return;
    }
    setSaving(true);
    setError(null);

    const { data, error: dbError } = await supabase
      .from("jobs")
      .insert({
        customer_name: form.customer_name.trim(),
        address: form.address.trim() || null,
        job_date: form.job_date,
        job_time: form.job_time || null,
        duration: form.duration ? parseFloat(form.duration) : 1,
        type: form.type.trim() || null,
        priority: form.priority,
        price: form.price ? parseFloat(form.price) : 0,
        notes: form.notes.trim() || null,
        status: "pending",
        assigned_to: [],
      })
      .select()
      .single();

    setSaving(false);

    if (dbError) {
      setError("שגיאה בשמירה: " + dbError.message);
      return;
    }

    if (data) {
      const timeStr: string = typeof data.job_time === "string"
        ? data.job_time.slice(0, 5)
        : "00:00";

      onCreated({
        id: data.id,
        customerId: data.customer_id ?? null,
        customerName: data.customer_name ?? "",
        address: data.address ?? "",
        date: data.job_date,
        time: timeStr,
        duration: Number(data.duration),
        type: data.type ?? "",
        status: data.status as TaskStatus,
        assignedTo: data.assigned_to ?? [],
        price: Number(data.price),
        notes: data.notes ?? undefined,
        priority: data.priority as Priority,
      });
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-slate-800">עבודה חדשה</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Customer name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              שם לקוח <span className="text-red-500">*</span>
            </label>
            <input
              name="customer_name"
              value={form.customer_name}
              onChange={handleChange}
              placeholder="משפחת כהן"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              כתובת
            </label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="רחוב הורד 12, רעננה"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400"
            />
          </div>

          {/* Date + Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                תאריך <span className="text-red-500">*</span>
              </label>
              <input
                name="job_date"
                type="date"
                value={form.job_date}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                שעה
              </label>
              <input
                name="job_time"
                type="time"
                value={form.job_time}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400"
              />
            </div>
          </div>

          {/* Duration + Type row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                משך (שעות)
              </label>
              <input
                name="duration"
                type="number"
                min="0.5"
                step="0.5"
                value={form.duration}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                סוג עבודה
              </label>
              <input
                name="type"
                value={form.type}
                onChange={handleChange}
                placeholder="גיזום, השקיה..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400"
              />
            </div>
          </div>

          {/* Priority + Price row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                עדיפות
              </label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 bg-white"
              >
                <option value="low">נמוך</option>
                <option value="medium">בינוני</option>
                <option value="high">גבוה</option>
                <option value="urgent">דחוף</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                מחיר (₪)
              </label>
              <input
                name="price"
                type="number"
                min="0"
                value={form.price}
                onChange={handleChange}
                placeholder="350"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              הערות
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              placeholder="הערות נוספות..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {saving ? "שומר..." : "הוסף עבודה"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl py-2.5 text-sm transition-colors"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"weekly" | "monthly" | "daily">("weekly");
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showNewJobModal, setShowNewJobModal] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    setLoading(true);
    const { data } = await supabase
      .from("jobs")
      .select("*")
      .order("job_date")
      .order("job_time");

    if (data) {
      setJobs(
        data.map((row) => {
          const timeStr: string = typeof row.job_time === "string"
            ? row.job_time.slice(0, 5)
            : "00:00";
          return {
            id: row.id,
            customerId: row.customer_id ?? null,
            customerName: row.customer_name ?? "",
            address: row.address ?? "",
            date: row.job_date,
            time: timeStr,
            duration: Number(row.duration),
            type: row.type ?? "",
            status: row.status as TaskStatus,
            assignedTo: row.assigned_to ?? [],
            price: Number(row.price),
            notes: row.notes ?? undefined,
            priority: (row.priority ?? "medium") as Priority,
          };
        })
      );
    }
    setLoading(false);
  }

  function handleJobCreated(job: Job) {
    setJobs((prev) =>
      [...prev, job].sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      })
    );
  }

  function handleMarkCompleted(id: string) {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status: "completed" as TaskStatus } : j))
    );
    // If the selected job is the one being updated, refresh it too
    setSelectedJob((prev) =>
      prev && prev.id === id ? { ...prev, status: "completed" as TaskStatus } : prev
    );
  }

  // Current week derived from today + offset
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const weekStart = useMemo(() => {
    const base = getWeekStart(today);
    return addDays(base, weekOffset * 7);
  }, [today, weekOffset]);

  const weekDays = useMemo(
    () => Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const weekEnd = weekDays[5];

  const weekLabel = `${formatDateHebrew(weekStart)} – ${formatDateHebrew(weekEnd)} ${weekEnd.getFullYear()}`;

  // Map jobs to their column index
  const jobsInView = useMemo(() => {
    return jobs.filter((j) => {
      const iso = j.date;
      return weekDays.some((wd) => formatDateISO(wd) === iso);
    });
  }, [jobs, weekDays]);

  function getColumnIndex(job: Job): number {
    return weekDays.findIndex((d) => formatDateISO(d) === job.date);
  }

  // Pixel positioning inside the time grid
  const GRID_PX_PER_HOUR = 64;

  function getTopPx(time: string): number {
    const mins = timeToMinutes(time) - HOUR_START * 60;
    return (mins / 60) * GRID_PX_PER_HOUR;
  }

  function getHeightPx(duration: number): number {
    return Math.max(duration * GRID_PX_PER_HOUR - 4, 24);
  }

  // Today's jobs for sidebar
  const todayISO = formatDateISO(today);
  const todayJobs = jobs
    .filter((j) => j.date === todayISO)
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  // Next upcoming job (after now)
  const now = new Date();
  const nextJob = jobs
    .filter((j) => {
      const jDate = new Date(`${j.date}T${j.time}`);
      return jDate > now && j.status !== "completed" && j.status !== "cancelled";
    })
    .sort(
      (a, b) =>
        new Date(`${a.date}T${a.time}`).getTime() -
        new Date(`${b.date}T${b.time}`).getTime()
    )[0];

  // Pending confirmation jobs
  const pendingConfirmation = jobs.filter((j) => j.status === "pending").slice(0, 4);
  const unconfirmedCount = pendingConfirmation.length;

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Smart suggestions banner */}
      {!bannerDismissed && !loading && unconfirmedCount > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap size={18} className="text-amber-500 flex-shrink-0" />
            <span className="text-amber-800 text-sm font-medium">
              ⚡ {unconfirmedCount} לקוחות לא קיבלו אישור הגעה — שלח הודעה אוטומטית
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors">
              <Send size={14} />
              שלח עכשיו
            </button>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-amber-400 hover:text-amber-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="flex h-full">
        {/* ── Main calendar area ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">לוח זמנים</h1>
              <div className="flex items-center gap-3">
                {/* View toggle */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  {(
                    [
                      { key: "daily", label: "יומי" },
                      { key: "weekly", label: "שבועי" },
                      { key: "monthly", label: "חודשי" },
                    ] as const
                  ).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setView(key)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        view === key
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {/* New job button */}
                <button
                  onClick={() => setShowNewJobModal(true)}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                  <Plus size={16} />
                  עבודה חדשה +
                </button>
              </div>
            </div>

            {/* Week navigation */}
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => setWeekOffset((o) => o - 1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
              >
                <ChevronRight size={18} />
              </button>
              <button
                onClick={() => setWeekOffset(0)}
                className="px-3 py-1 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
              >
                השבוע
              </button>
              <button
                onClick={() => setWeekOffset((o) => o + 1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-gray-600 font-medium text-sm">{weekLabel}</span>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 size={32} className="animate-spin text-green-600" />
              </div>
            ) : view === "weekly" ? (
              <div className="flex min-w-0">
                {/* Time column */}
                <div className="w-16 flex-shrink-0 border-l border-gray-200 bg-white">
                  {/* Header spacer */}
                  <div className="h-12 border-b border-gray-200" />
                  {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                    <div
                      key={i}
                      style={{ height: GRID_PX_PER_HOUR }}
                      className="border-b border-gray-100 flex items-start justify-end px-2 pt-1"
                    >
                      <span className="text-xs text-gray-400 font-mono">
                        {String(HOUR_START + i).padStart(2, "0")}:00
                      </span>
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {weekDays.map((day, colIdx) => {
                  const iso = formatDateISO(day);
                  const isToday = iso === todayISO;
                  const dayJobs = jobsInView.filter(
                    (j) => getColumnIndex(j) === colIdx
                  );

                  return (
                    <div
                      key={iso}
                      className={`flex-1 min-w-0 border-l border-gray-200 ${
                        isToday ? "bg-green-50/60" : "bg-white"
                      }`}
                    >
                      {/* Day header */}
                      <div
                        className={`h-12 border-b border-gray-200 flex flex-col items-center justify-center px-1 sticky top-0 z-10 ${
                          isToday
                            ? "bg-green-600 text-white"
                            : "bg-white text-gray-700"
                        }`}
                      >
                        <span className="text-xs font-medium opacity-80">
                          {HEBREW_DAYS[colIdx]}
                        </span>
                        <span
                          className={`text-base font-bold leading-tight ${
                            isToday ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {day.getDate()}
                        </span>
                      </div>

                      {/* Time slots */}
                      <div
                        className="relative"
                        style={{ height: TOTAL_HOURS * GRID_PX_PER_HOUR }}
                      >
                        {/* Hour lines */}
                        {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                          <div
                            key={i}
                            style={{ top: i * GRID_PX_PER_HOUR }}
                            className="absolute left-0 right-0 border-b border-gray-100"
                          />
                        ))}
                        {/* Half-hour lines */}
                        {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                          <div
                            key={`h-${i}`}
                            style={{ top: i * GRID_PX_PER_HOUR + GRID_PX_PER_HOUR / 2 }}
                            className="absolute left-0 right-0 border-b border-gray-50"
                          />
                        ))}

                        {/* Job cards */}
                        {dayJobs.map((job) => {
                          const top = getTopPx(job.time);
                          const height = getHeightPx(job.duration);
                          const clampedTop = Math.max(0, Math.min(top, TOTAL_HOURS * GRID_PX_PER_HOUR - 24));
                          return (
                            <JobCard
                              key={job.id}
                              job={job}
                              onClick={() => setSelectedJob(job)}
                              style={{ top: clampedTop, height }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <Calendar size={48} className="mx-auto mb-3 opacity-40" />
                  <p className="text-lg font-medium">
                    תצוגת {view === "monthly" ? "חודשי" : "יומי"} בפיתוח
                  </p>
                  <p className="text-sm mt-1">עבור לתצוגה השבועית</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar panel ──────────────────────────────────────────────────── */}
        <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
          {/* Today section */}
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
              <Clock size={15} className="text-green-600" />
              היום
            </h2>
            {loading ? (
              <Loader2 size={16} className="animate-spin text-gray-400" />
            ) : todayJobs.length === 0 ? (
              <p className="text-xs text-gray-400">אין עבודות להיום</p>
            ) : (
              <div className="space-y-2">
                {todayJobs.map((job, idx) => {
                  const colors = priorityColors(job.priority);
                  const isLast = idx === todayJobs.length - 1;
                  return (
                    <div key={job.id} className="flex gap-2">
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${colors.dot}`} />
                        {!isLast && (
                          <div className="w-0.5 flex-1 bg-gray-200 my-1" />
                        )}
                      </div>
                      <div
                        className="flex-1 cursor-pointer hover:bg-gray-50 rounded-lg p-1.5 transition-colors"
                        onClick={() => setSelectedJob(job)}
                      >
                        <p className="text-xs font-semibold text-gray-800 truncate">
                          {job.customerName}
                        </p>
                        <p className="text-xs text-gray-500">{job.time} · {job.type}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Next job */}
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
              <Circle size={15} className="text-blue-500" />
              הבא בתור
            </h2>
            {nextJob ? (
              <div
                className="bg-blue-50 rounded-xl p-3 cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => setSelectedJob(nextJob)}
              >
                <p className="text-xs font-bold text-blue-900">{nextJob.customerName}</p>
                <p className="text-xs text-blue-700 mt-0.5">{nextJob.type}</p>
                <div className="flex items-center gap-1 mt-1.5 text-blue-600">
                  <Calendar size={11} />
                  <span className="text-xs">{nextJob.date} · {nextJob.time}</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5 text-blue-600">
                  <MapPin size={11} />
                  <span className="text-xs truncate">{nextJob.address}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">אין עבודות קרובות</p>
            )}
          </div>

          {/* Pending confirmations */}
          <div className="p-4 flex-1">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
              <Bell size={15} className="text-amber-500" />
              תזכורות אוטומטיות
            </h2>
            <div className="space-y-2">
              {pendingConfirmation.map((job) => (
                <div
                  key={job.id}
                  className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 cursor-pointer hover:bg-amber-100 transition-colors"
                  onClick={() => setSelectedJob(job)}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-amber-900 truncate">
                        {job.customerName}
                      </p>
                      <p className="text-xs text-amber-700 mt-0.5 truncate">{job.date} · {job.time}</p>
                    </div>
                    <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  </div>
                  <span className="mt-1.5 inline-block text-xs text-amber-700 bg-amber-200/60 px-1.5 py-0.5 rounded-full">
                    מחכה לאישור לקוח
                  </span>
                </div>
              ))}
            </div>

            {/* Send all reminders button */}
            <button className="mt-4 w-full flex items-center justify-center gap-2 border border-green-300 text-green-700 hover:bg-green-50 rounded-xl py-2 text-xs font-semibold transition-colors">
              <Send size={13} />
              שלח תזכורות לכולם
            </button>
          </div>

          {/* Jobs this week summary */}
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500 mb-2 font-medium">סיכום השבוע</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white rounded-lg p-2">
                <p className="text-lg font-bold text-gray-800">{jobsInView.length}</p>
                <p className="text-xs text-gray-400">עבודות</p>
              </div>
              <div className="bg-white rounded-lg p-2">
                <p className="text-lg font-bold text-green-600">
                  {jobsInView.filter((j) => j.status === "completed").length}
                </p>
                <p className="text-xs text-gray-400">הושלמו</p>
              </div>
              <div className="bg-white rounded-lg p-2">
                <p className="text-lg font-bold text-blue-600">
                  ₪{jobsInView.reduce((s, j) => s + j.price, 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">הכנסה</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Job detail modal */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onMarkCompleted={handleMarkCompleted}
        />
      )}

      {/* New job modal */}
      {showNewJobModal && (
        <NewJobModal
          onClose={() => setShowNewJobModal(false)}
          onCreated={handleJobCreated}
        />
      )}
    </div>
  );
}
