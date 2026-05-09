"use client";

// "New quote" entry point — replaces the previous direct navigate to
// /quote/new with a chooser:
//   1) Pick a pre-built template (recurring maintenance, garden reset,
//      irrigation, plantings, pruning, cleanup, controller install,
//      new irrigation system) — fills the new quote with realistic items
//      and a notes block. The gardener edits placeholders ([שם לקוח],
//      [מחיר], [ימי עבודה], [אחריות]) and adds price.
//   2) Or: empty quote — same flow as before.
//
// Mounted from /quote (the list page). Shows as a bottom-sheet on mobile,
// centred sheet on desktop.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ArrowLeft, FileText, Sparkles, ChevronLeft } from "lucide-react";
import { QUOTE_TEMPLATES } from "@/lib/quote-templates";

interface Props { onClose: () => void }

type Stage = "choose" | "templates";

export default function QuoteCreatorModal({ onClose }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("choose");

  // Esc to close, restore body scroll
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function startBlank() {
    onClose();
    router.push("/quote/new");
  }

  function startFromTemplate(templateId: string) {
    onClose();
    router.push(`/quote/new?template=${encodeURIComponent(templateId)}`);
  }

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qcm-title"
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full sm:max-w-2xl sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden animate-sheet-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {stage === "templates" && (
              <button
                onClick={() => setStage("choose")}
                aria-label="חזרה"
                className="hit-44 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
              >
                <ChevronLeft size={16} className="text-gray-600" />
              </button>
            )}
            <h2 id="qcm-title" className="text-base font-bold text-gray-900 truncate">
              {stage === "choose" ? "הצעת מחיר חדשה" : "תבניות מוכנות"}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="סגור"
            className="hit-44 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {stage === "choose" ? (
            <ChooseStage
              onPickBlank={startBlank}
              onPickTemplate={() => setStage("templates")}
            />
          ) : (
            <TemplatesStage onPick={startFromTemplate} />
          )}
        </div>

        <style jsx>{`
          @keyframes sheet-in {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .animate-sheet-in { animation: sheet-in 240ms cubic-bezier(0.16, 1, 0.3, 1); }
        `}</style>
      </div>
    </div>
  );
}

// ── Stage 1: choose blank or template ───────────────────────────────────────

function ChooseStage({
  onPickBlank, onPickTemplate,
}: { onPickBlank: () => void; onPickTemplate: () => void }) {
  return (
    <div className="p-5 sm:p-6 space-y-3">
      <p className="text-sm text-gray-500 mb-2">איך תרצה להתחיל?</p>

      <button
        onClick={onPickTemplate}
        className="w-full text-right group relative overflow-hidden rounded-2xl border-2 border-emerald-200 bg-gradient-to-l from-emerald-50 to-white hover:border-emerald-400 hover:shadow-md transition-all p-5 flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
          <Sparkles size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-gray-900">תבנית מוכנה</span>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">מהיר</span>
          </div>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            9 תבניות מקצועיות לעבודות גינון נפוצות — אחזקה, איפוס, השקיה, גיזום ועוד
          </p>
        </div>
        <ArrowLeft size={18} className="text-emerald-600 flex-shrink-0 group-hover:-translate-x-1 transition-transform" />
      </button>

      <button
        onClick={onPickBlank}
        className="w-full text-right group rounded-2xl border-2 border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all p-5 flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 flex-shrink-0">
          <FileText size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-base font-bold text-gray-900">הצעה ריקה</span>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            התחל מאפס עם טופס ריק — הכי גמיש לעבודות מותאמות
          </p>
        </div>
        <ArrowLeft size={18} className="text-gray-400 flex-shrink-0 group-hover:-translate-x-1 transition-transform" />
      </button>
    </div>
  );
}

// ── Stage 2: gallery of templates ───────────────────────────────────────────

function TemplatesStage({ onPick }: { onPick: (id: string) => void }) {
  return (
    <div className="p-5 sm:p-6">
      <p className="text-xs text-gray-500 mb-4">
        בחר תבנית — תיווצר הצעה מוכנה עם פריטים, תיאורים ותנאים. תוכל לערוך הכל לפני שמירה.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {QUOTE_TEMPLATES.map(t => (
          <button
            key={t.id}
            onClick={() => onPick(t.id)}
            className="text-right group rounded-2xl border border-gray-200 bg-white hover:border-emerald-300 hover:shadow-md hover:bg-emerald-50/30 transition-all p-4 flex items-start gap-3 active:scale-[0.99]"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 flex items-center justify-center text-2xl flex-shrink-0">
              {t.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 mb-0.5">{t.title}</p>
              <p className="text-[11px] text-gray-500 leading-relaxed">{t.shortDesc}</p>
              <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-emerald-700 group-hover:gap-2 transition-all">
                השתמש בתבנית
                <ArrowLeft size={11} />
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
