"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Clock, MapPin, User, X,
  Calendar, AlertCircle, Loader2, CheckCircle, Circle, Phone, RefreshCw, ArrowRight,
  MessageCircle, StickyNote,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { toast, confirmDialog } from "@/components/Toaster";
import { getHoliday, type HolidayType } from "@/lib/israeli-holidays";
import { getDefaultVatMode } from "@/lib/vat-settings";
import { SkeletonList } from "@/components/Skeleton";
import { completeJobAndCreateTransactions, findOrphanCompletedJobs, backfillCompletedJobTransactions, type CompletedJobLite } from "@/lib/complete-job";

// ── Holiday styling ─────────────────────────────────────────────────────────
function holidayStyle(type: HolidayType) {
  switch (type) {
    case "major":    return { dot: "bg-rose-500",    text: "text-rose-700",   bg: "bg-rose-50",   ring: "ring-rose-200",   pill: "bg-rose-100 text-rose-700" };
    case "national": return { dot: "bg-sky-500",     text: "text-sky-700",    bg: "bg-sky-50",    ring: "ring-sky-200",    pill: "bg-sky-100 text-sky-700" };
    case "memorial": return { dot: "bg-slate-500",   text: "text-slate-700",  bg: "bg-slate-50",  ring: "ring-slate-200",  pill: "bg-slate-100 text-slate-700" };
    default:         return { dot: "bg-amber-400",   text: "text-amber-700",  bg: "bg-amber-50",  ring: "ring-amber-200",  pill: "bg-amber-100 text-amber-700" };
  }
}

// ── types ─────────────────────────────────────────────────────────────────────

type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
type Priority = "low" | "medium" | "high" | "urgent";
type JobCategory = "work" | "quote" | "followup";

type CancellationReason = "no_show" | "force_majeure" | null;

interface Job {
  id: string;
  customerId: string | null;
  customerName: string;
  customerPhone?: string;   // pulled from customers table during fetchJobs
  address: string;
  date: string;
  time: string;
  duration: number;
  type: string;
  status: TaskStatus;
  assignedTo: string[];
  price: number;
  priceBeforeVat: boolean;
  expenses: number;
  notes?: string;
  priority: Priority;
  jobCategory: JobCategory;
  cancellationReason?: CancellationReason;
}

// ── helpers ──────────────────────────────────────────────────────────────────

const HEBREW_DAYS_SHORT = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const HEBREW_DAYS_FULL = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const HEBREW_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

