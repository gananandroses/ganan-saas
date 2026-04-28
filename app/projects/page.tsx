"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus, LayoutGrid, CalendarDays, CheckSquare, Square,
  TrendingUp, AlertTriangle, DollarSign, Briefcase,
  Pencil, ArrowRight, BarChart2, X, Loader2, RefreshCw,
  Camera, ImageIcon, Trash2, ChevronLeft, ChevronRight, Upload, Share2, Folder, FolderPlus,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────

type ProjectStatus = "planning" | "active" | "completed" | "on_hold";

interface Project {
  id: string;
  name: string;
  customerName: string;
  description: string;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  progress: number;
  status: ProjectStatus;
  tasks: string[];
}

// ── Helpers ───────────────────────────────────────────────────

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

function daysRemaining(endDate: string) {
  if (!endDate) return 0;
  const diff = Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / 86400000);
  return diff;
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

// ── New Project Modal (full-screen) ───────────────────────────

function NewProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: Project) => void }) {
  const [form, setForm] = useState({
    name: "", customer_name: "", description: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "", budget: "", status: "planning" as ProjectStatus,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setError("שם הפרויקט חובה"); return; }
    setSaving(true);
    setError("");
    const { error: dbError } = await supabase.from("projects").insert({
      name: form.name.trim(),
      customer_name: form.customer_name.trim() || null,
      description: form.description.trim() || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      budget: parseFloat(form.budget) || 0,
      spent: 0,
      progress: 0,
      status: form.status,
      tasks: [],
    });
    if (dbError) { setError("שגיאה: " + dbError.message); setSaving(false); return; }

    const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(1).single();
    if (data) onCreated(mapProject(data));
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto" dir="rtl">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3">
        <button onClick={onClose} className="text-gray-500 font-medium text-sm px-2 py-1">ביטול</button>
        <h2 className="text-base font-bold text-gray-900">פרויקט חדש</h2>
        <div className="w-16" />
      </div>
      <div className="px-5 py-5 space-y-4 pb-32">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">שם הפרויקט *</label>
          <input name="name" value={form.name} onChange={handleChange} placeholder="גינת גג — בית לוי"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">שם לקוח</label>
          <input name="customer_name" value={form.customer_name} onChange={handleChange} placeholder="משפחת לוי"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">תיאור</label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={2}
            placeholder="תיאור קצר של הפרויקט..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">תאריך התחלה</label>
            <input name="start_date" type="date" value={form.start_date} onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">תאריך סיום</label>
            <input name="end_date" type="date" value={form.end_date} onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">תקציב (₪)</label>
            <input name="budget" type="number" value={form.budget} onChange={handleChange} placeholder="5000"
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">סטטוס</label>
            <select name="status" value={form.status} onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white">
              <option value="planning">תכנון</option>
              <option value="active">פעיל</option>
              <option value="on_hold">בהמתנה</option>
              <option value="completed">הושלם</option>
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
        <button onClick={handleSubmit} disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-green-600 disabled:opacity-60 text-white font-bold rounded-2xl py-4 text-base mt-2">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          {saving ? "שומר..." : "צור פרויקט"}
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={(e) => e.target === e.currentTarget && onClose()}>
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
          <input type="range" min="0" max="100" step="5" value={progress}
            onChange={e => setProgress(Number(e.target.value))}
            className="w-full accent-green-600" />
          <div className="h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
            <div className={`h-full rounded-full ${statusColor(status).bar}`} style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">סטטוס</label>
          <div className="grid grid-cols-2 gap-2">
            {(["planning","active","on_hold","completed"] as ProjectStatus[]).map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  status === s ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-600"
                }`}>
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

// ── Project Gallery Modal ─────────────────────────────────────

const BUCKET = "project-images";

function ProjectGalleryModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folders, setFolders] = useState<{ name: string; imageCount: number }[]>([]);
  const [images, setImages] = useState<{ name: string; url: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const shareTitle = currentFolder
    ? `תיק עבודות — ${project.name} / ${currentFolder}`
    : `תיק עבודות — ${project.name}${project.customerName ? ` (${project.customerName})` : ""}`;
  const shareText = `${shareTitle}\n\n${images.map((img, i) => `תמונה ${i + 1}: ${img.url}`).join("\n")}`;

  function shareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
    setShowShare(false);
  }
  function shareTelegram() {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(images[0]?.url || "")}&text=${encodeURIComponent(shareTitle)}`, "_blank");
    setShowShare(false);
  }
  function shareGmail() {
    const body = `שלום,\n\nמצורפות תמונות מהפרויקט: ${project.name}${project.customerName ? ` — ${project.customerName}` : ""}${currentFolder ? `\nתיקייה: ${currentFolder}` : ""}\n\n${images.map((img, i) => `תמונה ${i + 1}: ${img.url}`).join("\n")}\n\nגנן Pro`;
    window.open(`mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(body)}`, "_blank");
    setShowShare(false);
  }
  function shareSms() {
    window.open(`sms:?body=${encodeURIComponent(shareText)}`, "_blank");
    setShowShare(false);
  }
  async function copyLink() {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setShowShare(false);
  }
  async function nativeShare() {
    if (navigator.share) await navigator.share({ title: shareTitle, text: shareText });
    setShowShare(false);
  }
  async function downloadAll() {
    setShowShare(false);
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const res = await fetch(img.url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${project.name}${currentFolder ? `-${currentFolder}` : ""}-תמונה${i + 1}.${img.name.split(".").pop() || "jpg"}`;
      a.click();
      URL.revokeObjectURL(a.href);
      await new Promise(r => setTimeout(r, 300));
    }
  }
  async function exportPdf() {
    setGeneratingPdf(true);
    setShowShare(false);
    const date = new Date().toLocaleDateString("he-IL");
    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>${shareTitle}</title><style>
      *{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#fff;color:#111;padding:32px}
      h1{font-size:22px;font-weight:bold;margin-bottom:4px}.sub{font-size:13px;color:#666;margin-bottom:24px}
      .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
      .img-wrap{break-inside:avoid;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb}
      img{width:100%;height:220px;object-fit:cover;display:block}.caption{font-size:11px;color:#888;padding:6px 10px;background:#f9fafb}
      @media print{body{padding:16px}.grid{gap:12px}img{height:200px}}
    </style></head><body>
      <h1>${shareTitle}</h1>
      <div class="sub">${project.customerName ? `לקוח: ${project.customerName} · ` : ""}${images.length} תמונות · ${date}</div>
      <div class="grid">${images.map((img, i) => `<div class="img-wrap"><img src="${img.url}" /><div class="caption">תמונה ${i + 1}</div></div>`).join("")}</div>
    </body></html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => { win.print(); }, 800); }
    setGeneratingPdf(false);
  }

  async function fetchContents() {
    setLoading(true);
    setImages([]);
    setFolders([]);
    if (currentFolder === null) {
      // Root level: list folders and root files
      const { data } = await supabase.storage.from(BUCKET).list(project.id, { sortBy: { column: "name", order: "asc" } });
      if (data) {
        const folderItems = data.filter(f => f.id === null);
        const rootFiles = data.filter(f => f.id !== null && f.name !== ".emptyFolderPlaceholder");

        // Count images in each folder
        const foldersWithCount = await Promise.all(
          folderItems.map(async (folder) => {
            const { data: folderFiles } = await supabase.storage.from(BUCKET).list(`${project.id}/${folder.name}`);
            const count = (folderFiles || []).filter(f => f.id !== null && f.name !== ".emptyFolderPlaceholder").length;
            return { name: folder.name, imageCount: count };
          })
        );
        setFolders(foldersWithCount);

        // Root-level images (legacy / no folder)
        const mapped = rootFiles.map(f => ({
          name: f.name,
          url: supabase.storage.from(BUCKET).getPublicUrl(`${project.id}/${f.name}`).data.publicUrl,
        }));
        setImages(mapped);
      }
    } else {
      // Inside a folder
      const { data } = await supabase.storage.from(BUCKET).list(`${project.id}/${currentFolder}`, { sortBy: { column: "created_at", order: "asc" } });
      if (data) {
        const files = data.filter(f => f.id !== null && f.name !== ".emptyFolderPlaceholder");
        setImages(files.map(f => ({
          name: f.name,
          url: supabase.storage.from(BUCKET).getPublicUrl(`${project.id}/${currentFolder}/${f.name}`).data.publicUrl,
        })));
      }
    }
    setLoading(false);
  }

  useEffect(() => { fetchContents(); }, [project.id, currentFolder]); // eslint-disable-line react-hooks/exhaustive-deps

  async function createFolder() {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    const placeholder = new Blob([""], { type: "text/plain" });
    await supabase.storage.from(BUCKET).upload(
      `${project.id}/${newFolderName.trim()}/.emptyFolderPlaceholder`,
      placeholder,
      { upsert: true }
    );
    const name = newFolderName.trim();
    setNewFolderName("");
    setShowNewFolder(false);
    setCreatingFolder(false);
    setCurrentFolder(name);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setUploadError(null);
    for (const file of files) {
      const ext = file.name.split(".").pop() || "jpg";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const path = currentFolder
        ? `${project.id}/${currentFolder}/${filename}`
        : `${project.id}/${filename}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (error) {
        if (error.message.includes("bucket") || error.message.includes("not found")) {
          setUploadError("❌ ה-bucket 'project-images' לא קיים ב-Supabase. צור אותו ב: Storage → New bucket → project-images (Public)");
        } else if (error.message.includes("policy") || error.message.includes("permission") || error.message.includes("Unauthorized")) {
          setUploadError("❌ אין הרשאות העלאה. ב-Supabase: Storage → project-images → Policies → הוסף INSERT policy");
        } else {
          setUploadError("❌ שגיאה: " + error.message);
        }
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }
    await fetchContents();
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDelete(img: { name: string; url: string }) {
    setDeleting(img.name);
    const path = currentFolder
      ? `${project.id}/${currentFolder}/${img.name}`
      : `${project.id}/${img.name}`;
    await supabase.storage.from(BUCKET).remove([path]);
    setImages(prev => prev.filter(i => i.name !== img.name));
    if (lightbox !== null) setLightbox(null);
    setDeleting(null);
  }

  const totalImagesAll = folders.reduce((s, f) => s + f.imageCount, 0) + images.length;

  return (
    <div className="fixed inset-0 z-[70] bg-white flex flex-col" dir="rtl">
      {/* Top nav */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3 flex-shrink-0 gap-2">
        <button
          onClick={currentFolder !== null ? () => { setCurrentFolder(null); setLightbox(null); } : onClose}
          className="flex items-center gap-1.5 text-gray-600 text-sm font-medium flex-shrink-0"
        >
          <ChevronRight size={18} />
          {currentFolder !== null ? "תיקיות" : "חזור"}
        </button>
        <div className="text-center flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{project.name}</p>
          <p className="text-xs text-gray-400">
            {currentFolder !== null
              ? `📁 ${currentFolder} · ${images.length} תמונות`
              : `${folders.length} תיקיות · ${totalImagesAll} תמונות`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Share (only inside a folder with images) */}
          {currentFolder !== null && images.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowShare(s => !s)}
                className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-semibold px-3 py-2 rounded-xl border border-blue-200 transition-colors"
              >
                <Share2 size={14} /> שתף
              </button>
              {showShare && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowShare(false)} />
                  <div className="absolute left-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20 w-52" dir="rtl">
                    {typeof navigator !== "undefined" && "share" in navigator && (
                      <button onClick={nativeShare} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 font-medium">
                        <span className="text-lg">📲</span> שתף (תפריט הטלפון)
                      </button>
                    )}
                    <button onClick={shareWhatsApp} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 border-t border-gray-50">
                      <span className="text-lg">💬</span> WhatsApp
                    </button>
                    <button onClick={shareTelegram} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 border-t border-gray-50">
                      <span className="text-lg">✈️</span> Telegram
                    </button>
                    <button onClick={shareGmail} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 border-t border-gray-50">
                      <span className="text-lg">✉️</span> Gmail / מייל
                    </button>
                    <button onClick={shareSms} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 border-t border-gray-50">
                      <span className="text-lg">💌</span> SMS / iMessage
                    </button>
                    <button onClick={copyLink} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 border-t border-gray-50">
                      <span className="text-lg">{copied ? "✅" : "🔗"}</span> {copied ? "הועתק!" : "העתק קישורים"}
                    </button>
                    <button onClick={downloadAll} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 border-t border-gray-50">
                      <span className="text-lg">💾</span> הורד הכל
                    </button>
                    <button onClick={exportPdf} disabled={generatingPdf} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 border-t border-gray-50 disabled:opacity-50">
                      {generatingPdf ? <Loader2 size={16} className="animate-spin" /> : <span className="text-lg">📄</span>}
                      {generatingPdf ? "מכין PDF..." : "ייצא PDF"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {/* Upload (inside folder) or New Folder (root) */}
          {currentFolder !== null ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? "מעלה..." : "הוסף"}
            </button>
          ) : (
            <button
              onClick={() => setShowNewFolder(true)}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors"
            >
              <FolderPlus size={14} /> תיקייה חדשה
            </button>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
      </div>

      {/* Error banner */}
      {uploadError && (
        <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2 flex-shrink-0">
          <p className="text-sm text-red-700 flex-1">{uploadError}</p>
          <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-600 flex-shrink-0"><X size={16} /></button>
        </div>
      )}

      {/* New folder dialog */}
      {showNewFolder && (
        <div className="mx-4 mt-3 bg-green-50 border border-green-200 rounded-xl p-4 flex-shrink-0 space-y-3">
          <p className="text-sm font-semibold text-green-800">תיקייה חדשה</p>
          <input
            autoFocus
            type="text"
            placeholder="שם התיקייה (למשל: לפני, אחרי, שלב 1)"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
            className="w-full border border-green-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
          />
          <div className="flex gap-2">
            <button
              onClick={createFolder}
              disabled={!newFolderName.trim() || creatingFolder}
              className="flex items-center gap-1.5 bg-green-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl"
            >
              {creatingFolder ? <Loader2 size={13} className="animate-spin" /> : <FolderPlus size={13} />}
              {creatingFolder ? "יוצר..." : "צור תיקייה"}
            </button>
            <button onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}
              className="text-sm font-medium text-gray-500 px-4 py-2 rounded-xl hover:bg-white">
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={32} className="animate-spin text-green-500" />
          </div>
        ) : currentFolder === null ? (
          /* ── Folder list view ── */
          <div>
            {folders.length === 0 && images.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <Folder size={36} className="text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium mb-1">אין תיקיות עדיין</p>
                <p className="text-gray-400 text-sm mb-5">צור תיקייה ראשונה והוסף תמונות</p>
                <button
                  onClick={() => setShowNewFolder(true)}
                  className="flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl font-semibold text-sm"
                >
                  <FolderPlus size={16} /> צור תיקייה ראשונה
                </button>
              </div>
            ) : (
              <div className="space-y-6 pb-6">
                {/* Folders grid */}
                {folders.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">תיקיות</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {folders.map(folder => (
                        <button
                          key={folder.name}
                          onClick={() => setCurrentFolder(folder.name)}
                          className="aspect-square rounded-2xl border-2 border-gray-100 hover:border-green-400 bg-gray-50 hover:bg-green-50 flex flex-col items-center justify-center gap-2 transition-all group p-3"
                        >
                          <Folder size={32} className="text-amber-400 group-hover:text-green-500 transition-colors" />
                          <span className="text-xs font-semibold text-gray-700 group-hover:text-green-700 text-center leading-tight break-words w-full">{folder.name}</span>
                          <span className="text-xs text-gray-400">{folder.imageCount} תמונות</span>
                        </button>
                      ))}
                      {/* New folder tile */}
                      <button
                        onClick={() => setShowNewFolder(true)}
                        className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 hover:border-green-400 hover:bg-green-50 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-green-600 transition-all"
                      >
                        <FolderPlus size={28} />
                        <span className="text-xs font-medium">תיקייה חדשה</span>
                      </button>
                    </div>
                  </div>
                )}
                {/* Root-level images (legacy) */}
                {images.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">תמונות ללא תיקייה</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {images.map((img, idx) => (
                        <div key={img.name} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt={`תמונה ${idx + 1}`}
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                            onClick={() => setLightbox(idx)} />
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(img); }} disabled={deleting === img.name}
                            className="absolute top-1.5 left-1.5 w-7 h-7 bg-black/60 hover:bg-red-600 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {deleting === img.name ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          </button>
                          <div className="absolute bottom-1.5 right-1.5 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-md">{idx + 1}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ── Images inside folder ── */
          images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <ImageIcon size={36} className="text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium mb-1">התיקייה ריקה</p>
              <p className="text-gray-400 text-sm mb-5">הוסף תמונות לתיקייה "{currentFolder}"</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl font-semibold text-sm"
              >
                <Camera size={16} /> העלה תמונה ראשונה
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-6">
              {images.map((img, idx) => (
                <div key={img.name} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={`תמונה ${idx + 1}`}
                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                    onClick={() => setLightbox(idx)} />
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(img); }} disabled={deleting === img.name}
                    className="absolute top-1.5 left-1.5 w-7 h-7 bg-black/60 hover:bg-red-600 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {deleting === img.name ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                  <div className="absolute bottom-1.5 right-1.5 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-md">{idx + 1}</div>
                </div>
              ))}
              {/* Upload tile */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-green-400 hover:bg-green-50 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-green-600 transition-all"
              >
                <Plus size={24} />
                <span className="text-xs font-medium">הוסף</span>
              </button>
            </div>
          )
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div className="fixed inset-0 z-[80] bg-black flex items-center justify-center" onClick={() => setLightbox(null)}>
          <button onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            className="absolute top-4 left-4 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center">
            <X size={20} />
          </button>
          {lightbox > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setLightbox(l => l! - 1); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center">
              <ChevronRight size={22} />
            </button>
          )}
          {lightbox < images.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); setLightbox(l => l! + 1); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center">
              <ChevronLeft size={22} />
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[lightbox].url} alt={`תמונה ${lightbox + 1}`}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()} />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
            <span className="text-white/70 text-sm">{lightbox + 1} / {images.length}</span>
            <button onClick={(e) => { e.stopPropagation(); handleDelete(images[lightbox]); }}
              className="flex items-center gap-1.5 bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
              <Trash2 size={13} /> מחק תמונה
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Project Card ──────────────────────────────────────────────

