"use client";

import { useState, useEffect } from "react";
import {
  Plus, LayoutGrid, CalendarDays, CheckSquare, Square,
  TrendingUp, AlertTriangle, DollarSign, Briefcase,
  Pencil, ArrowRight, BarChart2, X, Loader2, RefreshCw,
  Trash2, Clock, Package, TrendingDown, ChevronDown, ChevronUp, FileText,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────

type ProjectStatus = "planning" | "active" | "completed" | "on_hold";

interface Material {
  name: string;
  qty: number;
  unit: string;
  price: number;
  vatIncluded: boolean;
}

interface Project {
  id: string;
  name: string;
  customerName: string;
  description: string;
  startDate: string;
  endDate: string;
  budget: number;
  progress: number;
  status: ProjectStatus;
  tasks: string[];
  materials: Material[];
  laborHours: number;
  hourlyRate: number;
  notes: string;
  vatIncluded: boolean;
}

// ── Helpers ───────────────────────────────────────────────────

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

function daysRemaining(endDate: string) {
  if (!endDate) return 0;
  return Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / 86400000);
}

function statusLabel(s: ProjectStatus) {
  return { active: "פעיל", planning: "תכנון", completed: "הושלם", on_hold: "בהמתנה" }[s];
}

function statusColor(s: ProjectStatus) {
  return {
    active:    { badge: "bg-blue-100 text-blue-700",   bar: "bg-blue-500",   glow: "shadow-blue-100" },
    planning:  { badge: "bg-amber-100 text-amber-700", bar: "bg-amber-400",  glow: "shadow-amber-100" },
    completed: { badge: "bg-green-100 text-green-700", bar: "bg-green-500",  glow: "shadow-green-100" },
    on_hold:   { badge: "bg-gray-100 text-gray-600",   bar: "bg-gray-400",   glow: "shadow-gray-100" },
  }[s];
}

const VAT = 0.18;

function materialNetCost(m: Material) {
  // cost = what was actually entered (the price paid / the contracted price)
  return m.qty * m.price;
}

function calcFinancials(p: Project) {
  const materialsCost = p.materials.reduce((s, m) => s + materialNetCost(m), 0);
  const laborCost = p.laborHours * p.hourlyRate;
  const totalCost = materialsCost + laborCost;
  const budgetBeforeVat = p.vatIncluded ? p.budget / (1 + VAT) : p.budget;
  const profit = budgetBeforeVat - totalCost;
  return { materialsCost, laborCost, totalCost, profit, budgetBeforeVat };
}

const UNITS = ["יח'", "מ\"ר", "מ\"ל", "מטר", "ק\"ג", "ל'", "שק", "ערימה", "עץ", "צמח"];

// ── Materials Section ─────────────────────────────────────────