function formatDateISO(date: Date): string {
  // Use local date (not UTC) to avoid timezone off-by-one
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

function categoryConfig(cat: JobCategory) {
  switch (cat) {
    case "quote":    return { border: "border-r-purple-500", dot: "bg-purple-500", badge: "bg-purple-100 text-purple-700", header: "bg-purple-600", label: "📋 הצעת מחיר", btnActive: "bg-purple-600 text-white", btnInactive: "bg-gray-100 text-gray-500" };
    case "followup": return { border: "border-r-amber-400",  dot: "bg-amber-400",  badge: "bg-amber-100 text-amber-700",  header: "bg-amber-500",  label: "🔁 מעקב",        btnActive: "bg-amber-500 text-white",  btnInactive: "bg-gray-100 text-gray-500" };
    default:         return { border: "border-r-green-500",  dot: "bg-green-500",  badge: "bg-green-100 text-green-700",  header: "bg-green-600",  label: "🌿 עבודת גינון", btnActive: "bg-green-600 text-white",  btnInactive: "bg-gray-100 text-gray-500" };
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

function EditJobModal({ job, onClose, onSaved }: {
  job: Job; onClose: () => void; onSaved: (updated: Job) => void;
}) {
  const [form, setForm] = useState({
    customer_name: job.customerName,
    address: job.address,
    job_date: job.date,
    job_time: job.time,
    duration: String(job.duration),
    type: job.type,
    priority: job.priority,
    price: String(job.price),
    expenses: String(job.expenses ?? 0),
    notes: job.notes ?? "",
    status: job.status,
  });
  const [priceBeforeVat, setPriceBeforeVat] = useState(job.priceBeforeVat);
  const [jobCategory, setJobCategory] = useState<JobCategory>(job.jobCategory);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      customer_name: form.customer_name.trim(),
      address: form.address.trim() || null,
      job_date: form.job_date,
      job_time: form.job_time || null,
      duration: parseFloat(form.duration) || 1,
      type: form.type.trim() || null,
      priority: form.priority,
      price: parseFloat(form.price) || 0,
      price_before_vat: priceBeforeVat,
      expenses: parseFloat(form.expenses) || 0,
      notes: form.notes.trim() || null,
      status: form.status,
      job_category: jobCategory,
    };
    await supabase.from("jobs").update(payload).eq("id", job.id).eq("user_id", user?.id);
    onSaved({ ...job, ...payload, customerName: payload.customer_name, address: payload.address ?? "", priceBeforeVat, expenses: payload.expenses, jobCategory, time: (payload.job_time ?? "00:00").slice(0,5), date: payload.job_date, duration: payload.duration, type: payload.type ?? "", notes: payload.notes ?? undefined, status: payload.status as TaskStatus, priority: payload.priority as Priority });
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] bg-white overflow-y-auto" dir="rtl" role="dialog" aria-modal="true">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3">
        <button onClick={onClose} className="text-gray-500 font-medium text-sm px-2 py-1">ביטול</button>
        <h2 className="text-base font-bold text-gray-900">עריכת עבודה</h2>
        <div className="w-16" />
      </div>
      <div className="px-5 py-5 space-y-4 pb-32">
        {/* Category selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">סוג פגישה</label>
          <div className="flex gap-1">
            {(["work", "quote", "followup"] as JobCategory[]).map(cat => {
              const cfg = categoryConfig(cat);
              return (
                <button key={cat} type="button" onClick={() => setJobCategory(cat)}
                  className={`flex-1 text-xs py-2 rounded-xl font-medium transition-colors ${jobCategory === cat ? cfg.btnActive : cfg.btnInactive}`}>
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">שם לקוח</label>
          <input value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))}
            autoComplete="name"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">כתובת</label>
          <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
            autoComplete="street-address"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">תאריך</label>
            <input type="date" dir="ltr" value={form.job_date} onChange={e => setForm(p => ({ ...p, job_date: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">שעה</label>
            <input type="time" value={form.job_time} onChange={e => setForm(p => ({ ...p, job_time: e.target.value }))} dir="ltr"
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">משך (שעות)</label>
            <input type="number" min="0.5" step="0.5" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))}
              autoComplete="off" inputMode="decimal"
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">מחיר (₪)</label>
            <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
              autoComplete="off" inputMode="decimal"
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            <div className="flex gap-1 mt-1.5">
              <button type="button" onClick={() => setPriceBeforeVat(false)}
                className={`flex-1 text-xs py-1 rounded-lg font-medium transition-colors ${!priceBeforeVat ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                כולל מע״מ
              </button>
              <button type="button" onClick={() => setPriceBeforeVat(true)}
                className={`flex-1 text-xs py-1 rounded-lg font-medium transition-colors ${priceBeforeVat ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                + מע״מ
              </button>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">הוצאות לעבודה (₪) <span className="text-xs text-gray-400 font-normal">— חומרים, דלק, עובדים</span></label>
          <input type="number" min="0" value={form.expenses} onChange={e => setForm(p => ({ ...p, expenses: e.target.value }))}
            autoComplete="off" inputMode="decimal"
            placeholder="0"
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">סוג עבודה</label>
            <input value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              autoComplete="off"
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">סטטוס</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as TaskStatus }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400">
              <option value="pending">ממתין</option>
              <option value="in_progress">בביצוע</option>
              <option value="completed">הושלם</option>
              <option value="cancelled">בוטל</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">הערות</label>
          <textarea rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            autoComplete="off"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
        </div>
        <button onClick={handleSave} disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-green-600 disabled:opacity-60 text-white font-bold rounded-2xl py-4 text-base">
          {saving ? <Loader2 size={18} className="animate-spin" /> : null}
          {saving ? "שומר..." : "שמור שינויים"}
        </button>
      </div>
    </div>
  );
}

function JobDetailModal({ job, onClose, onMarkCompleted, onDeleted, onEdited }: {
  job: Job; onClose: () => void; onMarkCompleted: (id: string) => void; onDeleted: (id: string) => void; onEdited: (updated: Job) => void;
}) {
  const colors = priorityColors(job.priority);
  const catColors = categoryConfig(job.jobCategory);
  const status = statusConfig(job.status);
  const headerColor = job.jobCategory !== "work" ? catColors.header : colors.header;
  const [completing, setCompleting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  async function handleComplete() {
    setCompleting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) { setCompleting(false); return; }

    // Single source of truth — same flow as the inline quick-complete on
    // the JobListCard. See lib/complete-job.ts for the full story.
    const result = await completeJobAndCreateTransactions(supabase, {
      id: job.id,
      customerId: job.customerId,
      customerName: job.customerName,
      type: job.type,
      address: job.address,
      date: job.date,
      price: job.price,
      priceBeforeVat: job.priceBeforeVat,
      expenses: job.expenses,
      notes: job.notes,
    }, user.id);

    setCompleting(false);
    if (result.ok) {
      onMarkCompleted(job.id);
      onClose();
    }
  }

  async function handleDelete() {
    // Soft-delete UX: hide the row immediately + show a 6-second undo
    // toast. Only after the toast expires do we hit Supabase. If the
    // user clicks "ביטול" we keep the row in place and skip the DB
    // call entirely. This is the same pattern Gmail uses for archive.
    onDeleted(job.id);
    onClose();

    let undone = false;
    toast.action({
      message: `${job.customerName} — נמחק`,
      description: "אפשר לבטל תוך 6 שניות",
      actionLabel: "ביטול",
      onAction: () => { undone = true; onEdited(job); },
      durationMs: 6000,
    });
    setTimeout(async () => {
      if (undone) return;
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("jobs").delete().eq("id", job.id).eq("user_id", user?.id);
    }, 6000);
  }

  async function handleCancel(reason: "no_show" | "force_majeure") {
    setDeleting(true);
    const { data: { user } } = await supabase.auth.getUser();
    let { error } = await supabase.from("jobs")
      .update({ status: "cancelled", cancellation_reason: reason })
      .eq("id", job.id).eq("user_id", user?.id);

    // Graceful fallback: if the cancellation_reason column was never
    // migrated, retry without it so the cancellation itself still goes
    // through. The reason is a "nice to have" — the operation isn't.
    // Internal error details stay in the console; the user only sees
    // a friendly toast.
    if (error && /cancellation_reason|column/i.test(error.message ?? "")) {
      console.warn("[schedule] cancellation_reason column missing, retrying without it");
      const retry = await supabase.from("jobs")
        .update({ status: "cancelled" })
        .eq("id", job.id).eq("user_id", user?.id);
      error = retry.error;
    }

    setDeleting(false);
    setShowCancelModal(false);

    if (error) {
      console.error("[schedule] failed to cancel job:", error);
      toast.error("לא הצלחנו לבטל את העבודה, נסה שוב בעוד רגע.");
      return;
    }

    onDeleted(job.id);
    onClose();
    const reasonLabel = reason === "no_show" ? "לא הופיע" : "בלת״מ";
    toast.success(`העבודה של ${job.customerName} סומנה כ"${reasonLabel}".`);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center pb-[88px] sm:pb-0" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-md sm:mx-4 rounded-3xl shadow-2xl max-h-[80vh] flex flex-col mx-2 sm:mx-4" dir="rtl">
        {/* Handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className={`${headerColor} px-6 py-4 sm:rounded-t-3xl flex items-center justify-between flex-shrink-0`}>
          <div>
            <h2 className="text-white font-bold text-lg">{job.customerName}</h2>
            <p className="text-white/80 text-sm">{job.type || "עבודת גינון"}</p>
          </div>
          <button onClick={onClose} aria-label="סגור" className="hit-44 text-white/80 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Badges */}
          <div className="flex gap-2 flex-wrap">
            <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
              {status.icon} {status.label}
            </span>
            {job.jobCategory !== "work" && (
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${catColors.badge}`}>
                {catColors.label}
              </span>
            )}
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
            <div className="text-left">
              <span className="font-bold text-xl text-gray-800">
                ₪{(job.priceBeforeVat ? job.price : Math.round(job.price / 1.18)).toLocaleString()}
              </span>
              <p className="text-xs text-gray-400">
                + מע&quot;מ · סה&quot;כ ₪{Math.round((job.priceBeforeVat ? job.price : Math.round(job.price / 1.18)) * 1.18).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Expenses & Profit */}
          {(job.expenses ?? 0) > 0 && (
            <div className="bg-orange-50 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">הוצאות לעבודה</span>
                <span className="font-bold text-base text-orange-700">
                  -₪{(job.expenses ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="border-t border-orange-200 pt-2 flex justify-between items-center">
                <span className="text-gray-700 text-sm font-semibold">רווח נטו (לפני מע״מ)</span>
                <span className="font-bold text-base text-green-700">
                  ₪{((job.priceBeforeVat ? job.price : Math.round(job.price / 1.18)) - (job.expenses ?? 0)).toLocaleString()}
                </span>
              </div>
            </div>
          )}

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
        </div>

        {/* Actions — always visible at bottom */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {job.status !== "completed" && job.status !== "cancelled" && (
            <button
              onClick={handleComplete}
              disabled={completing}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-2xl py-3 text-sm font-bold transition-colors"
            >
              {completing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={15} />}
              הושלם
            </button>
          )}
          <button onClick={() => setShowEdit(true)}
            className="flex-1 flex items-center justify-center gap-1.5 border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-2xl py-3 text-sm font-semibold transition-colors">
            <AlertCircle size={14} /> עריכה
          </button>
          <button
            onClick={() => setShowCancelModal(true)}
            disabled={deleting}
            className="w-11 flex items-center justify-center border border-red-200 text-red-400 hover:bg-red-50 rounded-2xl py-3 transition-colors"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <X size={16} />}
          </button>
        </div>

        {showEdit && (
          <EditJobModal job={job} onClose={() => setShowEdit(false)} onSaved={updated => { onEdited(updated); onClose(); }} />
        )}

        {/* Cancel/Delete Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && setShowCancelModal(false)}>
            <div className="bg-white w-full sm:max-w-sm sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col" dir="rtl">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900">מה לעשות עם העבודה?</h3>
                <button onClick={() => setShowCancelModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 space-y-2.5">
                <button
                  onClick={() => handleCancel("no_show")}
                  disabled={deleting}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 text-right transition-colors"
                >
                  <span className="text-2xl">⏰</span>
                  <div className="flex-1">
                    <p className="font-bold text-amber-800 text-sm">לקוח לא הופיע</p>
                    <p className="text-xs text-amber-600 mt-0.5">העבודה תסומן כמבוטלת. הלקוח יופיע באוטומציות לתיאום מחדש.</p>
                  </div>
                </button>

                <button
                  onClick={() => handleCancel("force_majeure")}
                  disabled={deleting}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 text-right transition-colors"
                >
                  <span className="text-2xl">⛈️</span>
                  <div className="flex-1">
                    <p className="font-bold text-blue-800 text-sm">בלת״מ</p>
                    <p className="text-xs text-blue-600 mt-0.5">בלתי מתוכנן (גשם, מחלה וכו&rsquo;). הלקוח יופיע באוטומציות לתיאום מחדש.</p>
                  </div>
                </button>

                <button
                  onClick={async () => {
                    if (await confirmDialog({
                      title: `למחוק לצמיתות את העבודה עם ${job.customerName}?`,
                      description: "פעולה זו לא ניתנת לביטול.",
                      confirmLabel: "מחק",
                      destructive: true,
                    })) {
                      handleDelete();
                      setShowCancelModal(false);
                    }
                  }}
                  disabled={deleting}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 border-red-200 bg-red-50 hover:bg-red-100 text-right transition-colors"
                >
                  <span className="text-2xl">🗑️</span>
                  <div className="flex-1">
                    <p className="font-bold text-red-800 text-sm">מחיקה לצמיתות</p>
                    <p className="text-xs text-red-600 mt-0.5">העבודה תמחק כליל מהמערכת. לא ניתן לשחזר.</p>
                  </div>
                </button>
              </div>
              <div className="px-5 py-4 border-t border-gray-100 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <button
                  onClick={() => setShowCancelModal(false)}
                  disabled={deleting}
                  className="w-full py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── New Job Modal ─────────────────────────────────────────────────────────────

function NewJobModal({ onClose, onCreated, defaultDate }: {
  onClose: () => void; onCreated: (job: Job) => void; defaultDate?: string;
}) {
  const [form, setForm] = useState({
    customer_name: "", address: "", job_date: defaultDate || formatDateISO(new Date()),
    job_time: "09:00", duration: "2", type: "", priority: "medium" as Priority, price: "", expenses: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobCategory, setJobCategory] = useState<JobCategory>("work");
  const [existingCustomers, setExistingCustomers] = useState<{ id: string; name: string; address: string; city: string; phone: string; monthly_price: number }[]>([]);
  const [showCustomerList, setShowCustomerList] = useState(false);
  // Initialise from the user's default-VAT preference (set in /settings).
  // If they never visited settings, getDefaultVatMode falls back to
  // "include" — the more common case for Israeli small businesses.
  const [priceVatType, setPriceVatType] = useState<"include" | "before">(() => getDefaultVatMode());

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("customers").select("id, name, address, city, phone, monthly_price")
        .eq("user_id", user.id).order("name")
        .then(({ data }) => {
          if (data) setExistingCustomers(data.map(c => ({
            id: String(c.id), name: String(c.name), address: String(c.address || ""),
            city: String(c.city || ""), phone: String(c.phone || ""), monthly_price: Number(c.monthly_price || 0),
          })));
        });
    });
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSelectCustomer(c: { id: string; name: string; address: string; city: string; monthly_price: number }) {
    const fullAddress = c.address && c.city
      ? `${c.address}, ${c.city}`
      : c.address || c.city || "";
    setForm(prev => ({
      ...prev,
      customer_name: c.name,
      address: fullAddress,
      price: c.monthly_price ? String(c.monthly_price) : prev.price,
    }));
    setShowCustomerList(false);
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!form.customer_name.trim()) { setError("שם לקוח חובה"); return; }
    setSaving(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: inserted, error: dbError } = await supabase.from("jobs").insert({
      customer_name: form.customer_name.trim(),
      address: form.address.trim() || null,
      job_date: form.job_date,
      job_time: form.job_time || null,
      duration: parseFloat(form.duration) || 1,
      type: form.type.trim() || null,
      priority: form.priority,
      price: parseFloat(form.price) || 0,
      price_before_vat: priceVatType === "before",
      expenses: parseFloat(form.expenses) || 0,
      notes: form.notes.trim() || null,
      status: "pending",
      assigned_to: [],
      job_category: jobCategory,
      user_id: user?.id,
    }).select().single();
    if (dbError || !inserted) { setError("שגיאה: " + (dbError?.message ?? "שמירה נכשלה")); setSaving(false); return; }

    onCreated({
      id: inserted.id, customerId: inserted.customer_id ?? null, customerName: inserted.customer_name ?? "",
      address: inserted.address ?? "", date: inserted.job_date, time: (inserted.job_time ?? "00:00").slice(0, 5),
      duration: Number(inserted.duration), type: inserted.type ?? "", status: inserted.status as TaskStatus,
      assignedTo: inserted.assigned_to ?? [], price: Number(inserted.price),
      priceBeforeVat: Boolean(inserted.price_before_vat),
      expenses: Number(inserted.expenses ?? 0),
      notes: inserted.notes ?? undefined,
      priority: (inserted.priority ?? "medium") as Priority,
      jobCategory: (inserted.job_category ?? "work") as JobCategory,
    });
    setSaving(false);
    onClose();
  }

  return (
    // Full-screen on mobile — most reliable approach for iOS
    <div className="fixed inset-0 z-[70] bg-white overflow-y-auto" dir="rtl" role="dialog" aria-modal="true">

      {/* Top nav bar — always visible, never hidden by keyboard */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 font-medium text-sm px-2 py-1"
        >
          ביטול
        </button>
        <h2 className="text-base font-bold text-gray-900">עבודה חדשה</h2>
        <div className="w-16" />
      </div>

      {/* Form fields */}
      <div className="px-5 py-5 space-y-4 pb-32">
        {/* Job category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">סוג פגישה</label>
          <div className="flex gap-1">
            {(["work", "quote", "followup"] as JobCategory[]).map(cat => {
              const cfg = categoryConfig(cat);
              return (
                <button key={cat} type="button" onClick={() => setJobCategory(cat)}
                  className={`flex-1 text-xs py-2.5 rounded-xl font-medium transition-colors ${jobCategory === cat ? cfg.btnActive : cfg.btnInactive}`}>
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-gray-700">שם לקוח *</label>
            <a href="/customers" target="_blank"
              className="text-xs text-green-600 font-medium flex items-center gap-1 hover:underline">
              <Plus size={12} /> הוסף לקוח חדש
            </a>
          </div>
          <div className="relative">
            <input
              name="customer_name"
              type="text"
              autoComplete="name"
              value={form.customer_name}
              onChange={e => { handleChange(e); setShowCustomerList(true); }}
              onFocus={() => setShowCustomerList(true)}
              onBlur={() => setTimeout(() => setShowCustomerList(false), 150)}
              placeholder="הקלד שם לקוח..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            {/* Suggestions dropdown */}
            {showCustomerList && form.customer_name.length > 0 && (
              <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto">
                {existingCustomers
                  .filter(c => c.name.includes(form.customer_name) || c.address.includes(form.customer_name))
                  .map(c => (
                    <button key={c.id} type="button"
                      onMouseDown={() => handleSelectCustomer(c)}
                      className="w-full text-right px-4 py-3 hover:bg-green-50 border-b border-gray-50 last:border-0 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                        {c.address && <p className="text-xs text-gray-400">{c.address}</p>}
                      </div>
                      {c.monthly_price > 0 && <span className="text-xs text-green-600 font-medium">₪{c.monthly_price.toLocaleString()}</span>}
                    </button>
                  ))
                }
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">כתובת</label>
          <input name="address" value={form.address} onChange={handleChange}
            autoComplete="street-address"
            placeholder="רחוב הורד 12, רעננה"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">תאריך *</label>
            <input name="job_date" type="date" value={form.job_date} onChange={handleChange} dir="ltr"
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">שעה</label>
            <input name="job_time" type="time" value={form.job_time} onChange={handleChange} dir="ltr"
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">משך (שעות)</label>
            <input name="duration" type="number" min="0.5" step="0.5" value={form.duration} onChange={handleChange}
              autoComplete="off" inputMode="decimal"
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">מחיר (₪)</label>
            <input name="price" type="number" min="0" value={form.price} onChange={handleChange} placeholder="350"
              autoComplete="off" inputMode="decimal"
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            <div className="flex gap-1 mt-1.5">
              <button type="button" onClick={() => setPriceVatType("include")}
                className={`flex-1 text-xs py-1 rounded-lg font-medium transition-colors ${priceVatType === "include" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                כולל מע״מ
              </button>
              <button type="button" onClick={() => setPriceVatType("before")}
                className={`flex-1 text-xs py-1 rounded-lg font-medium transition-colors ${priceVatType === "before" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                + מע״מ
              </button>
            </div>
            {form.price && parseFloat(form.price) > 0 && priceVatType === "before" && (
              <p className="text-xs text-gray-400 mt-1">
                סה״כ כולל מע״מ: ₪{Math.round(parseFloat(form.price) * 1.18).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">הוצאות לעבודה (₪) <span className="text-xs text-gray-400 font-normal">— חומרים, דלק, עובדים</span></label>
          <input name="expenses" type="number" min="0" value={form.expenses} onChange={handleChange} placeholder="0"
            autoComplete="off" inputMode="decimal"
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">סוג עבודה</label>
            <input name="type" value={form.type} onChange={handleChange} placeholder="גיזום, השקיה..."
              autoComplete="off"
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">עדיפות</label>
            <select name="priority" value={form.priority} onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white">
              <option value="low">נמוך</option>
              <option value="medium">בינוני</option>
              <option value="high">גבוה</option>
              <option value="urgent">דחוף</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">הערות</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
            autoComplete="off"
            placeholder="הערות נוספות..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

        {/* Big save button at bottom of content */}
        <button
          type="button"
          disabled={saving}
          onClick={handleSubmit}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold rounded-2xl py-4 text-base mt-4"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          {saving ? "שומר..." : "הוסף עבודה"}
        </button>
      </div>
    </div>
  );
}

// ── Job Card (list view) ──────────────────────────────────────────────────────

function JobListCard({ job, onClick, onMarkCompleted, onNoteUpdated }: { job: Job; onClick: () => void; onMarkCompleted: (id: string) => void; onNoteUpdated: (id: string, notes: string) => void }) {
  const catColors = categoryConfig(job.jobCategory);
  const status = statusConfig(job.status);
  const [completing, setCompleting] = useState(false);

  // Inline-notes state. Local mirror of job.notes so we can show
  // pending edits without a round-trip; saves to Supabase on blur.
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(job.notes ?? "");
  const [noteSaving, setNoteSaving] = useState(false);

  // Re-seed the draft when the underlying job prop changes (e.g. after a
  // refresh) so we don't show stale text.
  useEffect(() => {
    setNoteDraft(job.notes ?? "");
  }, [job.notes]);

  async function saveNote() {
    const trimmed = noteDraft.trim();
    if (trimmed === (job.notes ?? "").trim()) {
      // Nothing to save — just collapse if empty.
      if (!trimmed) setNoteOpen(false);
      return;
    }
    setNoteSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) { setNoteSaving(false); return; }
    const { error } = await supabase
      .from("jobs")
      .update({ notes: trimmed || null })
      .eq("id", job.id)
      .eq("user_id", user.id);
    setNoteSaving(false);
    if (error) {
      toast.error("שגיאה בשמירת ההערה");
      return;
    }
    onNoteUpdated(job.id, trimmed);
    if (!trimmed) setNoteOpen(false);
  }
  // Minimalist card with inline quick actions. Status is a 6px dot, border
  // is a single hairline. The action row at the bottom keeps Waze + Done
  // one tap away so a gardener never has to open the detail modal just to
  // navigate or close out a job.
  const dotColor =
    job.priority === "urgent"   ? "bg-red-500" :
    job.priority === "high"     ? "bg-orange-400" :
    job.jobCategory === "quote" ? "bg-purple-500" :
    job.jobCategory === "followup" ? "bg-amber-400" :
    job.status === "completed"  ? "bg-gray-300" :
                                  "bg-emerald-500";
  const isCompleted = job.status === "completed";
  const isCancelled = job.status === "cancelled";
  // The contact actions (Waze / call / WhatsApp) are always visible —
  // gardener wants the customer's "contact card" inline on the row.
  // The "סיים" action stays gated to active jobs (no point on completed
  // ones). At least one of the actions is showable as long as we have a
  // phone or address.
  const hasContactActions = !!job.address || !!job.customerPhone;

  async function handleQuickComplete(e: React.MouseEvent) {
    e.stopPropagation();
    if (completing) return;
    setCompleting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) { setCompleting(false); toast.error("שגיאה בעדכון הסטטוס"); return; }

    // Use the shared helper so we ALWAYS create the pending-income
    // transaction (was the bug before: tapping "סיים" marked the job
    // done but the customer never appeared under "חובות פתוחים").
    const result = await completeJobAndCreateTransactions(supabase, {
      id: job.id,
      customerId: job.customerId,
      customerName: job.customerName,
      type: job.type,
      address: job.address,
      date: job.date,
      price: job.price,
      priceBeforeVat: job.priceBeforeVat,
      expenses: job.expenses,
      notes: job.notes,
    }, user.id);

    setCompleting(false);
    if (!result.ok) {
      toast.error("שגיאה בעדכון הסטטוס");
      return;
    }
    onMarkCompleted(job.id);
    if (result.closedProject) {
      toast.success("העבודה הושלמה", "הפרויקט נסגר אוטומטית · נוצרה תנועת תשלום ממתינה");
    } else if (result.createdIncomeTransaction) {
      toast.success("העבודה הושלמה", "נוצרה תנועת תשלום ממתינה בפיננסים");
    } else {
      toast.success("העבודה סומנה כהושלמה");
    }
  }

  function handleWaze(e: React.MouseEvent) {
    e.stopPropagation();
    if (!job.address) return;
    window.open(`https://waze.com/ul?q=${encodeURIComponent(job.address)}`, "_blank");
  }

  function handleCall(e: React.MouseEvent) {
    e.stopPropagation();
    if (!job.customerPhone) return;
    window.location.href = `tel:${job.customerPhone}`;
  }

  function handleWhatsApp(e: React.MouseEvent) {
    e.stopPropagation();
    if (!job.customerPhone) return;
    const cleaned = job.customerPhone.replace(/\D/g, "");
    const intl = cleaned.startsWith("0") ? "972" + cleaned.slice(1)
               : cleaned.startsWith("972") ? cleaned
               : cleaned;
    window.open(`https://api.whatsapp.com/send?phone=${intl}`, "_blank");
  }

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      className="group w-full text-right bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer overflow-hidden"
    >
      <div className="flex items-center gap-4 p-4">
        {/* Time column with status dot */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0 w-14">
          <span className={`text-base font-bold tabular-nums ${isCompleted || isCancelled ? "text-gray-400" : "text-gray-900"}`}>
            {job.time}
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} aria-hidden />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <h3 className={`font-semibold text-[15px] truncate ${isCompleted ? "text-gray-500 line-through" : "text-gray-900"}`}>
              {job.customerName}
            </h3>
            {job.priority === "urgent" && !isCompleted && !isCancelled && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                <AlertCircle size={9} /> דחוף
              </span>
            )}
            {job.jobCategory !== "work" && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${catColors.badge}`}>
                {catColors.label.replace(/^[^\s]+\s/, "")}
              </span>
            )}
            {isCancelled && (
              <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">בוטל</span>
            )}
          </div>
          <p className="text-xs text-gray-500 leading-tight truncate">
            {job.type || "עבודת גינון"}
            {job.duration ? ` · ${job.duration} ש׳` : ""}
            {job.address ? ` · ${job.address.split(",")[0]}` : ""}
          </p>
        </div>

        {/* Price column */}
        <div className="text-left flex-shrink-0">
          <p className={`font-bold text-[15px] tabular-nums ${isCompleted || isCancelled ? "text-gray-400" : "text-gray-900"}`}>
            ₪{(job.priceBeforeVat ? job.price : Math.round(job.price / 1.18)).toLocaleString()}
          </p>
          {!isCompleted && !isCancelled && (
            <p className="text-[10px] text-gray-400 leading-none mt-0.5">{status.label}</p>
          )}
        </div>
      </div>

      {/* Inline notes — gardener wants to jot down quick reminders for
          a specific job ("גוזם בצד ימין", "כלב בחצר", "השער נעול").
          Closed by default to keep the row compact; click to expand.
          Existing notes appear as a single-line summary chip until
          clicked, then a textarea opens for editing. Saves on blur. */}
      {(job.notes || noteOpen) && (
        <div className="border-t border-gray-100 bg-amber-50/30 px-4 py-2.5">
          {noteOpen ? (
            <div>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onBlur={saveNote}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    (e.target as HTMLTextAreaElement).blur();
                  }
                  if (e.key === "Escape") {
                    setNoteDraft(job.notes ?? "");
                    setNoteOpen(false);
                  }
                  e.stopPropagation();
                }}
                placeholder="הערה לטיפול הזה — למשל: השער נעול, כלב בחצר, גוזם בצד ימין..."
                rows={2}
                autoComplete="off"
                autoFocus
                className="w-full bg-white border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-gray-400">
                  {noteSaving ? "שומר..." : "נשמר אוטומטית"}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); (document.activeElement as HTMLElement)?.blur?.(); }}
                  className="text-[10px] font-semibold text-amber-700 hover:text-amber-900"
                >
                  סגור
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setNoteOpen(true); }}
              className="w-full flex items-start gap-1.5 text-right text-[11px] text-amber-800 leading-tight"
            >
              <StickyNote size={11} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="truncate">{job.notes}</span>
            </button>
          )}
        </div>
      )}

      {/* "Add note" affordance — visible whenever there are no notes yet
          and the user hasn't already opened the editor. */}
      {!job.notes && !noteOpen && (
        <button
          onClick={(e) => { e.stopPropagation(); setNoteOpen(true); }}
          className="w-full border-t border-gray-100 px-4 py-1.5 flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-amber-700 hover:bg-amber-50/30 transition-colors text-right"
        >
          <StickyNote size={10} className="flex-shrink-0" />
          <span>הוסף הערה לטיפול</span>
        </button>
      )}

      {/* Inline quick actions — customer contact card style. Waze + Phone
          + WhatsApp are always visible (even on completed/cancelled jobs)
          because the gardener still wants to call/text them. "סיים" only
          appears on active jobs since there's nothing to complete on a
          finished one. */}
      {(hasContactActions || (!isCompleted && !isCancelled)) && (
        <div className="flex items-stretch gap-px bg-gray-100 border-t border-gray-100">
          {job.address && (
            <button
              onClick={handleWaze}
              title="נווט עם Waze"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white hover:bg-blue-50 text-blue-600 text-xs font-semibold transition-colors"
            >
              <MapPin size={13} /> נווט
            </button>
          )}
          {job.customerPhone && (
            <button
              onClick={handleCall}
              title="התקשר"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-colors"
            >
              <Phone size={13} /> התקשר
            </button>
          )}
          {job.customerPhone && (
            <button
              onClick={handleWhatsApp}
              title="WhatsApp"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white hover:bg-emerald-50 text-emerald-600 text-xs font-semibold transition-colors"
            >
              <MessageCircle size={13} /> וואטסאפ
            </button>
          )}
          {!isCompleted && !isCancelled && (
            <button
              onClick={handleQuickComplete}
              disabled={completing}
              title="סמן כהושלם"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-bold transition-colors disabled:opacity-60"
            >
              {completing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
              סיים
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

// Wrapper provides the Suspense boundary required by useSearchParams in
// Next.js 16. The real component lives in SchedulePageInner.
export default function SchedulePage() {
  return (
    <Suspense fallback={null}>
      <SchedulePageInner />
    </Suspense>
  );
}

function SchedulePageInner() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedISO, setSelectedISO] = useState(() => formatDateISO(new Date()));
  const [view, setView] = useState<"day" | "week" | "month">("day");

  // Backfill state — completed jobs from before lib/complete-job.ts existed
  // that never got a pending-income transaction. See findOrphanCompletedJobs.
  const [orphans, setOrphans] = useState<CompletedJobLite[]>([]);
  const [backfilling, setBackfilling] = useState(false);

  const today = useMemo(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d;
  }, []);
  const todayISO = formatDateISO(today);

  // Current displayed month
  const displayMonth = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    return d;
  }, [today, monthOffset]);

  // All days to show in the month grid (including padding days from prev/next month)
  const calendarDays = useMemo(() => {
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    return days;
  }, [displayMonth]);

  useEffect(() => { fetchJobs(); }, []);

  // Deep-link from the global Header search: /schedule?focus=jobId opens
  // that job's detail modal once jobs are loaded. Also jumps the calendar
  // to the job's month so the user sees it in context.
  useEffect(() => {
    if (!focusId || jobs.length === 0) return;
    const job = jobs.find(j => j.id === focusId);
    if (!job) return;
    setSelectedJob(job);
    const jobDate = new Date(job.date + "T00:00:00");
    const now = new Date();
    const diffMonths = (jobDate.getFullYear() - now.getFullYear()) * 12 + (jobDate.getMonth() - now.getMonth());
    setMonthOffset(diffMonths);
    setSelectedISO(job.date);
  }, [focusId, jobs]);

  async function fetchJobs() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    // Load jobs and customers in parallel — we use customer addresses as a
    // fallback when the job row itself has no address (e.g. recurring jobs
    // booked from the customers page where customer.address was empty at
    // booking time but later filled in). We also fetch income transactions
    // so we can spot orphan completed jobs that never created a transaction.
    const [jobsRes, custRes, txRes] = await Promise.all([
      supabase.from("jobs").select("*").eq("user_id", user?.id).order("job_date").order("job_time"),
      supabase.from("customers").select("id, name, address, city, phone").eq("user_id", user?.id),
      supabase.from("transactions")
        .select("customer_name, type, description, transaction_date, amount")
        .eq("user_id", user?.id)
        .eq("type", "income"),
    ]);
    const customers = custRes.data ?? [];
    const addrById = new Map<string, string>();
    const addrByName = new Map<string, string>();
    // Phone lookups — keyed by id AND by name so legacy jobs without a
    // customer_id still get the actions inline on the card.
    const phoneById = new Map<string, string>();
    const phoneByName = new Map<string, string>();
    for (const c of customers) {
      const full = [c.address, c.city].filter(Boolean).join(", ");
      if (full) {
        if (c.id) addrById.set(String(c.id), full);
        if (c.name) addrByName.set(String(c.name), full);
      }
      if (c.phone) {
        if (c.id) phoneById.set(String(c.id), String(c.phone));
        if (c.name) phoneByName.set(String(c.name), String(c.phone));
      }
    }

    if (jobsRes.data) {
      const mapped = jobsRes.data.map(row => {
        const stored = (row.address ?? "").trim();
        const fallback =
          (row.customer_id && addrById.get(String(row.customer_id))) ||
          (row.customer_name && addrByName.get(String(row.customer_name))) ||
          "";
        const phone =
          (row.customer_id && phoneById.get(String(row.customer_id))) ||
          (row.customer_name && phoneByName.get(String(row.customer_name))) ||
          "";
        return {
          id: row.id, customerId: row.customer_id ?? null,
          customerName: row.customer_name ?? "",
          customerPhone: phone || undefined,
          address: stored || fallback,
          date: row.job_date, time: (row.job_time ?? "00:00").slice(0, 5),
          duration: Number(row.duration), type: row.type ?? "",
          status: row.status as TaskStatus, assignedTo: row.assigned_to ?? [],
          price: Number(row.price), priceBeforeVat: Boolean(row.price_before_vat),
          expenses: Number(row.expenses ?? 0),
          cancellationReason: (row.cancellation_reason ?? null) as CancellationReason,
          notes: row.notes ?? undefined,
          priority: (row.priority ?? "medium") as Priority,
          jobCategory: (row.job_category ?? "work") as JobCategory,
        };
      });
      setJobs(mapped);

      // Orphan detection — completed standalone jobs that never created a
      // pending-income transaction. Limited to the last 90 days so we
      // don't propose backfilling a project from 2024.
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const cutoffISO = ninetyDaysAgo.toISOString().split("T")[0];
      const recentCompleted: CompletedJobLite[] = mapped
        .filter(j => j.status === "completed" && j.date >= cutoffISO && j.price > 0)
        .map(j => ({
          id: j.id,
          customerId: j.customerId,
          customerName: j.customerName,
          date: j.date,
          type: j.type,
          address: j.address,
          price: j.price,
          priceBeforeVat: j.priceBeforeVat,
          notes: j.notes,
          status: j.status,
        }));
      const found = findOrphanCompletedJobs(recentCompleted, txRes.data ?? []);
      setOrphans(found);
    }
    setLoading(false);
  }

  async function handleBackfill() {
    if (orphans.length === 0 || backfilling) return;
    setBackfilling(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      setBackfilling(false);
      toast.error("שגיאה — לא מחובר");
      return;
    }
    const result = await backfillCompletedJobTransactions(supabase, orphans, user.id);
    setBackfilling(false);
    if (result.created > 0) {
      toast.success(
        `${result.created} תנועות תשלום נוצרו`,
        "הלקוחות יופיעו עכשיו ב'חובות פתוחים'",
      );
      setOrphans([]);
    } else if (result.failed > 0) {
      toast.error(`${result.failed} תנועות נכשלו`);
    }
  }

  function handleJobCreated(job: Job) {
    setJobs(prev => [...prev, job].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)));
    // Navigate the calendar to the new job's date so the user sees it immediately,
    // even if it's in a different month than the current view.
    setSelectedISO(job.date);
    const jobDate = new Date(job.date + "T00:00:00");
    const diffMonths = (jobDate.getFullYear() - today.getFullYear()) * 12
      + (jobDate.getMonth() - today.getMonth());
    setMonthOffset(diffMonths);
  }

  function handleMarkCompleted(id: string) {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: "completed" as TaskStatus } : j));
  }

  function handleJobDeleted(id: string) {
    setJobs(prev => prev.filter(j => j.id !== id));
  }

  function handleJobEdited(updated: Job) {
    setJobs(prev => prev.map(j => j.id === updated.id ? updated : j));
  }

  function handleNoteUpdated(id: string, notes: string) {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, notes: notes || undefined } : j));
  }

  const selectedDate = useMemo(() => new Date(selectedISO + "T00:00:00"), [selectedISO]);

  const selectedDayJobs = useMemo(
    () => jobs.filter(j => j.date === selectedISO).sort((a, b) => a.time.localeCompare(b.time)),
    [jobs, selectedISO]
  );

  const dayRevenue = selectedDayJobs.reduce((s, j) => s + (j.priceBeforeVat ? j.price : Math.round(j.price / 1.18)), 0);
  const dayCompleted = selectedDayJobs.filter(j => j.status === "completed").length;
  const selectedDayHoliday = getHoliday(selectedISO);

  // Week-view scaffolding — derive Sun..Sat for the week containing selectedISO.
  const weekDays = useMemo(() => {
    const ref = new Date(selectedISO + "T00:00:00");
    const start = new Date(ref);
    start.setDate(ref.getDate() - ref.getDay()); // Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [selectedISO]);

  // Day view: timeline of the selected day's jobs ordered by time.
  // We just bin by time-string asc — the selectedDayJobs are already sorted.

  // Header date label, contextual to the active view.
  const headerDateLabel =
    view === "day"
      ? `${HEBREW_DAYS_FULL[selectedDate.getDay()]} · ${selectedDate.getDate()} ${HEBREW_MONTHS[selectedDate.getMonth()]}`
      : view === "week"
      ? `${weekDays[0].getDate()}–${weekDays[6].getDate()} ${HEBREW_MONTHS[weekDays[6].getMonth()]}`
      : `${HEBREW_MONTHS[displayMonth.getMonth()]} ${displayMonth.getFullYear()}`;

  function navigateDate(direction: -1 | 1) {
    if (view === "day") {
      const d = new Date(selectedISO + "T00:00:00");
      d.setDate(d.getDate() + direction);
      setSelectedISO(formatDateISO(d));
    } else if (view === "week") {
      const d = new Date(selectedISO + "T00:00:00");
      d.setDate(d.getDate() + (direction * 7));
      setSelectedISO(formatDateISO(d));
    } else {
      setMonthOffset(o => o + direction);
    }
  }

  function jumpToToday() {
    setSelectedISO(todayISO);
    setMonthOffset(0);
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]" dir="rtl">
      {/* ── Sticky header — quiet, minimal ────────────────────────────────────
          Notion / Linear feel: small title, secondary metadata under it,
          subtle refresh button, no big CTA in the bar (the FAB handles add). */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-screen-md mx-auto px-4 sm:px-6 pt-4 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">יומן</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {selectedDayJobs.length === 0
                  ? "אין עבודות ליום זה"
                  : `${selectedDayJobs.length} ${selectedDayJobs.length === 1 ? "עבודה" : "עבודות"} · ₪${dayRevenue.toLocaleString()}${dayCompleted > 0 ? ` · ${dayCompleted} הושלמו` : ""}`}
              </p>
            </div>
            <button
              onClick={() => fetchJobs()}
              className="hit-44 p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              aria-label="רענן"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* View tabs + date navigator */}
          <div className="flex items-center justify-between gap-3 mt-4">
            <div className="inline-flex items-center bg-gray-100 rounded-lg p-0.5">
              {(["day","week","month"] as const).map(v => {
                const label = v === "day" ? "יום" : v === "week" ? "שבוע" : "חודש";
                const active = view === v;
                return (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      active ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1">
              {(view !== "month" && selectedISO !== todayISO) || (view === "month" && monthOffset !== 0) ? (
                <button
                  onClick={jumpToToday}
                  className="text-[11px] font-semibold text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
                >
                  היום
                </button>
              ) : null}
              <button
                onClick={() => navigateDate(-1)}
                aria-label="קודם"
                className="hit-44 p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
              <span className="text-sm font-semibold text-gray-700 min-w-[140px] text-center tabular-nums">
                {headerDateLabel}
              </span>
              <button
                onClick={() => navigateDate(1)}
                aria-label="הבא"
                className="hit-44 p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <main className="max-w-screen-md mx-auto px-4 sm:px-6 py-5 pb-28">

        {/* Backfill banner — only shows when we detect completed jobs from
            the last 90 days that never produced a pending-income transaction.
            One tap → all the missing transactions get created. */}
        {orphans.length > 0 && !loading && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0 border border-amber-100">
              <AlertCircle size={16} className="text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-amber-900 leading-tight">
                {orphans.length} {orphans.length === 1 ? "עבודה שהושלמה" : "עבודות שהושלמו"} ללא תנועה כספית
              </p>
              <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                {orphans.slice(0, 3).map(o => o.customerName).filter(Boolean).join(", ")}
                {orphans.length > 3 ? ` ועוד ${orphans.length - 3}` : ""}
                {" · "}לחץ כדי ליצור תנועות תשלום ממתינות בפיננסים
              </p>
              <button
                onClick={handleBackfill}
                disabled={backfilling}
                className="mt-2.5 inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
              >
                {backfilling ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                {backfilling ? "יוצר..." : `צור ${orphans.length} תנועות`}
              </button>
            </div>
          </div>
        )}

        {/* DAY VIEW — single column timeline of the selected day */}
        {view === "day" && (
          <div className="space-y-3">
            {selectedDayHoliday && (
              <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${holidayStyle(selectedDayHoliday.type).pill} flex items-center gap-1.5`}>
                <span>📅</span> {selectedDayHoliday.name}
              </div>
            )}
            {loading ? (
              <SkeletonList rows={3} />
            ) : selectedDayJobs.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <Calendar size={22} className="text-gray-300" />
                </div>
                <p className="text-sm text-gray-500 font-medium">אין עבודות ליום זה</p>
                <p className="text-xs text-gray-400 mt-1">הוסף עבודה חדשה ב-+ למטה</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayJobs.map(job => (
                  <JobListCard key={job.id} job={job} onClick={() => setSelectedJob(job)} onMarkCompleted={handleMarkCompleted} onNoteUpdated={handleNoteUpdated} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* WEEK VIEW — 7-column strip + details panel below.
            Tapping a day selects it but DOESN'T leave the week view — the
            user keeps the full week visible while drilling into the day's
            details below. Each cell shows: top-right = day name (ב׳),
            top-left = date (11/5), and the count of jobs that day. */}
        {view === "week" && (
          <div className="space-y-4">
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {weekDays.map((day) => {
                const iso = formatDateISO(day);
                const isToday = iso === todayISO;
                const isSelected = iso === selectedISO;
                const dayJobs = jobs.filter(j => j.date === iso);
                const holiday = getHoliday(iso);
                const dateLabel = `${day.getDate()}/${day.getMonth() + 1}`;
                return (
                  <button
                    key={iso}
                    onClick={() => setSelectedISO(iso)}
                    className={`relative flex flex-col rounded-xl p-2 min-h-[88px] text-right transition-all ${
                      isSelected ? "bg-gray-900 text-white shadow-md" :
                      isToday   ? "bg-emerald-50 ring-1 ring-emerald-200" :
                                  "bg-white border border-gray-100 hover:border-gray-300"
                    }`}
                  >
                    {/* Top row: day-name on the right, date on the left */}
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs sm:text-sm font-bold ${
                        isSelected ? "text-white" :
                        isToday   ? "text-emerald-700" :
                                    "text-gray-900"
                      }`}>
                        {HEBREW_DAYS_SHORT[day.getDay()]}
                      </span>
                      <span className={`text-[10px] sm:text-[11px] font-medium tabular-nums ${
                        isSelected ? "text-white/70" : "text-gray-400"
                      }`}>
                        {dateLabel}
                      </span>
                    </div>

                    {/* Job count + holiday hint */}
                    <div className="mt-auto pt-1.5 flex items-end justify-between gap-1">
                      {dayJobs.length > 0 ? (
                        <span className={`text-[10px] sm:text-xs font-semibold ${
                          isSelected ? "text-white/90" :
                          isToday   ? "text-emerald-700" :
                                      "text-gray-700"
                        }`}>
                          {dayJobs.length} {dayJobs.length === 1 ? "עבודה" : "עבודות"}
                        </span>
                      ) : (
                        <span className={`text-[10px] ${isSelected ? "text-white/40" : "text-gray-300"}`}>—</span>
                      )}
                      {holiday && (
                        <span
                          aria-label={holiday.name}
                          title={holiday.name}
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            isSelected ? "bg-white/70" :
                            holiday.type === "major" || holiday.type === "memorial" ? "bg-amber-400" : "bg-blue-400"
                          }`}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Details panel for the selected day — same content as day view,
                but presented INSIDE week view so the gardener never loses
                the week context. */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-50">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    יום {HEBREW_DAYS_FULL[selectedDate.getDay()]}
                  </h3>
                  <p className="text-xs text-gray-400 tabular-nums mt-0.5" dir="ltr">
                    {selectedDate.getDate()}/{selectedDate.getMonth() + 1}/{selectedDate.getFullYear()}
                  </p>
                </div>
                {selectedDayJobs.length > 0 && (
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-900 tabular-nums">
                      ₪{dayRevenue.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {selectedDayJobs.length} {selectedDayJobs.length === 1 ? "עבודה" : "עבודות"}
                      {dayCompleted > 0 ? ` · ${dayCompleted} הושלמו` : ""}
                    </p>
                  </div>
                )}
              </div>

              {selectedDayHoliday && (
                <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${holidayStyle(selectedDayHoliday.type).pill} flex items-center gap-1.5`}>
                  <span>📅</span> {selectedDayHoliday.name}
                </div>
              )}

              {loading ? (
                <SkeletonList rows={2} />
              ) : selectedDayJobs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-gray-50 flex items-center justify-center">
                    <Calendar size={18} className="text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">אין עבודות ביום זה</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDayJobs.map(job => (
                    <JobListCard
                      key={job.id}
                      job={job}
                      onClick={() => setSelectedJob(job)}
                      onMarkCompleted={handleMarkCompleted}
                      onNoteUpdated={handleNoteUpdated}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MONTH VIEW — kept the original calendar, softer palette */}
        {view === "month" && (
          <div>
            <div className="grid grid-cols-7 mb-1.5">
              {["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"].map((d) => (
                <div key={d} className="text-center text-[10px] font-semibold py-1 tracking-wide text-gray-400">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} />;
                const iso = formatDateISO(day);
                const isToday = iso === todayISO;
                const isSelected = iso === selectedISO;
                const dayJobs = jobs.filter(j => j.date === iso);
                const hasJobs = dayJobs.length > 0;
                const holiday = getHoliday(iso);

                const bgClass = isSelected
                  ? "bg-gray-900 text-white"
                  : isToday
                  ? "bg-emerald-50 ring-1 ring-emerald-200"
                  : "bg-white hover:bg-gray-50 border border-transparent hover:border-gray-100";

                const dateColor = isSelected
                  ? "text-white"
                  : isToday
                  ? "text-emerald-700"
                  : "text-gray-800";

                return (
                  <button
                    key={iso}
                    onClick={() => {
                      setSelectedISO(iso);
                      // Tap a day in month view → jump to day view, classic Apple Calendar pattern
                      if (hasJobs) setView("day");
                    }}
                    className={`relative flex flex-col items-center justify-start min-h-[52px] py-1.5 px-0.5 rounded-lg transition-all ${bgClass}`}
                  >
                    <span className={`text-sm font-bold leading-tight ${dateColor}`}>
                      {day.getDate()}
                    </span>
                    {holiday && (
                      <span className={`text-[8px] leading-tight font-semibold mt-0.5 truncate w-full px-0.5 ${
                        isSelected ? "text-white/80" : holidayStyle(holiday.type).text
                      }`}>
                        {holiday.name}
                      </span>
                    )}
                    {hasJobs && (
                      <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-0.5">
                        {dayJobs.slice(0, 3).map((j, idx) => (
                          <div key={idx} className={`w-1 h-1 rounded-full ${
                            isSelected ? "bg-white" :
                            j.priority === "urgent" ? "bg-red-500" :
                            j.status === "completed" ? "bg-gray-300" :
                            "bg-emerald-500"
                          }`} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── Floating add button — gentle, not shouty ────────────────────────
          Sits above the BottomNav (which is ~64px tall + safe area) so it
          never overlaps. Soft shadow, dark surface for contrast against the
          near-white background. */}
      <button
        onClick={() => setShowNewJobModal(true)}
        aria-label="הוסף עבודה חדשה"
        className="fixed bottom-[max(80px,env(safe-area-inset-bottom))] left-5 z-30 w-14 h-14 rounded-2xl bg-gray-900 text-white shadow-lg shadow-gray-900/20 hover:bg-gray-800 hover:shadow-xl active:scale-95 transition-all flex items-center justify-center md:bottom-6"
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>

      {/* Modals */}
      {selectedJob && (
        <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} onMarkCompleted={handleMarkCompleted} onDeleted={handleJobDeleted} onEdited={handleJobEdited} />
      )}
      {showNewJobModal && (
        <NewJobModal onClose={() => setShowNewJobModal(false)} onCreated={handleJobCreated} defaultDate={selectedISO} />
      )}
    </div>
  );
}
