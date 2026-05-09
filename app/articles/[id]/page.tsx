"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Sparkles, Clock, Bookmark, Share2, BookOpen, CheckCircle2, Lightbulb,
  TrendingUp, Wrench, Tag, Loader2, X, Zap, DollarSign,
} from "lucide-react";
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
  practical_steps: string[] | null;
  pro_tip: string | null;
  profit_tip: string | null;
  tags: string[] | null;
  cover_image_url: string | null;
  read_minutes: number | null;
  is_featured: boolean;
  published_at: string;
}

const CATEGORY_LABELS: Record<string, { emoji: string; label: string }> = {
  professional: { emoji: "🌱", label: "גינון מקצועי" },
  plants:       { emoji: "🌿", label: "צמחים וזיהוי" },
  pests:        { emoji: "🐛", label: "מזיקים ומחלות" },
  irrigation:   { emoji: "💧", label: "השקיה ומערכות" },
  business:     { emoji: "💰", label: "ניהול עסק" },
  marketing:    { emoji: "👥", label: "לקוחות ושיווק" },
  tools:        { emoji: "🛠️", label: "כלים וציוד" },
  legal:        { emoji: "⚖️", label: "חוק ורגולציה" },
  trends:       { emoji: "🚀", label: "טרנדים וחדשנות" },
};

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const [artRes, favRes] = await Promise.all([
        supabase.from("articles").select("*").eq("id", id).maybeSingle(),
        user
          ? supabase.from("article_favorites").select("article_id").eq("user_id", user.id).eq("article_id", id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setArticle(artRes.data as Article | null);
      setIsFavorite(!!favRes.data);
      setLoading(false);
      // Track view
      if (user && artRes.data) {
        await supabase.from("article_views").insert({ article_id: id, user_id: user.id });
      }
    })();
  }, [id]);

  async function toggleFavorite() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !article) return;
    if (isFavorite) {
      await supabase.from("article_favorites").delete().eq("user_id", user.id).eq("article_id", article.id);
    } else {
      await supabase.from("article_favorites").insert({ user_id: user.id, article_id: article.id });
    }
    setIsFavorite(!isFavorite);
  }

  async function shareArticle() {
    if (!article) return;
    const text = `📚 ${article.title}\n${article.subtitle || ""}\n\nקרא במרכז הידע של גנן Pro:\n${window.location.href}`;
    if (navigator.share) {
      try { await navigator.share({ title: article.title, text }); return; } catch {}
    }
    // Fallback - WhatsApp
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 1500);
    } catch {}
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={28} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!article) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center p-6 text-center bg-slate-50">
        <div>
          <BookOpen size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-lg text-gray-600 font-bold">המאמר לא נמצא</p>
          <button onClick={() => router.push("/articles")} className="mt-4 text-emerald-600 font-semibold text-sm">חזרה לרשימה</button>
        </div>
      </div>
    );
  }

  const cat = CATEGORY_LABELS[article.category] || { emoji: "📚", label: article.category };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 pb-24 md:pb-12">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <BackButton href="/articles" />
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFavorite}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                isFavorite ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-500"
              }`}
              aria-label="שמור"
            >
              <Bookmark size={16} fill={isFavorite ? "currentColor" : "none"} />
            </button>
            <button
              onClick={shareArticle}
              className="w-9 h-9 rounded-xl bg-gray-100 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 flex items-center justify-center"
              aria-label="שתף"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={() => setShowSummary(true)}
              className="flex items-center gap-1.5 bg-gradient-to-l from-purple-600 to-indigo-600 hover:opacity-90 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm"
            >
              <Sparkles size={14} /> סיכום AI
            </button>
          </div>
        </div>
      </div>

      {/* Article body */}
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Hero */}
          <div className="bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 text-white px-6 sm:px-8 py-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] uppercase tracking-wider bg-white/20 backdrop-blur px-3 py-1 rounded-full font-bold">
                {cat.emoji} {cat.label}
              </span>
              {article.is_featured && (
                <span className="text-[11px] uppercase tracking-wider bg-amber-400 text-amber-900 px-3 py-1 rounded-full font-bold">
                  ⭐ מומלץ
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black leading-tight">{article.title}</h1>
            {article.subtitle && (
              <p className="text-base sm:text-lg opacity-95 mt-2 leading-relaxed">{article.subtitle}</p>
            )}
            <div className="flex items-center gap-3 mt-4 text-xs opacity-90">
              <span className="flex items-center gap-1"><Clock size={12}/> {article.read_minutes || 4} דקות קריאה</span>
              <span>·</span>
              <button onClick={() => setShowSummary(true)} className="flex items-center gap-1 underline font-semibold">
                <Sparkles size={12}/> דלג ישר לסיכום
              </button>
            </div>
          </div>

          {/* Highlight banner */}
          <div className="bg-purple-50 border-b border-purple-100 px-6 sm:px-8 py-4">
            <button
              onClick={() => setShowSummary(true)}
              className="w-full flex items-center justify-between gap-3 text-right group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-md">
                  <Sparkles size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-purple-700 font-bold">⚡ אין זמן לקרוא הכל?</p>
                  <p className="text-sm font-bold text-gray-900">פתח סיכום AI חכם — 15 שניות</p>
                </div>
              </div>
              <span className="text-purple-600 group-hover:translate-x-[-3px] transition-transform">←</span>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 sm:px-8 py-6 space-y-5">
            <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap text-[15px]">
              {article.content}
            </div>

            {/* Practical steps */}
            {article.practical_steps && article.practical_steps.length > 0 && (
              <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-5 mt-6">
                <p className="flex items-center gap-2 text-sm font-black text-emerald-800 mb-3">
                  <Wrench size={16}/> איך מיישמים בשטח
                </p>
                <ol className="space-y-2 list-none">
                  {article.practical_steps.map((step, i) => (
                    <li key={i} className="flex gap-3 items-start">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-800 leading-relaxed pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Pro tip */}
            {article.pro_tip && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
                <p className="flex items-center gap-2 text-sm font-black text-amber-900 mb-2">
                  <Lightbulb size={16}/> טיפ מקצועי
                </p>
                <p className="text-sm text-amber-900 leading-relaxed">{article.pro_tip}</p>
              </div>
            )}

            {/* Profit tip */}
            {article.profit_tip && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-5">
                <p className="flex items-center gap-2 text-sm font-black text-green-800 mb-2">
                  <DollarSign size={16}/> איך להרוויח מזה יותר
                </p>
                <p className="text-sm text-green-900 leading-relaxed">{article.profit_tip}</p>
              </div>
            )}

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-4 border-t border-gray-100">
                {article.tags.map(t => (
                  <span key={t} className="text-[11px] bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Tag size={9}/> {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="px-6 sm:px-8 py-5 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setShowSummary(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-l from-purple-600 to-indigo-600 hover:opacity-90 text-white font-bold py-3 rounded-xl shadow-sm text-sm"
            >
              <Sparkles size={16}/> פתח סיכום AI חכם
            </button>
            <button
              onClick={shareArticle}
              className="flex items-center justify-center gap-2 bg-white border-2 border-gray-200 hover:border-emerald-300 text-gray-700 font-bold py-3 px-5 rounded-xl text-sm"
            >
              <Share2 size={16}/> שתף
            </button>
            <button
              onClick={copyLink}
              className="flex items-center justify-center gap-2 bg-white border-2 border-gray-200 hover:border-emerald-300 text-gray-700 font-bold py-3 px-5 rounded-xl text-sm"
            >
              {shareToast ? <><CheckCircle2 size={16} className="text-green-600"/> הועתק</> : <>📋 העתק קישור</>}
            </button>
          </div>
        </div>
      </article>

      {/* AI Summary Modal */}
      {showSummary && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.target === e.currentTarget && setShowSummary(false)}
        >
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] animate-slide-up" dir="rtl">
            {/* Header */}
            <div className="bg-gradient-to-l from-purple-600 via-indigo-600 to-blue-600 text-white p-5 rounded-t-3xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Sparkles size={22} className="text-white" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider opacity-80 font-bold">סיכום חכם AI</p>
                  <p className="text-base font-black leading-tight">{article.title}</p>
                </div>
              </div>
              <button onClick={() => setShowSummary(false)} className="text-white/80 hover:text-white">
                <X size={22} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Key points */}
              {article.ai_summary?.key_points && article.ai_summary.key_points.length > 0 && (
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-black text-purple-700 uppercase tracking-wider mb-2">
                    <Zap size={12}/> נקודות עיקריות
                  </p>
                  <ul className="space-y-2">
                    {article.ai_summary.key_points.map((p, i) => (
                      <li key={i} className="flex items-start gap-2.5 bg-purple-50 rounded-xl p-3">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-sm text-gray-800 leading-snug">{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action steps */}
              {article.ai_summary?.action_steps && article.ai_summary.action_steps.length > 0 && (
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-black text-emerald-700 uppercase tracking-wider mb-2">
                    <CheckCircle2 size={12}/> מה עושים בפועל
                  </p>
                  <ul className="space-y-2">
                    {article.ai_summary.action_steps.map((s, i) => (
                      <li key={i} className="flex items-start gap-2.5 bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                        <span className="text-emerald-600 mt-0.5">→</span>
                        <span className="text-sm text-gray-800 leading-snug font-medium">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Money angle */}
              {article.ai_summary?.money_angle && (
                <div className="bg-gradient-to-br from-green-100 to-emerald-100 border-2 border-green-300 rounded-2xl p-4">
                  <p className="flex items-center gap-1.5 text-xs font-black text-green-800 uppercase tracking-wider mb-1.5">
                    <TrendingUp size={12}/> איפה הכסף פה
                  </p>
                  <p className="text-sm text-green-900 font-semibold leading-snug">{article.ai_summary.money_angle}</p>
                </div>
              )}

              <p className="text-[10px] text-gray-400 text-center pt-2">
                ✨ סיכום זה נוצר על ידי AI כדי לחסוך לך זמן יקר
              </p>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                onClick={() => setShowSummary(false)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold"
              >
                המשך לקרוא את המאמר
              </button>
              <button
                onClick={shareArticle}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold"
              >
                <Share2 size={14}/> שתף
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  );
}
