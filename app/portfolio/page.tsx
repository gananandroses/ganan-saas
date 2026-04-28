"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Loader2, ImageIcon, X, ChevronLeft, ChevronRight, Camera,
  Folder, FolderPlus, Upload, Trash2, Share2, Plus, Search, Play,
} from "lucide-react";

function isVideo(name: string) {
  return /\.(mp4|mov|avi|webm|mkv|m4v)$/i.test(name);
}

const BUCKET = "project-images";
const PREFIX = "portfolio";

interface FolderItem {
  name: string;
  imageCount: number;
  coverUrl: string | null;
}

export default function PortfolioPage() {
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [images, setImages] = useState<{ name: string; url: string; isVideo: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function fetchContents() {
    setLoading(true);
    setImages([]);
    setFolders([]);

    if (currentFolder === null) {
      const { data } = await supabase.storage.from(BUCKET).list(PREFIX, { sortBy: { column: "name", order: "asc" } });
      if (data) {
        const folderItems = data.filter(f => f.id === null);
        const foldersWithMeta = await Promise.all(
          folderItems.map(async (folder) => {
            const { data: files } = await supabase.storage.from(BUCKET).list(`${PREFIX}/${folder.name}`, { sortBy: { column: "created_at", order: "asc" } });
            const realFiles = (files || []).filter(f => f.id !== null && f.name !== ".emptyFolderPlaceholder");
            const count = realFiles.length;
            const coverFile = realFiles.find(f => !isVideo(f.name)) || realFiles[0];
            const coverUrl = coverFile
              ? supabase.storage.from(BUCKET).getPublicUrl(`${PREFIX}/${folder.name}/${coverFile.name}`).data.publicUrl
              : null;
            return { name: folder.name, imageCount: count, coverUrl };
          })
        );
        setFolders(foldersWithMeta);
      }
    } else {
      const { data } = await supabase.storage.from(BUCKET).list(`${PREFIX}/${currentFolder}`, { sortBy: { column: "created_at", order: "asc" } });
      if (data) {
        const files = data.filter(f => f.id !== null && f.name !== ".emptyFolderPlaceholder");
        setImages(files.map(f => ({
          name: f.name,
          url: supabase.storage.from(BUCKET).getPublicUrl(`${PREFIX}/${currentFolder}/${f.name}`).data.publicUrl,
          isVideo: isVideo(f.name),
        })));
      }
    }
    setLoading(false);
  }

  useEffect(() => { fetchContents(); }, [currentFolder]); // eslint-disable-line react-hooks/exhaustive-deps

  async function createFolder() {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    const placeholder = new Blob([""], { type: "text/plain" });
    await supabase.storage.from(BUCKET).upload(
      `${PREFIX}/${newFolderName.trim()}/.emptyFolderPlaceholder`,
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
    if (!files.length || !currentFolder) return;
    setUploading(true);
    setUploadError(null);
    for (const file of files) {
      const ext = file.name.split(".").pop() || "jpg";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(`${PREFIX}/${currentFolder}/${filename}`, file, { upsert: false });
      if (error) {
        setUploadError("❌ שגיאה: " + error.message);
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }
    await fetchContents();
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDelete(img: { name: string }) {
    setDeleting(img.name);
    await supabase.storage.from(BUCKET).remove([`${PREFIX}/${currentFolder}/${img.name}`]);
    setImages(prev => prev.filter(i => i.name !== img.name));
    if (lightbox !== null) setLightbox(null);
    setDeleting(null);
  }

  async function deleteFolder(folderName: string) {
    // List and delete all files in folder
    const { data: files } = await supabase.storage.from(BUCKET).list(`${PREFIX}/${folderName}`);
    if (files && files.length > 0) {
      await supabase.storage.from(BUCKET).remove(files.map(f => `${PREFIX}/${folderName}/${f.name}`));
    }
    await fetchContents();
  }

  // Share
  const shareText = currentFolder
    ? `תיק עבודות — ${currentFolder}\n\n${images.map((img, i) => `תמונה ${i + 1}: ${img.url}`).join("\n")}`
    : "";

  async function copyLink() {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setShowShare(false);
  }

  const filteredFolders = folders.filter(f => !search || f.name.includes(search));
  const totalImages = folders.reduce((s, f) => s + f.imageCount, 0);

  return (
    <div dir="rtl" className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 px-5 pt-8 pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              {currentFolder !== null && (
                <button
                  onClick={() => { setCurrentFolder(null); setLightbox(null); }}
                  className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              )}
              <div>
                <h1 className="text-xl font-bold text-white">
                  {currentFolder !== null ? currentFolder : "תיק עבודות"}
                </h1>
                <p className="text-sm text-gray-400">
                  {currentFolder !== null
                    ? `${images.length} תמונות`
                    : `${folders.length} תיקיות · ${totalImages} תמונות`}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {currentFolder !== null ? (
                <>
                  {images.length > 0 && (
                    <div className="relative">
                      <button onClick={() => setShowShare(s => !s)}
                        className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors">
                        <Share2 size={14} /> שתף
                      </button>
                      {showShare && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowShare(false)} />
                          <div className="absolute left-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20 w-52" dir="rtl">
                            {typeof navigator !== "undefined" && "share" in navigator && (
                              <button onClick={async () => { await navigator.share({ title: currentFolder, text: shareText }); setShowShare(false); }}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 font-medium">
                                <span className="text-lg">📲</span> שתף (תפריט הטלפון)
                              </button>
                            )}
                            <button onClick={() => { window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank"); setShowShare(false); }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 border-t border-gray-50">
                              <span className="text-lg">💬</span> WhatsApp
                            </button>
                            <button onClick={() => { window.open(`mailto:?subject=${encodeURIComponent("תיק עבודות — " + currentFolder)}&body=${encodeURIComponent(shareText)}`, "_blank"); setShowShare(false); }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 border-t border-gray-50">
                              <span className="text-lg">✉️</span> Gmail / מייל
                            </button>
                            <button onClick={copyLink}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 border-t border-gray-50">
                              <span className="text-lg">{copied ? "✅" : "🔗"}</span> {copied ? "הועתק!" : "העתק קישורים"}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors">
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {uploading ? "מעלה..." : "הוסף תמונות"}
                  </button>
                </>
              ) : (
                <button onClick={() => setShowNewFolder(true)}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors">
                  <FolderPlus size={14} /> תיקייה חדשה
                </button>
              )}
            </div>
          </div>

          {/* Search (only on root) */}
          {currentFolder === null && folders.length > 0 && (
            <div className="relative mt-4">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="חפש תיקייה..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
              />
            </div>
          )}
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleUpload} />

      {/* New folder dialog */}
      {showNewFolder && (
        <div className="max-w-4xl mx-auto px-5 pt-4">
          <div className="bg-white rounded-2xl p-4 space-y-3 shadow-lg">
            <p className="text-sm font-bold text-gray-800">שם התיקייה החדשה</p>
            <input
              autoFocus
              type="text"
              placeholder='למשל: "גינת גג — בית לוי", "חצר — משפחת כהן"'
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <div className="flex gap-2">
              <button onClick={createFolder} disabled={!newFolderName.trim() || creatingFolder}
                className="flex items-center gap-1.5 bg-green-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl">
                {creatingFolder ? <Loader2 size={13} className="animate-spin" /> : <FolderPlus size={13} />}
                {creatingFolder ? "יוצר..." : "צור"}
              </button>
              <button onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}
                className="text-sm font-medium text-gray-500 px-4 py-2 rounded-xl hover:bg-gray-100">
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {uploadError && (
        <div className="max-w-4xl mx-auto px-5 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
            <p className="text-sm text-red-700 flex-1">{uploadError}</p>
            <button onClick={() => setUploadError(null)} className="text-red-400"><X size={16} /></button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto px-5 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-10 h-10 animate-spin text-green-500" />
          </div>
        ) : currentFolder === null ? (
          /* ── Folders view ── */
          filteredFolders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
                <Folder className="w-9 h-9 text-gray-600" />
              </div>
              <p className="text-gray-400 font-medium mb-1">
                {folders.length === 0 ? "תיק העבודות ריק" : "אין תוצאות"}
              </p>
              {folders.length === 0 && (
                <>
                  <p className="text-gray-600 text-sm mt-1">צור תיקייה ראשונה והוסף תמונות</p>
                  <button onClick={() => setShowNewFolder(true)}
                    className="mt-5 flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl font-semibold text-sm">
                    <FolderPlus size={16} /> צור תיקייה ראשונה
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredFolders.map(folder => (
                <div key={folder.name} className="group relative">
                  <button
                    onClick={() => setCurrentFolder(folder.name)}
                    className="w-full aspect-square rounded-2xl overflow-hidden bg-gray-800 hover:ring-2 hover:ring-green-500 transition-all relative"
                  >
                    {folder.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={folder.coverUrl} alt={folder.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Folder size={40} className="text-gray-600" />
                      </div>
                    )}
                    {/* Dark overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    {/* Folder info */}
                    <div className="absolute bottom-0 right-0 left-0 p-3 text-right">
                      <p className="text-white font-bold text-sm leading-tight truncate">{folder.name}</p>
                      <p className="text-white/60 text-xs">{folder.imageCount} תמונות</p>
                    </div>
                  </button>
                  {/* Delete folder button — always visible */}
                  <button
                    onClick={async (e) => { e.stopPropagation(); if (confirm(`למחוק את התיקייה "${folder.name}" וכל תמונותיה?`)) await deleteFolder(folder.name); }}
                    className="absolute top-2 left-2 w-7 h-7 bg-black/60 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {/* New folder tile */}
              <button onClick={() => setShowNewFolder(true)}
                className="aspect-square rounded-2xl border-2 border-dashed border-white/10 hover:border-green-500 hover:bg-green-500/5 flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-green-400 transition-all">
                <FolderPlus size={28} />
                <span className="text-xs font-medium">תיקייה חדשה</span>
              </button>
            </div>
          )
        ) : (
          /* ── Images inside folder ── */
          images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
                <ImageIcon className="w-9 h-9 text-gray-600" />
              </div>
              <p className="text-gray-400 font-medium mb-1">התיקייה ריקה</p>
              <p className="text-gray-600 text-sm mb-5">העלה תמונות לתיקייה "{currentFolder}"</p>
              <button onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl font-semibold text-sm">
                <Camera size={16} /> העלה תמונה ראשונה
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((img, idx) => (
                <div key={img.name} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-800 cursor-pointer"
                  onClick={() => setLightbox(idx)}>
                  {img.isVideo ? (
                    <>
                      <video src={img.url} className="w-full h-full object-cover" muted playsInline />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center">
                          <Play size={18} className="text-gray-800 mr-[-2px]" fill="currentColor" />
                        </div>
                      </div>
                    </>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.url} alt={`פריט ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  )}
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(img); }} disabled={deleting === img.name}
                    className="absolute top-1.5 left-1.5 w-7 h-7 bg-black/60 hover:bg-red-600 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {deleting === img.name ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                  <div className="absolute bottom-1.5 right-1.5 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-md">{idx + 1}</div>
                </div>
              ))}
              {/* Upload tile */}
              <button onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-green-500 hover:bg-green-500/5 flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-green-400 transition-all">
                <Plus size={24} />
                <span className="text-xs font-medium">הוסף</span>
              </button>
            </div>
          )
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && images[lightbox] && (
        <div className="fixed inset-0 z-[80] bg-black/95 flex flex-col" onClick={() => setLightbox(null)}>
          <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <p className="text-white font-semibold text-sm">{currentFolder}</p>
            <div className="flex items-center gap-3">
              <span className="text-gray-500 text-sm">{lightbox + 1} / {images.length}</span>
              <button onClick={() => setLightbox(null)} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center px-16 relative" onClick={e => e.stopPropagation()}>
            {images[lightbox].isVideo ? (
              <video src={images[lightbox].url} controls autoPlay className="max-w-full max-h-full rounded-xl shadow-2xl" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images[lightbox].url} alt="" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
            )}
            {lightbox > 0 && (
              <button onClick={() => setLightbox(l => l! - 1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white">
                <ChevronRight size={22} />
              </button>
            )}
            {lightbox < images.length - 1 && (
              <button onClick={() => setLightbox(l => l! + 1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white">
                <ChevronLeft size={22} />
              </button>
            )}
          </div>

          <div className="flex gap-2 px-5 py-4 overflow-x-auto flex-shrink-0" onClick={e => e.stopPropagation()}>
            {images.map((img, ii) => (
              <button key={img.name} onClick={() => setLightbox(ii)}
                className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden transition-all relative ${ii === lightbox ? "ring-2 ring-green-500 opacity-100" : "opacity-40 hover:opacity-70"}`}>
                {img.isVideo ? (
                  <>
                    <video src={img.url} className="w-full h-full object-cover" muted />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play size={12} className="text-white" fill="white" />
                    </div>
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
