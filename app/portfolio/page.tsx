"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Loader2, ImageIcon, X, ChevronLeft, ChevronRight, Briefcase, Camera, Search } from "lucide-react";

interface ProjectWithImages {
  id: string;
  name: string;
  customerName: string;
  status: string;
  images: { name: string; url: string }[];
}

const BUCKET = "project-images";

export default function PortfolioPage() {
  const [projects, setProjects] = useState<ProjectWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<{ projectIdx: number; imgIdx: number } | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "completed" | "active">("all");

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);

    // Fetch projects
    const { data: projectsData } = await supabase
      .from("projects")
      .select("id, name, customer_name, status")
      .order("created_at", { ascending: false });

    if (!projectsData) { setLoading(false); return; }

    // Fetch images for each project
    const withImages: ProjectWithImages[] = await Promise.all(
      projectsData.map(async (p) => {
        const { data: files } = await supabase.storage
          .from(BUCKET)
          .list(p.id, { sortBy: { column: "created_at", order: "asc" } });

        const images = (files || [])
          .filter(f => f.name !== ".emptyFolderPlaceholder")
          .map(f => ({
            name: f.name,
            url: supabase.storage.from(BUCKET).getPublicUrl(`${p.id}/${f.name}`).data.publicUrl,
          }));

        return {
          id: p.id,
          name: p.name,
          customerName: p.customer_name || "",
          status: p.status || "planning",
          images,
        };
      })
    );

    // Only show projects with images
    setProjects(withImages.filter(p => p.images.length > 0));
    setLoading(false);
  }

  // Flatten all images for lightbox navigation
  const allImages = projects.flatMap((p, pi) =>
    p.images.map((img, ii) => ({ ...img, projectName: p.name, projectIdx: pi, imgIdx: ii }))
  );

  function openLightbox(projectIdx: number, imgIdx: number) {
    setLightbox({ projectIdx, imgIdx });
  }

  function lightboxNext() {
    if (!lightbox) return;
    const flat = allImages;
    const cur = flat.findIndex(i => i.projectIdx === lightbox.projectIdx && i.imgIdx === lightbox.imgIdx);
    const next = flat[(cur + 1) % flat.length];
    setLightbox({ projectIdx: next.projectIdx, imgIdx: next.imgIdx });
  }

  function lightboxPrev() {
    if (!lightbox) return;
    const flat = allImages;
    const cur = flat.findIndex(i => i.projectIdx === lightbox.projectIdx && i.imgIdx === lightbox.imgIdx);
    const prev = flat[(cur - 1 + flat.length) % flat.length];
    setLightbox({ projectIdx: prev.projectIdx, imgIdx: prev.imgIdx });
  }

  const statusLabel: Record<string, string> = {
    active: "פעיל", planning: "תכנון", completed: "הושלם", on_hold: "בהמתנה",
  };
  const statusColor: Record<string, string> = {
    active: "bg-blue-100 text-blue-700",
    planning: "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
    on_hold: "bg-gray-100 text-gray-600",
  };

  const filtered = projects.filter(p => {
    if (filter === "completed" && p.status !== "completed") return false;
    if (filter === "active" && p.status !== "active") return false;
    if (search && !p.name.includes(search) && !p.customerName.includes(search)) return false;
    return true;
  });

  const totalImages = projects.reduce((s, p) => s + p.images.length, 0);
  const currentLightboxImg = lightbox
    ? projects[lightbox.projectIdx]?.images[lightbox.imgIdx]
    : null;

  return (
    <div dir="rtl" className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 px-6 pt-10 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
              <Camera className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">תיק עבודות</h1>
              <p className="text-sm text-gray-400">{projects.length} פרויקטים · {totalImages} תמונות</p>
            </div>
          </div>

          {/* Search + filter */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="חפש פרויקט או לקוח..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
              />
            </div>
            <div className="flex gap-2">
              {(["all", "active", "completed"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    filter === f
                      ? "bg-green-600 text-white"
                      : "bg-white/10 text-gray-400 hover:bg-white/15"
                  }`}>
                  {f === "all" ? "הכל" : f === "active" ? "פעילים" : "הושלמו"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-10 h-10 animate-spin text-green-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
              <ImageIcon className="w-9 h-9 text-gray-600" />
            </div>
            <p className="text-gray-400 font-medium">
              {projects.length === 0 ? "עדיין אין תמונות בתיק העבודות" : "אין תוצאות לחיפוש"}
            </p>
            {projects.length === 0 && (
              <p className="text-gray-600 text-sm mt-1">העלה תמונות מדף הפרויקטים</p>
            )}
          </div>
        ) : (
          <div className="space-y-12">
            {filtered.map((project, pi) => (
              <div key={project.id}>
                {/* Project header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-green-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-white truncate">{project.name}</h2>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[project.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {statusLabel[project.status] ?? project.status}
                      </span>
                    </div>
                    {project.customerName && (
                      <p className="text-sm text-gray-500">{project.customerName}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-600 flex-shrink-0">{project.images.length} תמונות</span>
                </div>

                {/* Image grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {project.images.map((img, ii) => (
                    <button
                      key={img.name}
                      onClick={() => openLightbox(projects.indexOf(project), ii)}
                      className="aspect-square rounded-xl overflow-hidden bg-gray-800 hover:ring-2 hover:ring-green-500 transition-all group relative"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={`${project.name} - ${ii + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </button>
                  ))}
                </div>

                {/* Divider */}
                <div className="mt-10 border-b border-white/5" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && currentLightboxImg && (
        <div className="fixed inset-0 z-[80] bg-black/95 flex flex-col" onClick={() => setLightbox(null)}>
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <div>
              <p className="text-white font-semibold text-sm">{projects[lightbox.projectIdx]?.name}</p>
              <p className="text-gray-500 text-xs">{projects[lightbox.projectIdx]?.customerName}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-500 text-sm">
                {allImages.findIndex(i => i.projectIdx === lightbox.projectIdx && i.imgIdx === lightbox.imgIdx) + 1} / {allImages.length}
              </span>
              <button onClick={() => setLightbox(null)} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center px-16 relative" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentLightboxImg.url}
              alt="תמונת פרויקט"
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            />

            <button onClick={lightboxPrev}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
              <ChevronRight size={22} />
            </button>
            <button onClick={lightboxNext}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
              <ChevronLeft size={22} />
            </button>
          </div>

          {/* Thumbnail strip */}
          <div className="flex gap-2 px-5 py-4 overflow-x-auto flex-shrink-0" onClick={e => e.stopPropagation()}>
            {projects[lightbox.projectIdx]?.images.map((img, ii) => (
              <button key={img.name} onClick={() => setLightbox({ projectIdx: lightbox.projectIdx, imgIdx: ii })}
                className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden transition-all ${ii === lightbox.imgIdx ? "ring-2 ring-green-500 opacity-100" : "opacity-40 hover:opacity-70"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
