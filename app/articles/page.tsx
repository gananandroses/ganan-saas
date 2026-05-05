"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, BookOpen, Sparkles, Clock, Bookmark, ChevronLeft, Filter, TrendingUp, Star, Heart } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import BackButton from "@/components/BackButton";

interface Article {
  id: string;
  category: string;
  title: string;
  subtitle: string | null;
  content: string;
  ai_summary: {
    key_points?: string[];
    action_steps?: string[];
    money_angle?: string;
  };
  tags: string[] | null;
  cover_image_url: string | null;
  read_minutes: number | null;
  is_featured: boolean;
  published_at: string;
}

const CATEGORIES = [
  { id: "all", label: "הכל", emoji: "📚" },
  { id: "professional", label: "גינון מקצועי", emoji: "🌱" },
  { id: "plants", label: "צמחים וזיהוי", emoji: "🌿" },
  { id: "pests", label: "מזיקים ומחלות", emoji: "🐛" },
  { id: "irrigation", label: "השקיה ומערכות", emoji: "💧" },
  { id: "business", label: "ניהול עסק", emoji: "💰" },
  { id: "marketing", label: "לקוחות ושיווק", emoji: "👥" },
  { id: "tools", label: "כלים וציוד", emoji: "🛠️" },
  { id: "legal", label: "חוק ורגולציה", emoji: "⚖️" },
  { id: "trends", label: "טרנדים וחדשנות", emoji: "🚀" },
];

export default function ArticlesListPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [showOnlyFav, setShowOnlyFav] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();

      const [articlesRes, favRes] = await Promise.all([
        supabase
          .from("articles")
          .select("id, category, title, subtitle, content, ai_summary, tags, cover_image_url, read_minutes, is_featured, published_at")
          .eq("is_published", true)
          .order("is_featured", { ascending: false })
          .order("published_at", { ascending: false }),
        user
          ? supabase.from("article_favorites").select("article_id").eq("user_id", user.id)
          : Promise.resolve({ data: [] }),
      ]);

      setArticles((articlesRes.data || []) as Article[]);
      setFavorites(new Set((favRes.data || []).map((f: { article_id: string }) => f.article_id)));
      setLoading(false);
    })();
  }, []);

  async function toggleFavorite(articleId: string, e: React.MouseEvent) {
    e.stopPropagation();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const newFav = new Set(favorites);
    if (newFav.has(articleId)) {
      newFav.delete(articleId);
      await supabase.from("article_favorites").delete().eq("user_id", user.id).eq("article_id", articleId);
    } else {
      newFav.add(articleId);
      await supabase.from("article_favorites").insert({ user_id: user.id, article_id: articleId });
    }
    setFavorites(newFav);
  }

  const filtered = useMemo(() => {
    let list = articles;
    if (activeCat !== "all") list = list.filter(a => a.category === activeCat);
    if (showOnlyFav) list = list.filter(a => favorites.has(a.id));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.subtitle?.toLowerCase().includes(q)) ||
        (a.tags?.some(t => t.toLowerCase().includes(q)))
      );
    }
    return list;
  }, [articles, activeCat, search, showOnlyFav, favorites]);

  const featured = articles.filter(a => a.is_featured).slice(0, 3);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 pb-20 md:pb-8">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <BookOpen size={24} className="text-emerald-600" /> מרכז ידע
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">מאמרים מקצועיים עם סיכום AI חכם — קריאה תוך 15 שניות</p>
            </div>
          </div>
          <button
            onClick={() => setShowOnlyFav(!showOnlyFav)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border-2 transition-colors ${
              showOnlyFav
                ? "bg-amber-100 border-amber-300 text-amber-800"
                : "bg-white border-gray-200 text-gray-600 hover:border-amber-200"
            }`}
          >
            <Bookmark size={14} fill={showOnlyFav ? "currentColor" : "none"} />
            {showOnlyFav ? "מועדפים" : "כל המאמרים"}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חפש מאמר, תגית, נושא..."
            className="w-full bg-white border border-gray-200 rounded-2xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
          />
        </div>

        {/* Featured (only when no filter active) */}
        {!search && activeCat === "all" && !showOnlyFav && featured.length > 0 && (
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">
              <Star size={12} fill="currentColor" /> מומלצים השבוע
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {featured.map(a => (
                <button
                  key={a.id}
                  onClick={() => router.push(`/articles/${a.id}`)}
                  className="text-right bg-gradient-to-br from-emerald-500 via-green-600 to-teal-600 text-white rounded-2xl p-4 shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
                >
                  <p className="text-[10px] uppercase tracking-wider opacity-80 font-bold">
                    {CATEGORIES.find(c => c.id === a.category)?.emoji} {CATEGORIES.find(c => c.id === a.category)?.label}
                  </p>
                  <p className="text-base font-black mt-1 leading-tight">{a.title}</p>
                  {a.subtitle && <p className="text-xs opacity-90 mt-1.5 line-clamp-2">{a.subtitle}</p>}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/20">
                    <span className="text-[11px] flex items-center gap-1 opacity-90"><Clock size={11}/> {a.read_minutes || 4} דק׳</span>
                    <span className="text-[11px] flex items-center gap-1 font-bold"><Sparkles size={11}/> סיכום AI</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Categories pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border-2 transition-all whitespace-nowrap ${
                activeCat === c.id
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                  : "bg-white border-gray-200 text-gray-700 hover:border-emerald-300"
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse h-32" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <Filter size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-700">לא נמצאו מאמרים</p>
            <p className="text-xs text-gray-500 mt-1">נסה חיפוש אחר או קטגוריה אחרת</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map(a => {
              const cat = CATEGORIES.find(c => c.id === a.category);
              const isFav = favorites.has(a.id);
              return (
                <div
                  key={a.id}
                  onClick={() => router.push(`/articles/${a.id}`)}
                  className="bg-white rounded-2xl border border-gray-100 p-4 cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all group relative"
                >
                  <button
                    onClick={(e) => toggleFavorite(a.id, e)}
                    className={`absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isFav ? "bg-amber-100 text-amber-600" : "bg-gray-50 text-gray-300 hover:bg-amber-50 hover:text-amber-500"
                    }`}
                  >
                    <Bookmark size={14} fill={isFav ? "currentColor" : "none"} />
                  </button>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {cat?.emoji} {cat?.label}
                    </span>
                    {a.is_featured && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star size={9} fill="currentColor" /> מומלץ
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-black text-gray-900 leading-tight line-clamp-2 group-hover:text-emerald-700 transition-colors">
                    {a.title}
                  </h3>
                  {a.subtitle && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.subtitle}</p>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                    <span className="text-[11px] text-gray-500 flex items-center gap-1">
                      <Clock size={11}/> {a.read_minutes || 4} דק׳
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <Sparkles size={11}/> סיכום AI <ChevronLeft size={11}/>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