function MaterialsEditor({ materials, onChange }: { materials: Material[]; onChange: (m: Material[]) => void }) {
  function add() {
    onChange([...materials, { name: "", qty: 1, unit: "יח'", price: 0, vatIncluded: false }]);
  }
  function remove(i: number) {
    onChange(materials.filter((_, idx) => idx !== i));
  }
  function update(i: number, field: keyof Material, value: string | number | boolean) {
    const next = materials.map((m, idx) => idx === i ? { ...m, [field]: value } : m);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {materials.map((m, i) => {
        const netCost = materialNetCost(m);
        return (
          <div key={i} className="space-y-1">
            <div className="flex gap-2 items-center">
              <input
                placeholder="שם חומר"
                value={m.name}
                onChange={e => update(i, "name", e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <input
                type="number"
                placeholder="כמות"
                value={m.qty || ""}
                onChange={e => update(i, "qty", parseFloat(e.target.value) || 0)}
                className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <select
                value={m.unit}
                onChange={e => update(i, "unit", e.target.value)}
                className="w-20 border border-gray-200 rounded-lg px-1 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <input
                type="number"
                placeholder="מחיר"
                value={m.price || ""}
                onChange={e => update(i, "price", parseFloat(e.target.value) || 0)}
                className="w-20 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <button onClick={() => remove(i)} className="text-gray-300 hover:text-red-500 flex-shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
            {/* VAT toggle + net cost per material */}
            <div className="flex items-center gap-2 pr-1">
              <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
                <button
                  type="button"
                  onClick={() => update(i, "vatIncluded", false)}
                  className={`px-2 py-1 transition-colors ${!m.vatIncluded ? "bg-green-600 text-white font-semibold" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                >
                  לפני מע"מ
                </button>
                <button
                  type="button"
                  onClick={() => update(i, "vatIncluded", true)}
                  className={`px-2 py-1 transition-colors ${m.vatIncluded ? "bg-green-600 text-white font-semibold" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                >
                  כולל מע"מ
                </button>
              </div>
              <span className="text-xs text-gray-400">
                סה"כ: <span className="text-gray-600 font-medium">₪{Math.round(netCost).toLocaleString()}</span>
                {m.vatIncluded && m.price > 0 && (
                  <span className="text-gray-400"> (מע"מ: ₪{Math.round(m.qty * m.price * VAT / (1 + VAT)).toLocaleString()})</span>
                )}
                {!m.vatIncluded && m.price > 0 && (
                  <span className="text-gray-400"> (+ מע"מ: ₪{Math.round(netCost * VAT).toLocaleString()})</span>
                )}
              </span>
            </div>
          </div>
        );
      })}
      <button onClick={add}
        className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium py-1">
        <Plus size={14} /> הוסף חומר
      </button>
    </div>
  );
}

// ── New / Edit Project Modal ──────────────────────────────────

function ProjectFormModal({
  initial, onClose, onSaved,
}: {
  initial?: Project;
  onClose: () => void;
  onSaved: (p: Project) => void;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    customer_name: initial?.customerName ?? "",
    description: initial?.description ?? "",
    start_date: initial?.startDate ?? new Date().toISOString().split("T")[0],
    end_date: initial?.endDate ?? "",
    budget: initial?.budget ? String(initial.budget) : "",
    status: (initial?.status ?? "planning") as ProjectStatus,
    notes: initial?.notes ?? "",
    labor_hours: initial?.laborHours ? String(initial.laborHours) : "",
    hourly_rate: initial?.hourlyRate ? String(initial.hourlyRate) : "",
  });
  const [materials, setMaterials] = useState<Material[]>(initial?.materials ?? []);
  const [tasks, setTasks] = useState<string[]>(initial?.tasks ?? []);
  const [vatIncluded, setVatIncluded] = useState<boolean>(initial?.vatIncluded ?? false);
  const [newTask, setNewTask] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  }

  const VAT_RATE = 0.18;
  const materialsCost = materials.reduce((s, m) => s + materialNetCost(m), 0);
  const laborCost = (parseFloat(form.labor_hours) || 0) * (parseFloat(form.hourly_rate) || 0);
  const totalCost = materialsCost + laborCost;
  const budgetRaw = parseFloat(form.budget) || 0;
  // VAT calculations
  const budgetBeforeVat = vatIncluded ? budgetRaw / (1 + VAT_RATE) : budgetRaw;
  const budgetAfterVat  = vatIncluded ? budgetRaw : budgetRaw * (1 + VAT_RATE);
  const vatAmount = budgetAfterVat - budgetBeforeVat;
  const budget = budgetRaw;
  const profit = budgetBeforeVat - totalCost;

  async function handleSave() {
    if (!form.name.trim()) { setError("שם הפרויקט חובה"); return; }
    setSaving(true);
    setError("");

    const payload = {
      name: form.name.trim(),
      customer_name: form.customer_name.trim() || null,
      description: form.description.trim() || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      budget: parseFloat(form.budget) || 0,
      spent: totalCost,
      status: form.status,
      tasks,
      materials,
      labor_hours: parseFloat(form.labor_hours) || 0,
      hourly_rate: parseFloat(form.hourly_rate) || 0,
      notes: form.notes.trim() || null,
      vat_included: vatIncluded,
      ...(isEdit ? {} : { progress: 0 }),
    };

    let dbError;
    let data;

    if (isEdit) {
      const res = await supabase.from("projects").update(payload).eq("id", initial!.id).select().single();
      dbError = res.error;
      data = res.data;
    } else {
      const res = await supabase.from("projects").insert(payload).select().single();
      dbError = res.error;
      data = res.data;
    }

    if (dbError) { setError("שגיאה: " + dbError.message); setSaving(false); return; }
    if (data) onSaved(mapProject(data));
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto" dir="rtl">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3">
        <button onClick={onClose} className="text-gray-500 font-medium text-sm px-2 py-1">ביטול</button>
        <h2 className="text-base font-bold text-gray-900">{isEdit ? "עריכת פרויקט" : "פרויקט חדש"}</h2>
        <div className="w-16" />
      </div>

      <div className="px-5 py-5 space-y-5 pb-32 max-w-2xl mx-auto">

        {/* Basic info */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">פרטים כלליים</h3>
          <input name="name" value={form.name} onChange={handleChange} placeholder="שם הפרויקט *"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          <input name="customer_name" value={form.customer_name} onChange={handleChange} placeholder="שם לקוח"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          <textarea name="description" value={form.description} onChange={handleChange} rows={2} placeholder="תיאור הפרויקט..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">תאריך התחלה</label>
              <input name="start_date" type="date" value={form.start_date} onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">תאריך סיום</label>
              <input name="end_date" type="date" value={form.end_date} onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">תקציב לקוח (₪)</label>
              <input name="budget" type="number" value={form.budget} onChange={handleChange} placeholder="5000"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              {/* VAT toggle */}
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setVatIncluded(false)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${!vatIncluded ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-500 border-gray-200 hover:border-green-300"}`}>
                  לפני מע"מ
                </button>
                <button type="button" onClick={() => setVatIncluded(true)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${vatIncluded ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-500 border-gray-200 hover:border-green-300"}`}>
                  כולל מע"מ
                </button>
              </div>
              {budgetRaw > 0 && (
                <div className="mt-1.5 text-xs text-gray-400 space-y-0.5">
                  {vatIncluded ? (
                    <>
                      <p>לפני מע"מ: <span className="font-semibold text-gray-600">₪{Math.round(budgetBeforeVat).toLocaleString()}</span></p>
                      <p>מע"מ (18%): <span className="font-semibold text-gray-600">₪{Math.round(vatAmount).toLocaleString()}</span></p>
                    </>
                  ) : (
                    <>
                      <p>כולל מע"מ: <span className="font-semibold text-gray-600">₪{Math.round(budgetAfterVat).toLocaleString()}</span></p>
                      <p>מע"מ (18%): <span className="font-semibold text-gray-600">₪{Math.round(vatAmount).toLocaleString()}</span></p>
                    </>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">סטטוס</label>
              <select name="status" value={form.status} onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400">
                <option value="planning">תכנון</option>
                <option value="active">פעיל</option>
                <option value="on_hold">בהמתנה</option>
                <option value="completed">הושלם</option>
              </select>
            </div>
          </div>
        </section>

        {/* Materials */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
            <Package size={14} /> חומרים וציוד
          </h3>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="flex gap-2 text-xs text-gray-400 font-medium mb-2 px-1">
              <span className="flex-1">שם</span>
              <span className="w-16">כמות</span>
              <span className="w-20">יחידה</span>
              <span className="w-20">מחיר/יח'</span>
              <span className="w-16">סה"כ</span>
              <span className="w-6" />
            </div>
            <MaterialsEditor materials={materials} onChange={setMaterials} />
            {materials.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between text-sm">
                <span className="text-gray-500">סה"כ חומרים</span>
                <span className="font-bold text-gray-800">₪{Math.round(materialsCost).toLocaleString()}</span>
              </div>
            )}
          </div>
        </section>

        {/* Labor */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
            <Clock size={14} /> שעות עבודה
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">מספר שעות</label>
              <input name="labor_hours" type="number" value={form.labor_hours} onChange={handleChange} placeholder="0"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">תעריף לשעה (₪)</label>
              <input name="hourly_rate" type="number" value={form.hourly_rate} onChange={handleChange} placeholder="120"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>
          {laborCost > 0 && (
            <div className="bg-gray-50 rounded-xl px-4 py-2.5 flex justify-between text-sm">
              <span className="text-gray-500">עלות עבודה</span>
              <span className="font-bold text-gray-800">₪{Math.round(laborCost).toLocaleString()}</span>
            </div>
          )}
        </section>

        {/* Financial summary */}
        {(totalCost > 0 || budgetRaw > 0) && (
          <section className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100">
            <h3 className="text-sm font-bold text-gray-700 mb-3">סיכום פיננסי</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">תקציב לקוח {vatIncluded ? "(כולל מע\"מ)" : "(לפני מע\"מ)"}</span>
                <span className="font-semibold text-gray-800">₪{budgetRaw.toLocaleString()}</span>
              </div>
              {budgetRaw > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">מע"מ 18%</span>
                  <span className="text-gray-500">₪{Math.round(vatAmount).toLocaleString()}</span>
                </div>
              )}
              {budgetRaw > 0 && (
                <div className="flex justify-between text-xs border-b border-green-100 pb-1.5">
                  <span className="text-gray-400">תקציב {vatIncluded ? "לפני" : "כולל"} מע"מ</span>
                  <span className="text-gray-600 font-medium">₪{Math.round(vatIncluded ? budgetBeforeVat : budgetAfterVat).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">עלות חומרים</span>
                <span className="font-semibold text-gray-800">₪{Math.round(materialsCost).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">עלות עבודה</span>
                <span className="font-semibold text-gray-800">₪{Math.round(laborCost).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-green-200 pt-1.5 mt-1.5">
                <span className="font-bold text-gray-700">סה"כ עלות</span>
                <span className="font-bold text-gray-800">₪{Math.round(totalCost).toLocaleString()}</span>
              </div>
              <div className={`flex justify-between text-base font-bold pt-1 ${profit >= 0 ? "text-green-700" : "text-red-600"}`}>
                <span>{profit >= 0 ? "רווח צפוי (לפני מע\"מ)" : "הפסד צפוי"}</span>
                <span>₪{Math.abs(Math.round(profit)).toLocaleString()}</span>
              </div>
            </div>
          </section>
        )}

        {/* Tasks */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">משימות</h3>
          <div className="space-y-2">
            {tasks.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex-1 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{t}</span>
                <button onClick={() => setTasks(tasks.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-500">
                  <X size={14} />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input value={newTask} onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && newTask.trim()) { setTasks([...tasks, newTask.trim()]); setNewTask(""); } }}
                placeholder="הוסף משימה..."
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              <button onClick={() => { if (newTask.trim()) { setTasks([...tasks, newTask.trim()]); setNewTask(""); } }}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium">
                <Plus size={14} />
              </button>
            </div>
          </div>
        </section>

        {/* Notes */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
            <FileText size={14} /> הערות
          </h3>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} placeholder="הערות נוספות על הפרויקט..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
        </section>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

        <button onClick={handleSave} disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-green-600 disabled:opacity-60 text-white font-bold rounded-2xl py-4 text-base">
          {saving ? <Loader2 size={18} className="animate-spin" /> : null}
          {saving ? "שומר..." : isEdit ? "שמור שינויים" : "צור פרויקט"}
        </button>
      </div>
    </div>
  );
}

// ── Update Progress Modal ─────────────────────────────────────

function UpdateProgressModal({ project, onClose, onUpdated }: {
  project: Project; onClose: () => void; onUpdated: (id: string, progress: number, status: ProjectStatus) => void;
}) {
  const [progress, setProgress] = useState(project.progress);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await supabase.from("projects").update({ progress, status }).eq("id", project.id);
    onUpdated(project.id, progress, status);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full rounded-t-3xl p-6 space-y-5" dir="rtl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">עדכון התקדמות</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <p className="text-sm text-gray-500">{project.name}</p>
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">התקדמות</span>
            <span className="font-bold text-green-600">{progress}%</span>
          </div>
          <input type="range" min="0" max="100" step="5" value={progress} onChange={e => setProgress(Number(e.target.value))} className="w-full accent-green-600" />
          <div className="h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
            <div className={`h-full rounded-full ${statusColor(status).bar}`} style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">סטטוס</label>
          <div className="grid grid-cols-2 gap-2">
            {(["planning", "active", "on_hold", "completed"] as ProjectStatus[]).map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${status === s ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-600"}`}>
                {statusLabel(s)}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-green-600 disabled:opacity-60 text-white font-bold rounded-2xl py-4">
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          {saving ? "שומר..." : "שמור"}
        </button>
      </div>
    </div>
  );
}

// ── Project Card ──────────────────────────────────────────────

function ProjectCard({ project, onUpdate }: { project: Project; onUpdate: () => void }) {
  const [checkedTasks, setCheckedTasks] = useState<Set<number>>(new Set());
  const [showUpdate, setShowUpdate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showFinance, setShowFinance] = useState(false);
  const colors = statusColor(project.status);
  const days = daysRemaining(project.endDate);
  const { materialsCost, laborCost, totalCost, profit, budgetBeforeVat } = calcFinancials(project);

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-5 shadow-sm ${colors.glow}`} dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 ml-2">
          <h3 className="font-bold text-gray-800 text-base truncate">{project.name}</h3>
          {project.customerName && <p className="text-xs text-gray-500">{project.customerName}</p>}
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${colors.badge}`}>
          {statusLabel(project.status)}
        </span>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">התקדמות</span>
          <span className="font-bold text-gray-800">{project.progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${project.progress}%` }} />
        </div>
      </div>

      {/* Dates */}
      {project.endDate && (
        <div className="flex items-center gap-2 mb-3 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
          <CalendarDays size={12} className="text-gray-400" />
          <span>{formatDate(project.startDate)}</span>
          <ArrowRight size={10} className="text-gray-300 rotate-180" />
          <span>{formatDate(project.endDate)}</span>
          <span className={`mr-auto font-semibold ${days < 7 ? "text-red-500" : days < 14 ? "text-amber-500" : "text-green-600"}`}>
            {days > 0 ? `${days} ימים` : days === 0 ? "היום!" : `איחור ${Math.abs(days)}י`}
          </span>
        </div>
      )}

      {/* Financial summary toggle */}
      {project.budget > 0 && (
        <button
          onClick={() => setShowFinance(s => !s)}
          className="w-full mb-3 bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-2.5 text-sm transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign size={14} className="text-gray-400" />
              <span className="text-gray-600 font-medium">פיננסים</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-bold text-sm ${profit >= 0 ? "text-green-600" : "text-red-500"}`}>
                {profit >= 0 ? "+" : "-"}₪{Math.round(Math.abs(profit)).toLocaleString()}
              </span>
              {showFinance ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </div>
          </div>

          {showFinance && (
            <div className="mt-3 space-y-1.5 text-right" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">
                  {project.vatIncluded ? 'תקציב לקוח (כולל מע"מ)' : 'תקציב לקוח (לפני מע"מ)'}
                </span>
                <span className="font-semibold text-gray-700">₪{project.budget.toLocaleString()}</span>
              </div>
              {project.vatIncluded && (
                <>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">מע"מ 18%</span>
                    <span className="text-gray-500">₪{Math.round(project.budget - budgetBeforeVat).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs border-b border-dashed border-gray-200 pb-1.5">
                    <span className="text-gray-500 font-medium">תקציב נטו (לפני מע"מ)</span>
                    <span className="font-semibold text-gray-700">₪{Math.round(budgetBeforeVat).toLocaleString()}</span>
                  </div>
                </>
              )}
              {materialsCost > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 flex items-center gap-1"><Package size={10} /> חומרים ({project.materials.length} פריטים)</span>
                  <span className="font-semibold text-gray-700">₪{Math.round(materialsCost).toLocaleString()}</span>
                </div>
              )}
              {laborCost > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 flex items-center gap-1"><Clock size={10} /> עבודה ({project.laborHours}ש × ₪{project.hourlyRate})</span>
                  <span className="font-semibold text-gray-700">₪{Math.round(laborCost).toLocaleString()}</span>
                </div>
              )}
              {totalCost > 0 && (
                <div className="flex justify-between text-xs border-t border-gray-200 pt-1.5">
                  <span className="font-bold text-gray-600">סה"כ עלות</span>
                  <span className="font-bold text-gray-700">₪{Math.round(totalCost).toLocaleString()}</span>
                </div>
              )}
              <div className={`flex justify-between text-sm font-bold pt-0.5 ${profit >= 0 ? "text-green-600" : "text-red-500"}`}>
                <span className="flex items-center gap-1">
                  {profit >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {profit >= 0 ? 'רווח (לפני מע"מ)' : 'הפסד'}
                </span>
                <span>₪{Math.round(Math.abs(profit)).toLocaleString()}</span>
              </div>
              {/* Materials list */}
              {showFinance && project.materials.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                  {project.materials.map((m, i) => (
                    <div key={i} className="flex justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        {m.name} ({m.qty} {m.unit})
                        <span className={`px-1 rounded text-[10px] font-medium ${m.vatIncluded ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-500"}`}>
                          {m.vatIncluded ? 'כולל מע"מ' : 'לפני מע"מ'}
                        </span>
                      </span>
                      <span>₪{(m.qty * m.price).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </button>
      )}

      {/* Tasks */}
      {project.tasks.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {project.tasks.map((task, i) => (
            <button key={i} onClick={() => setCheckedTasks(prev => {
              const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next;
            })} className="flex items-center gap-2 w-full text-right">
              {checkedTasks.has(i)
                ? <CheckSquare size={14} className="text-green-500 flex-shrink-0" />
                : <Square size={14} className="text-gray-300 flex-shrink-0" />}
              <span className={`text-xs ${checkedTasks.has(i) ? "line-through text-gray-400" : "text-gray-600"}`}>{task}</span>
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={() => setShowUpdate(true)}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2">
          <BarChart2 size={13} /> התקדמות
        </button>
        <button onClick={() => setShowEdit(true)}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 flex items-center justify-center gap-2">
          <Pencil size={13} /> עריכה
        </button>
      </div>

      {showUpdate && (
        <UpdateProgressModal project={project} onClose={() => setShowUpdate(false)}
          onUpdated={() => { onUpdate(); setShowUpdate(false); }} />
      )}
      {showEdit && (
        <ProjectFormModal initial={project} onClose={() => setShowEdit(false)} onSaved={() => { onUpdate(); setShowEdit(false); }} />
      )}
    </div>
  );
}

// ── Map helper ────────────────────────────────────────────────

function mapProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    customerName: (row.customer_name as string) || "",
    description: (row.description as string) || "",
    startDate: (row.start_date as string) || "",
    endDate: (row.end_date as string) || "",
    budget: Number(row.budget) || 0,
    progress: Number(row.progress) || 0,
    status: (row.status as ProjectStatus) || "planning",
    tasks: (row.tasks as string[]) || [],
    materials: ((row.materials as Material[]) || []).map(m => ({ ...m, vatIncluded: Boolean(m.vatIncluded) })),
    laborHours: Number(row.labor_hours) || 0,
    hourlyRate: Number(row.hourly_rate) || 0,
    notes: (row.notes as string) || "",
    vatIncluded: Boolean(row.vat_included) || false,
  };
}

// ── Main Page ─────────────────────────────────────────────────

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "kanban">("cards");

  async function fetchProjects() {
    setLoading(true);
    const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    if (data) setProjects(data.map(mapProject));
    setLoading(false);
  }

  useEffect(() => { fetchProjects(); }, []);

  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalCost = projects.reduce((s, p) => s + calcFinancials(p).totalCost, 0);
  const totalProfit = totalBudget - totalCost;
  const activeCount = projects.filter(p => p.status === "active").length;

  const kanbanCols: { key: ProjectStatus; label: string; color: string; header: string }[] = [
    { key: "planning",  label: "תכנון",  color: "bg-amber-50 border-amber-200", header: "bg-amber-400" },
    { key: "active",    label: "פעיל",   color: "bg-blue-50 border-blue-200",   header: "bg-blue-500" },
    { key: "on_hold",   label: "בהמתנה", color: "bg-gray-50 border-gray-200",   header: "bg-gray-400" },
    { key: "completed", label: "הושלם",  color: "bg-green-50 border-green-200", header: "bg-green-500" },
  ];

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="px-4 py-5 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">פרויקטים</h1>
            <p className="text-gray-500 text-sm mt-0.5">{projects.length} פרויקטים סה״כ</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchProjects} className="p-2.5 rounded-xl bg-gray-100 text-gray-500">
              <RefreshCw size={16} />
            </button>
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm">
              <Plus size={16} /> פרויקט חדש
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'סה"כ', value: projects.length, icon: <Briefcase size={18} />, color: "text-violet-600", bg: "bg-violet-50" },
            { label: "פעילים", value: activeCount, icon: <TrendingUp size={18} />, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "תקציב", value: `₪${totalBudget.toLocaleString()}`, icon: <DollarSign size={18} />, color: "text-green-600", bg: "bg-green-50" },
            {
              label: totalProfit >= 0 ? "רווח כולל" : "הפסד כולל",
              value: `₪${Math.abs(totalProfit).toLocaleString()}`,
              icon: totalProfit >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />,
              color: totalProfit >= 0 ? "text-green-600" : "text-red-600",
              bg: totalProfit >= 0 ? "bg-green-50" : "bg-red-50",
            },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${s.bg} ${s.color} flex items-center justify-center flex-shrink-0`}>{s.icon}</div>
              <div>
                <p className="text-lg font-bold text-gray-800">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden mb-5 w-fit">
          <button onClick={() => setViewMode("cards")}
            className={`px-4 py-2 text-sm flex items-center gap-1.5 ${viewMode === "cards" ? "bg-gray-100 text-gray-800 font-semibold" : "text-gray-500"}`}>
            <LayoutGrid size={15} /> כרטיסים
          </button>
          <button onClick={() => setViewMode("kanban")}
            className={`px-4 py-2 text-sm flex items-center gap-1.5 ${viewMode === "kanban" ? "bg-gray-100 text-gray-800 font-semibold" : "text-gray-500"}`}>
            <LayoutGrid size={15} /> קנבן
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-green-600" /></div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <Briefcase size={48} className="mx-auto mb-3 text-gray-200" />
            <p className="text-gray-500 font-medium">אין פרויקטים עדיין</p>
            <button onClick={() => setShowNew(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold">
              <Plus size={15} /> הוסף פרויקט ראשון
            </button>
          </div>
        ) : viewMode === "cards" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-28">
            {projects.map(p => <ProjectCard key={p.id} project={p} onUpdate={fetchProjects} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-28">
            {kanbanCols.map(col => {
              const colProjects = projects.filter(p => p.status === col.key);
              return (
                <div key={col.key} className={`rounded-2xl border ${col.color} overflow-hidden`}>
                  <div className={`${col.header} px-4 py-3 flex items-center justify-between`}>
                    <span className="text-white font-semibold text-sm">{col.label}</span>
                    <span className="bg-white/25 text-white text-xs font-bold px-2 py-0.5 rounded-full">{colProjects.length}</span>
                  </div>
                  <div className="p-3 space-y-3 min-h-[100px]">
                    {colProjects.map(p => {
                      const { profit } = calcFinancials(p);
                      return (
                        <div key={p.id} className="bg-white rounded-xl p-3 shadow-sm border border-white">
                          <p className="font-semibold text-gray-800 text-sm truncate">{p.name}</p>
                          <p className="text-xs text-gray-500 mb-2">{p.customerName}</p>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                            <div className={`h-full rounded-full ${statusColor(p.status).bar}`} style={{ width: `${p.progress}%` }} />
                          </div>
                          <div className="flex justify-between text-xs mt-1">
                            <span className="text-gray-400">{p.progress}%</span>
                            {p.budget > 0 && (
                              <span className={`font-semibold ${profit >= 0 ? "text-green-600" : "text-red-500"}`}>
                                {profit >= 0 ? "+" : "-"}₪{Math.round(Math.abs(profit)).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <button onClick={() => setShowNew(true)}
                      className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 border border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-1">
                      <Plus size={12} /> הוסף פרויקט
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showNew && (
        <ProjectFormModal onClose={() => setShowNew(false)} onSaved={p => { setProjects(prev => [p, ...prev]); }} />
      )}
    </div>
  );
}