function ProjectCard({ project, onUpdate }: { project: Project; onUpdate: () => void }) {
  const [checkedTasks, setCheckedTasks] = useState<Set<number>>(new Set());
  const [showUpdate, setShowUpdate] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const colors = statusColor(project.status);
  const days = daysRemaining(project.endDate);
  const isOverBudget = project.spent > project.budget;
  const budgetPct = Math.min((project.spent / (project.budget || 1)) * 100, 100);

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-5 shadow-sm ${colors.glow}`} dir="rtl">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 ml-2">
          <h3 className="font-bold text-gray-800 text-base truncate">{project.name}</h3>
          <p className="text-xs text-gray-500">{project.customerName}</p>
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

      {/* Budget */}
      {project.budget > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">תקציב</span>
            <span className={`font-semibold ${isOverBudget ? "text-red-600" : "text-gray-700"}`}>
              {isOverBudget && <AlertTriangle size={10} className="inline ml-1" />}
              ₪{project.spent.toLocaleString()} / ₪{project.budget.toLocaleString()}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${isOverBudget ? "bg-red-500" : budgetPct > 80 ? "bg-amber-400" : "bg-green-500"}`}
              style={{ width: `${budgetPct}%` }} />
          </div>
        </div>
      )}

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
        <button
          onClick={() => setShowUpdate(true)}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
        >
          <Pencil size={13} />
          עדכן
        </button>
        <button
          onClick={() => setShowGallery(true)}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 flex items-center justify-center gap-2"
        >
          <Camera size={13} />
          גלריה
        </button>
      </div>

      {showUpdate && (
        <UpdateProgressModal
          project={project}
          onClose={() => setShowUpdate(false)}
          onUpdated={(id, prog, stat) => { onUpdate(); setShowUpdate(false); }}
        />
      )}
      {showGallery && (
        <ProjectGalleryModal project={project} onClose={() => setShowGallery(false)} />
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────

function mapProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    customerName: row.customer_name as string || "",
    description: row.description as string || "",
    startDate: row.start_date as string || "",
    endDate: row.end_date as string || "",
    budget: Number(row.budget) || 0,
    spent: Number(row.spent) || 0,
    progress: Number(row.progress) || 0,
    status: (row.status as ProjectStatus) || "planning",
    tasks: (row.tasks as string[]) || [],
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
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
  const activeCount = projects.filter(p => p.status === "active").length;

  const kanbanCols: { key: ProjectStatus; label: string; color: string; header: string }[] = [
    { key: "planning",  label: "תכנון",    color: "bg-amber-50 border-amber-200", header: "bg-amber-400" },
    { key: "active",    label: "פעיל",     color: "bg-blue-50 border-blue-200",   header: "bg-blue-500" },
    { key: "on_hold",   label: "בהמתנה",   color: "bg-gray-50 border-gray-200",   header: "bg-gray-400" },
    { key: "completed", label: "הושלם",    color: "bg-green-50 border-green-200", header: "bg-green-500" },
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
              <Plus size={16} />
              פרויקט חדש
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'סה"כ', value: projects.length, icon: <Briefcase size={18} />, color: "text-violet-600", bg: "bg-violet-50" },
            { label: "פעילים", value: activeCount, icon: <TrendingUp size={18} />, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "תקציב", value: `₪${totalBudget.toLocaleString()}`, icon: <DollarSign size={18} />, color: "text-green-600", bg: "bg-green-50" },
            { label: "הוצאות", value: `₪${totalSpent.toLocaleString()}`, icon: <BarChart2 size={18} />, color: "text-amber-600", bg: "bg-amber-50" },
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
                    {colProjects.map(p => (
                      <div key={p.id} className="bg-white rounded-xl p-3 shadow-sm border border-white">
                        <p className="font-semibold text-gray-800 text-sm truncate">{p.name}</p>
                        <p className="text-xs text-gray-500 mb-2">{p.customerName}</p>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${statusColor(p.status).bar}`} style={{ width: `${p.progress}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 mt-1 block">{p.progress}%</span>
                      </div>
                    ))}
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

      {showNew && <NewProjectModal onClose={() => setShowNew(false)} onCreated={p => { setProjects(prev => [p, ...prev]); }} />}
    </div>
  );
}
