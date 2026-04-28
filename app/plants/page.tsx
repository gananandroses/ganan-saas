"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Search, X, Sun, Droplets, Ruler, Calendar, Lightbulb } from "lucide-react";
import { PLANTS, PLANT_CATEGORIES, type Plant } from "@/lib/plants-data";

const SUN_LABELS: Record<string, string> = {
  full: "שמש מלאה",
  partial: "חצי-שמש",
  shade: "צל",
};

const SUN_ICONS: Record<string, string> = {
  full: "☀️",
  partial: "⛅",
  shade: "🌑",
};

const WATER_LABELS: Record<string, string> = {
  low: "מים מועטים",
  medium: "מים בינוני",
  high: "מים רב",
};

const WATER_ICONS: Record<string, string> = {
  low: "💧",
  medium: "💧💧",
  high: "💧💧💧",
};

function getCategoryLabel(key: string): string {
  return PLANT_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

const GRADIENT_MAP: Record<string, string> = {
  "fruit-trees":    "from-red-100 to-orange-100",
  "citrus":         "from-yellow-100 to-orange-100",
  "ornamental-trees":"from-purple-100 to-blue-100",
  "trees":          "from-green-100 to-teal-100",
  "shrubs":         "from-green-100 to-lime-100",
  "privacy-shrubs": "from-gray-100 to-green-100",
  "perennials":     "from-pink-100 to-rose-100",
  "annuals":        "from-yellow-100 to-pink-100",
  "indoor":         "from-emerald-100 to-teal-100",
  "succulents":     "from-lime-100 to-green-100",
  "cacti":          "from-yellow-100 to-lime-100",
  "trailing":       "from-teal-100 to-cyan-100",
  "shade":          "from-gray-100 to-blue-100",
  "geophytes":      "from-purple-100 to-pink-100",
  "herbs":          "from-green-100 to-emerald-100",
  "climbers":       "from-blue-100 to-teal-100",
};

function PlantImage({ plant, className }: { plant: Plant; className: string }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const cacheKey = `wi_${plant.id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) { if (cached !== "none") setImgUrl(cached); return; }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const title = encodeURIComponent(plant.nameLatin.replace(/ × /g, "_").replace(/ /g, "_"));
      fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          const url = data?.thumbnail?.source;
          if (url) { setImgUrl(url); sessionStorage.setItem(cacheKey, url); }
          else sessionStorage.setItem(cacheKey, "none");
        })
        .catch(() => sessionStorage.setItem(cacheKey, "none"));
    }, { rootMargin: "300px" });

    observer.observe(el);
    return () => observer.disconnect();
  }, [plant.id, plant.nameLatin]);

  const emoji = PLANT_CATEGORIES.find(c => c.key === plant.categories[0])?.emoji ?? "🌿";
  const gradient = GRADIENT_MAP[plant.categories[0]] ?? "from-green-100 to-emerald-100";

  return (
    <div ref={ref} className={`relative ${className} overflow-hidden`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        <span className="text-5xl opacity-40">{emoji}</span>
      </div>
      {imgUrl && (
        <img
          src={imgUrl}
          alt={plant.nameHe}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
          onError={() => setImgUrl(null)}
        />
      )}
    </div>
  );
}

function PlantCard({ plant, onClick }: { plant: Plant; onClick: () => void }) {
  const firstTwo = plant.categories.slice(0, 2);

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden text-right w-full group"
    >
      {/* Image */}
      <div className="relative h-44 bg-gray-100 overflow-hidden">
        <PlantImage plant={plant} className="absolute inset-0 w-full h-full group-hover:scale-105 transition-transform duration-300" />
        {/* Badges overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2 flex items-center gap-2">
          <span className="text-white text-xs font-medium">{SUN_ICONS[plant.sun]}</span>
          <span className="text-white text-xs">{WATER_ICONS[plant.water]}</span>
          {plant.height && (
            <span className="mr-auto text-white text-xs opacity-80">{plant.height}</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-bold text-gray-900 text-base leading-snug">{plant.nameHe}</h3>
        <p className="text-gray-400 text-xs italic mb-2">{plant.nameLatin}</p>
        <div className="flex flex-wrap gap-1">
          {firstTwo.map((cat) => (
            <span
              key={cat}
              className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium"
            >
              {getCategoryLabel(cat)}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

function PlantModal({ plant, onClose }: { plant: Plant; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div className="relative h-56">
          <PlantImage plant={plant} className="absolute inset-0 w-full h-full" />
          <button
            onClick={onClose}
            className="absolute top-3 left-3 w-9 h-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5" dir="rtl">
          {/* Names */}
          <h2 className="text-2xl font-bold text-gray-900">{plant.nameHe}</h2>
          <p className="text-gray-500 text-sm italic mb-3">{plant.nameLatin}</p>

          {/* Category badges */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {plant.categories.map((cat) => (
              <span
                key={cat}
                className="bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full font-medium"
              >
                {getCategoryLabel(cat)}
              </span>
            ))}
          </div>

          {/* Description */}
          {plant.description && (
            <p className="text-gray-700 text-sm leading-relaxed mb-4">{plant.description}</p>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-amber-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Sun size={14} className="text-amber-500" />
                <span className="text-xs font-semibold text-amber-700">אור שמש</span>
              </div>
              <p className="text-sm font-bold text-gray-800">
                {SUN_ICONS[plant.sun]} {SUN_LABELS[plant.sun]}
              </p>
            </div>

            <div className="bg-blue-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Droplets size={14} className="text-blue-500" />
                <span className="text-xs font-semibold text-blue-700">השקיה</span>
              </div>
              <p className="text-sm font-bold text-gray-800">
                {WATER_ICONS[plant.water]} {WATER_LABELS[plant.water]}
              </p>
            </div>

            {plant.height && (
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Ruler size={14} className="text-gray-500" />
                  <span className="text-xs font-semibold text-gray-600">גובה</span>
                </div>
                <p className="text-sm font-bold text-gray-800">{plant.height}</p>
              </div>
            )}

            {plant.bloomSeason && (
              <div className="bg-pink-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Calendar size={14} className="text-pink-500" />
                  <span className="text-xs font-semibold text-pink-700">עונת פריחה</span>
                </div>
                <p className="text-sm font-bold text-gray-800">{plant.bloomSeason}</p>
              </div>
            )}
          </div>

          {/* Tips */}
          {plant.tips && (
            <div className="bg-green-50 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Lightbulb size={14} className="text-green-600" />
                <span className="text-xs font-semibold text-green-700">טיפ טיפול</span>
              </div>
              <p className="text-sm text-green-800">{plant.tips}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PlantsPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);

  const filtered = useMemo(() => {
    return PLANTS.filter((p) => {
      const matchCat = activeCategory === "all" || p.categories.includes(activeCategory);
      const q = search.toLowerCase();
      const matchSearch = !q || p.nameHe.includes(q) || p.nameLatin.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [search, activeCategory]);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-0.5">🌿 עולם הצמחים</h1>
        <p className="text-gray-500 text-sm">{PLANTS.length} צמחים במאגר · {filtered.length} מוצגים</p>

        {/* Search */}
        <div className="mt-4 relative">
          <Search
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש צמח בעברית או בלטינית..."
            className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pr-9 pl-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Category pills */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {PLANT_CATEGORIES.map((cat) => {
            const active = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                  active
                    ? "bg-green-600 text-white shadow-sm"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-green-300 hover:text-green-700"
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="px-4 sm:px-6 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🌱</p>
            <p className="text-lg font-medium">לא נמצאו צמחים</p>
            <p className="text-sm mt-1">נסה לשנות את החיפוש או הקטגוריה</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((plant) => (
              <PlantCard
                key={plant.id}
                plant={plant}
                onClick={() => setSelectedPlant(plant)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedPlant && (
        <PlantModal plant={selectedPlant} onClose={() => setSelectedPlant(null)} />
      )}
    </div>
  );
}
