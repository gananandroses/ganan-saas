"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Clock, MapPin, User, X,
  Calendar, AlertCircle, Loader2, CheckCircle, Circle, Phone, RefreshCw, ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

// ── types ─────────────────────────────────────────────────────────────────────

type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
type Priority = "low" | "medium" | "high" | "urgent";
type JobCategory = "work" | "quote" | "followup";

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
  priceBeforeVat: boolean;
  notes?: string;
  priority: Priority;
  jobCategory: JobCategory;
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
      notes: form.notes.trim() || null,
      status: form.status,
      job_category: jobCategory,
    };
    await supabase.from("jobs").update(payload).eq("id", job.id).eq("user_id", user?.id);
    onSaved({ ...job, ...payload, customerName: payload.customer_name, address: payload.address ?? "", priceBeforeVat, jobCategory, time: (payload.job_time ?? "00:00").slice(0,5), date: payload.job_date, duration: payload.duration, type: payload.type ?? "", notes: payload.notes ?? undefined, status: payload.status as TaskStatus, priority: payload.priority as Priority });
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] bg-white overflow-y-auto" dir="rtl">
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
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">כתובת</label>
          <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
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
            <input type="time" value={form.job_time} onChange={e => setForm(p => ({ ...p, job_time: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">משך (שעות)</label>
            <input type="number" min="0.5" step="0.5" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">מחיר (₪)</label>
            <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">סוג עבודה</label>
            <input value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
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

  async function handleComplete() {
    setCompleting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("jobs").update({ status: "completed" }).eq("id", job.id).eq("user_id", user?.id);
    setCompleting(false);
    if (!error) { onMarkCompleted(job.id); onClose(); }
  }

  async function handleDelete() {
    if (!confirm(`למחוק את העבודה עם ${job.customerName}?`)) return;
    setDeleting(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("jobs").delete().eq("id", job.id).eq("user_id", user?.id);
    onDeleted(job.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-md sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col" dir="rtl">
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
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
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
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 flex-shrink-0">
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
            onClick={handleDelete}
            disabled={deleting}
            className="w-11 flex items-center justify-center border border-red-200 text-red-400 hover:bg-red-50 rounded-2xl py-3 transition-colors"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <X size={16} />}
          </button>
        </div>

        {showEdit && (
          <EditJobModal job={job} onClose={() => setShowEdit(false)} onSaved={updated => { onEdited(updated); onClose(); }} />
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
    job_time: "09:00", duration: "2", type: "", priority: "medium" as Priority, price: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobCategory, setJobCategory] = useState<JobCategory>("work");
  const [existingCustomers, setExistingCustomers] = useState<{ id: string; name: string; address: string; city: string; phone: string; monthly_price: number }[]>([]);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [priceVatType, setPriceVatType] = useState<"include" | "before">("before");

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
    const { error: dbError } = await supabase.from("jobs").insert({
      customer_name: form.customer_name.trim(),
      address: form.address.trim() || null,
      job_date: form.job_date,
      job_time: form.job_time || null,
      duration: parseFloat(form.duration) || 1,
      type: form.type.trim() || null,
      priority: form.priority,
      price: parseFloat(form.price) || 0,
      price_before_vat: priceVatType === "before",
      notes: form.notes.trim() || null,
      status: "pending",
      assigned_to: [],
      job_category: jobCategory,
      user_id: user?.id,
    });
    if (dbError) { setError("שגיאה: " + dbError.message); setSaving(false); return; }

    // reload
    const { data: fresh } = await supabase.from("jobs").select("*").eq("user_id", user?.id).order("job_date").order("job_time");
    if (fresh && fresh.length > 0) {
      const last = fresh[fresh.length - 1];
      onCreated({
        id: last.id, customerId: last.customer_id ?? null, customerName: last.customer_name ?? "",
        address: last.address ?? "", date: last.job_date, time: (last.job_time ?? "00:00").slice(0, 5),
        duration: Number(last.duration), type: last.type ?? "", status: last.status as TaskStatus,
        assignedTo: last.assigned_to ?? [], price: Number(last.price),
        priceBeforeVat: Boolean(last.price_before_vat),
        notes: last.notes ?? undefined,
        priority: (last.priority ?? "medium") as Priority,
        jobCategory: (last.job_category ?? "work") as JobCategory,
      });
    }
    setSaving(false);
    onClose();
  }

  return (
    // Full-screen on mobile — most reliable approach for iOS
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto" dir="rtl">

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
            <input name="job_time" type="time" value={form.job_time} onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">משך (שעות)</label>
            <input name="duration" type="number" min="0.5" step="0.5" value={form.duration} onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">מחיר (₪)</label>
            <input name="price" type="number" min="0" value={form.price} onChange={handleChange} placeholder="350"
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">סוג עבודה</label>
            <input name="type" value={form.type} onChange={handleChange} placeholder="גיזום, השקיה..."
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

function JobListCard({ job, onClick }: { job: Job; onClick: () => void }) {
  const colors = priorityColors(job.priority);
  const catColors = categoryConfig(job.jobCategory);
  const status = statusConfig(job.status);
  const borderColor = job.jobCategory !== "work" ? catColors.border : colors.border;
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-4 shadow-sm border-r-4 ${borderColor} cursor-pointer active:scale-[0.98] transition-transform`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${status.color}`}>
              {status.label}
            </span>
            {job.jobCategory !== "work" && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${catColors.badge}`}>
                {catColors.label}
              </span>
            )}
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
          <p className="text-green-700 font-bold text-base">
            ₪{(job.priceBeforeVat ? job.price : Math.round(job.price / 1.18)).toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 text-left">+ מע&quot;מ</p>
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
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedISO, setSelectedISO] = useState(() => formatDateISO(new Date()));

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

  async function fetchJobs() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("jobs").select("*").eq("user_id", user?.id).order("job_date").order("job_time");
    if (data) {
      setJobs(data.map(row => ({
        id: row.id, customerId: row.customer_id ?? null,
        customerName: row.customer_name ?? "", address: row.address ?? "",
        date: row.job_date, time: (row.job_time ?? "00:00").slice(0, 5),
        duration: Number(row.duration), type: row.type ?? "",
        status: row.status as TaskStatus, assignedTo: row.assigned_to ?? [],
        price: Number(row.price), priceBeforeVat: Boolean(row.price_before_vat),
        notes: row.notes ?? undefined,
        priority: (row.priority ?? "medium") as Priority,
        jobCategory: (row.job_category ?? "work") as JobCategory,
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

  function handleJobDeleted(id: string) {
    setJobs(prev => prev.filter(j => j.id !== id));
  }

  function handleJobEdited(updated: Job) {
    setJobs(prev => prev.map(j => j.id === updated.id ? updated : j));
  }

  const selectedDate = useMemo(() => new Date(selectedISO + "T00:00:00"), [selectedISO]);

  const selectedDayJobs = useMemo(
    () => jobs.filter(j => j.date === selectedISO).sort((a, b) => a.time.localeCompare(b.time)),
    [jobs, selectedISO]
  );

  const dayRevenue = selectedDayJobs.reduce((s, j) => s + (j.priceBeforeVat ? j.price : Math.round(j.price / 1.18)), 0);
  const dayCompleted = selectedDayJobs.filter(j => j.status === "completed").length;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="p-2 rounded-xl bg-gray-100 text-gray-500 active:bg-gray-200">
              <ArrowRight size={18} />
            </button>
            <h1 className="text-xl font-bold text-gray-900">לוח זמנים</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchJobs()} className="p-2.5 rounded-xl bg-gray-100 text-gray-500 active:bg-gray-200">
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => setShowNewJobModal(true)}
              className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm"
            >
              <Plus size={16} />
              עבודה חדשה
            </button>
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setMonthOffset(o => o - 1)} className="p-1.5 rounded-lg bg-gray-100 text-gray-600">
            <ChevronRight size={18} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-gray-900">
              {HEBREW_MONTHS[displayMonth.getMonth()]} {displayMonth.getFullYear()}
            </span>
            {monthOffset !== 0 && (
              <button
                onClick={() => { setMonthOffset(0); setSelectedISO(todayISO); }}
                className="text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-lg border border-green-200 font-semibold"
              >
                היום
              </button>
            )}
          </div>
          <button onClick={() => setMonthOffset(o => o + 1)} className="p-1.5 rounded-lg bg-gray-100 text-gray-600">
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {calendarDays.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;
            const iso = formatDateISO(day);
            const isToday = iso === todayISO;
            const isSelected = iso === selectedISO;
            const dayJobs = jobs.filter(j => j.date === iso);
            const hasUrgent = dayJobs.some(j => j.priority === "urgent");
            const hasJobs = dayJobs.length > 0;

            return (
              <button
                key={iso}
                onClick={() => setSelectedISO(iso)}
                className={`flex flex-col items-center py-1.5 rounded-xl transition-all relative ${
                  isSelected ? "bg-green-600 shadow-sm" :
                  isToday ? "bg-green-50 ring-1 ring-green-400" :
                  "hover:bg-gray-50 active:bg-gray-100"
                }`}
              >
                <span className={`text-sm font-bold leading-tight ${
                  isSelected ? "text-white" :
                  isToday ? "text-green-700" :
                  "text-gray-800"
                }`}>
                  {day.getDate()}
                </span>
                {hasJobs ? (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayJobs.slice(0, 3).map((j, idx) => (
                      <div key={idx} className={`w-1 h-1 rounded-full ${
                        isSelected ? "bg-white" :
                        j.jobCategory === "quote" ? "bg-purple-500" :
                        j.jobCategory === "followup" ? "bg-amber-400" :
                        j.priority === "urgent" ? "bg-red-500" :
                        j.priority === "high" ? "bg-orange-400" :
                        j.status === "completed" ? "bg-gray-300" :
                        "bg-green-500"
                      }`} />
                    ))}
                  </div>
                ) : (
                  <div className="h-2" />
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
        <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} onMarkCompleted={handleMarkCompleted} onDeleted={handleJobDeleted} onEdited={handleJobEdited} />
      )}
      {showNewJobModal && (
        <NewJobModal onClose={() => setShowNewJobModal(false)} onCreated={handleJobCreated} defaultDate={selectedISO} />
      )}
    </div>
  );
}
