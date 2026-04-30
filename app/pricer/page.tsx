"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search, X, Plus, Minus, Trash2, Printer, ShoppingCart,
  ChevronDown, ChevronUp, Pencil, Check, FolderKanban, ChevronRight,
  ArrowRight, Mountain, Leaf, Flower2, Package, Droplets, Layers,
  LayoutGrid, Lock, Lightbulb, Wrench, HardHat, PenLine, Tag,
  Save, RotateCcw, Clock, BookOpen,
} from "lucide-react";
import { PRICE_LIST, PRICE_CATEGORIES, type PriceItem } from "@/lib/price-list-data";

// ── Custom category type ─────────────────────────────────────────────────────
interface CustomCategory { key: string; label: string; emoji: string; }

const EMOJI_OPTIONS = [
  "🌿","🌱","🌳","🌺","🌸","🍀","🌻","🌵","🌾","🍃",
  "🪴","🪨","🪵","💧","☀️","🌙","⭐","🔥","❄️","🎋",
  "🧱","🏡","🔧","💡","🎨","📦","🧪","🌍","🐝","🦋",
];
import { supabase } from "@/lib/supabase/client";

// ── Category → icon + color map ──────────────────────────────────────────────
const CAT_ICONS: Record<string, { Icon: React.ElementType; color: string; bg: string }> = {
  stones:     { Icon: Mountain,   color: "text-gray-500",    bg: "bg-gray-100" },
  grass:      { Icon: Leaf,       color: "text-green-600",   bg: "bg-green-100" },
  plants:     { Icon: Flower2,    color: "text-emerald-600", bg: "bg-emerald-100" },
  planters:   { Icon: Package,    color: "text-amber-600",   bg: "bg-amber-100" },
  irrigation: { Icon: Droplets,   color: "text-blue-600",    bg: "bg-blue-100" },
  soil:       { Icon: Layers,     color: "text-orange-600",  bg: "bg-orange-100" },
  pavers:     { Icon: LayoutGrid, color: "text-stone-500",   bg: "bg-stone-100" },
  fencing:    { Icon: Lock,       color: "text-violet-600",  bg: "bg-violet-100" },
  lighting:   { Icon: Lightbulb,  color: "text-yellow-600",  bg: "bg-yellow-100" },
  tools:      { Icon: Wrench,     color: "text-red-500",     bg: "bg-red-100" },
  labor:      { Icon: HardHat,    color: "text-indigo-600",  bg: "bg-indigo-100" },
  custom:     { Icon: PenLine,    color: "text-purple-600",  bg: "bg-purple-100" },
};

function CatIcon({ category, size = 16 }: { category: string; size?: number }) {
  const { Icon, color, bg } = CAT_ICONS[category] ?? CAT_ICONS.custom;
  return (
    <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
      <Icon size={size} className={color} />
    </div>
  );
}

const VAT = 0.17;

interface QuoteItem {
  item: PriceItem;
  qty: number;
}

function formatPrice(n: number) {
  // Show up to 2 decimal places only when there are meaningful cents
  const hasDecimals = n % 1 !== 0;
  return "₪" + n.toLocaleString("he-IL", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

// ── Inline text / number edit ──────────────────────────────────────────────
function InlineEdit({
  value, onCommit, inputClass, displayClass, isCustom, onReset, numeric, prefix,
}: {
  value: string; onCommit: (v: string) => void;
  inputClass: string; displayClass: string;
  isCustom: boolean; onReset: () => void;
  numeric?: boolean; prefix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  function start() { setDraft(value); setEditing(true); setTimeout(() => ref.current?.select(), 0); }
  function commit() { const v = draft.trim(); if (v) onCommit(v); setEditing(false); }

  if (editing) return (
    <div className="flex items-center gap-1">
      {prefix && <span className="text-sm text-gray-500">{prefix}</span>}
      <input ref={ref} type={numeric ? "number" : "text"} min={numeric ? 0 : undefined} step={numeric ? "0.01" : undefined}
        value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
        className={inputClass} />
      <button onClick={commit} className="text-green-600 hover:text-green-800 flex-shrink-0"><Check size={14} /></button>
    </div>
  );
  return (
    <button onClick={start} className={`group/ie flex items-center gap-1 ${displayClass}`} title="לחץ לעריכה">
      {prefix && <span>{prefix}</span>}
      <span>{value}</span>
      <Pencil size={11} className="text-gray-300 group-hover/ie:text-green-500 transition-colors flex-shrink-0" />
      {isCustom && (
        <button onClick={e => { e.stopPropagation(); onReset(); }}
          className="text-xs text-orange-400 hover:text-orange-600 underline mr-1">
          איפוס
        </button>
      )}
    </button>
  );
}

// ── Per-item VAT mini-toggle ────────────────────────────────────────────────
function VatToggle({ value, onChange }: { value: "before" | "after"; onChange: (v: "before" | "after") => void }) {
  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5 text-xs">
      <button
        onClick={() => onChange("before")}
        className={`px-2 py-0.5 rounded-md font-medium transition-all ${
          value === "before" ? "bg-white shadow text-gray-800" : "text-gray-400 hover:text-gray-600"
        }`}
      >
        ללא מע"מ
      </button>
      <button
        onClick={() => onChange("after")}
        className={`px-2 py-0.5 rounded-md font-medium transition-all ${
          value === "after" ? "bg-blue-600 shadow text-white" : "text-gray-400 hover:text-gray-600"
        }`}
      >
        +מע"מ
      </button>
    </div>
  );
}

// ── Item row ────────────────────────────────────────────────────────────────
function ItemRow({
  item, price, unit, name, vat,
  onAdd, onPriceChange, onUnitChange, onNameChange, onVatChange, onDelete,
}: {
  item: PriceItem; price: number; unit: string; name: string; vat: "before" | "after";
  onAdd: () => void;
  onPriceChange: (n: number) => void;
  onUnitChange: (s: string) => void;
  onNameChange: (s: string) => void;
  onVatChange: (v: "before" | "after") => void;
  onDelete?: () => void;
}) {
  const vatMul = vat === "after" ? 1 + VAT : 1;
  const displayPrice = price * vatMul;

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
      <CatIcon category={item.category} />

      <div className="flex-1 min-w-0">
        <InlineEdit
          value={name}
          onCommit={v => { if (v.trim()) onNameChange(v.trim()); }}
          inputClass="w-full text-sm font-semibold text-gray-800 border border-purple-400 rounded-lg px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-purple-400"
          displayClass="text-sm font-semibold text-gray-800 leading-snug"
          isCustom={name !== item.name}
          onReset={() => onNameChange(item.name)}
        />
        {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
        {/* VAT toggle — visible and accessible right under the name */}
        <div className="mt-1.5">
          <VatToggle value={vat} onChange={onVatChange} />
        </div>
      </div>

      {/* Price + unit — editable */}
      <div className="flex-shrink-0 text-left space-y-0.5 min-w-[80px]">
        <InlineEdit
          value={formatPrice(displayPrice).replace("₪", "")}
          onCommit={v => { const n = parseFloat(v.replace(/[^0-9.]/g, "")); if (!isNaN(n) && n >= 0) onPriceChange(n / vatMul); }}
          inputClass="w-20 text-sm font-bold text-green-700 border border-green-400 rounded-lg px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-green-400 text-right"
          displayClass="text-base font-bold"
          isCustom={price !== item.price}
          onReset={() => onPriceChange(item.price)}
          numeric prefix="₪"
        />
        <div className="flex items-center gap-0.5">
          <span className="text-xs text-gray-400">לכל&nbsp;</span>
          <InlineEdit
            value={unit}
            onCommit={onUnitChange}
            inputClass="w-24 text-xs border border-green-400 rounded-lg px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-green-400"
            displayClass="text-xs text-gray-400"
            isCustom={unit !== item.unit}
            onReset={() => onUnitChange(item.unit)}
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <button onClick={onAdd}
          className="w-8 h-8 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center transition-colors shadow-sm"
          title="הוסף להצעה">
          <Plus size={16} />
        </button>
        {onDelete && (
          <button onClick={onDelete}
            className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition-colors"
            title="מחק פריט">
            <Trash2 size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Qty input ───────────────────────────────────────────────────────────────
function QtyInput({ qty, onChange }: { qty: number; onChange: (n: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  function start() { setDraft(String(qty)); setEditing(true); setTimeout(() => ref.current?.select(), 0); }
  function commit() { const v = parseInt(draft, 10); if (!isNaN(v) && v >= 0) onChange(v); setEditing(false); }
  if (editing) return (
    <input ref={ref} type="number" min={0} value={draft}
      onChange={e => setDraft(e.target.value)} onBlur={commit}
      onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
      className="w-9 text-center text-sm font-bold text-gray-800 border border-green-400 rounded-lg focus:outline-none py-0.5" />
  );
  return (
    <button onClick={start} className="w-7 text-center text-sm font-bold text-gray-800 hover:text-green-700 hover:underline" title="ערוך כמות">
      {qty}
    </button>
  );
}

// ── Add category modal ──────────────────────────────────────────────────────
function AddCategoryModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (cat: CustomCategory) => void;
}) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🌿");

  function handleCreate() {
    if (!name.trim()) return;
    const key = `user_${Date.now()}`;
    onCreate({ key, label: name.trim(), emoji });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden" dir="rtl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Tag size={16} className="text-green-600" /> קטגוריה חדשה
          </h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">שם הקטגוריה *</label>
            <input
              autoFocus
              placeholder="למשל: תערובת שתילה"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          {/* Emoji picker */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">אמוג׳י</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map(em => (
                <button key={em} onClick={() => setEmoji(em)}
                  className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all border-2 ${
                    emoji === em ? "border-green-500 bg-green-50 scale-110" : "border-transparent hover:border-gray-200 bg-gray-50"
                  }`}>
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {name.trim() && (
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
              <span className="text-sm text-gray-500">תצוגה מקדימה:</span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-600 text-white text-sm font-medium shadow-sm">
                <span>{emoji}</span><span>{name.trim()}</span>
              </span>
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-bold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2">
            <Plus size={16} /> צור קטגוריה
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add custom item modal ───────────────────────────────────────────────────
function AddCustomItemModal({ onClose, onSave, onAdd, defaultCategory = "custom", extraCategories = [] }: {
  onClose: () => void;
  onSave: (item: PriceItem, vat: "before" | "after") => void;
  onAdd: (item: PriceItem, qty: number, vat: "before" | "after") => void;
  defaultCategory?: string;
  extraCategories?: CustomCategory[];
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("יח'");
  const [customUnit, setCustomUnit] = useState("");
  const [qty, setQty] = useState("1");
  const [vat, setVat] = useState<"before" | "after">("before");
  const [category, setCategory] = useState(defaultCategory);
  const UNITS = ["יח'", "מ\"ר", "מ'", "טון", "ק\"ג", "שק", "עץ", "צמח", "אחר"];
  const CATS = [
    ...PRICE_CATEGORIES.filter(c => c.key !== "all"),
    ...extraCategories,
  ];
  const finalUnit = unit === "אחר" ? customUnit : unit;
  const { Icon: CatIconComp } = CAT_ICONS[category] ?? CAT_ICONS.custom;
  // Find the label of the currently selected category for display
  const selectedCatLabel = CATS.find(c => c.key === category)?.label ?? category;

  function buildItem(): PriceItem {
    return {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      unit: finalUnit.trim(),
      price: parseFloat(price) || 0,
      category,
    };
  }

  function handleSaveOnly() {
    if (!name.trim() || !finalUnit.trim()) return;
    onSave(buildItem(), vat);
    onClose();
  }

  function handleAddToQuote() {
    if (!name.trim() || !finalUnit.trim()) return;
    onAdd(buildItem(), parseInt(qty) || 1, vat);
    onClose();
  }

  const valid = !!name.trim() && !!finalUnit.trim();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden" dir="rtl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <PenLine size={16} className="text-purple-500" /> פריט חדש
            <span className="text-xs font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              ← {selectedCatLabel}
            </span>
          </h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="px-5 py-4 space-y-3 max-h-[80vh] overflow-y-auto">
          <input
            autoFocus
            placeholder="שם הפריט *"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />

          {/* Category picker */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">קטגוריה</label>
            <div className="flex flex-wrap gap-1.5">
              {CATS.map(cat => {
                const catMeta = CAT_ICONS[cat.key];
                const active = category === cat.key;
                return (
                  <button key={cat.key} onClick={() => setCategory(cat.key)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      active ? "border-purple-400 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}>
                    {catMeta
                      ? <catMeta.Icon size={12} className={active ? "text-purple-600" : catMeta.color} />
                      : <span className="text-sm leading-none">{"emoji" in cat ? (cat as CustomCategory).emoji : "🏷️"}</span>
                    }
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">מחיר ליחידה (₪)</label>
              <input type="number" min={0} step="0.01" placeholder="0.00"
                value={price} onChange={e => setPrice(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">יחידת מידה</label>
              <select value={unit} onChange={e => setUnit(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400">
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {unit === "אחר" && (
            <input placeholder="הקלד יחידת מידה..."
              value={customUnit} onChange={e => setCustomUnit(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          )}

          <div>
            <label className="block text-xs text-gray-500 mb-1">מע"מ</label>
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              {(["before", "after"] as const).map(v => (
                <button key={v} onClick={() => setVat(v)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    vat === v
                      ? v === "after" ? "bg-blue-600 text-white shadow" : "bg-white shadow text-gray-800"
                      : "text-gray-400"
                  }`}>
                  {v === "before" ? "ללא מע\"מ" : "+מע\"מ"}
                </button>
              ))}
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div className="pt-1 space-y-2">
            {/* Primary: save to category only */}
            <button
              onClick={handleSaveOnly}
              disabled={!valid}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold rounded-xl py-3 text-sm transition-colors">
              <CatIconComp size={15} className="opacity-80" />
              שמור בקטגוריה
            </button>

            {/* Secondary: save + add to quote */}
            <div className="flex items-center gap-2">
              <input type="number" min={1} value={qty} onChange={e => setQty(e.target.value)}
                className="w-16 border border-gray-200 rounded-xl px-2 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-400"
                title="כמות" />
              <button
                onClick={handleAddToQuote}
                disabled={!valid}
                className="flex-1 flex items-center justify-center gap-2 border-2 border-green-500 text-green-700 hover:bg-green-50 disabled:opacity-40 font-bold rounded-xl py-2.5 text-sm transition-colors">
                <ShoppingCart size={14} />
                הוסף להצעה
              </button>
            </div>
            <p className="text-center text-xs text-gray-400">כמות רלוונטית רק להוספה להצעה</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Save to project modal ───────────────────────────────────────────────────
function SaveToProjectModal({
  materials, onClose,
}: {
  materials: { name: string; qty: number; unit: string; price: number; vatIncluded: boolean }[];
  onClose: () => void;
}) {
  const [projects, setProjects] = useState<{ id: string; name: string; customer_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newName, setNewName] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);

  useEffect(() => {
    supabase.from("projects").select("id, name, customer_name").order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setProjects(data); setLoading(false); });
  }, []);

  async function saveToProject(projectId: string) {
    setSaving(true);
    const { data } = await supabase.from("projects").select("materials").eq("id", projectId).single();
    const existing: typeof materials = data?.materials ?? [];
    const merged = [...existing];
    materials.forEach(nm => {
      const idx = merged.findIndex(m => m.name === nm.name && m.unit === nm.unit);
      if (idx >= 0) merged[idx] = { ...merged[idx], qty: merged[idx].qty + nm.qty };
      else merged.push(nm);
    });
    await supabase.from("projects").update({ materials: merged }).eq("id", projectId);
    setSaving(false);
    setSaved(true);
    setTimeout(onClose, 1200);
  }

  async function createAndSave() {
    if (!newName.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("projects")
      .insert({ name: newName.trim(), materials, status: "planning", progress: 0 })
      .select("id")
      .single();
    if (!error && data) {
      setSaving(false);
      setSaved(true);
      setTimeout(onClose, 1200);
    } else {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[75vh] flex flex-col overflow-hidden" dir="rtl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">שמור לפרויקט</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <p className="px-5 pt-3 pb-1 text-sm text-gray-500">{materials.length} פריטים · בחר פרויקט או צור חדש</p>

        {saved ? (
          <div className="flex-1 flex items-center justify-center py-10 text-green-600 font-bold text-lg">✓ נשמר בהצלחה</div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Existing projects */}
            {projects.length > 0 && (
              <div className="divide-y divide-gray-50">
                {projects.map(p => (
                  <button key={p.id} onClick={() => saveToProject(p.id)} disabled={saving}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-green-50 transition-colors text-right disabled:opacity-50">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{p.name}</p>
                      {p.customer_name && <p className="text-xs text-gray-400">{p.customer_name}</p>}
                    </div>
                    <ChevronRight size={16} className="text-gray-300 rotate-180" />
                  </button>
                ))}
              </div>
            )}

            {/* New project */}
            <div className="px-5 py-4 border-t border-dashed border-gray-200 mt-1">
              {!creatingNew ? (
                <button onClick={() => setCreatingNew(true)}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-green-300 text-green-700 hover:bg-green-50 rounded-xl py-3 text-sm font-semibold transition-colors">
                  <Plus size={16} /> פרויקט חדש
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-600">שם הפרויקט החדש</p>
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && createAndSave()}
                    placeholder="למשל: גינת רחל כהן..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                  <div className="flex gap-2">
                    <button onClick={createAndSave} disabled={!newName.trim() || saving}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-bold rounded-xl py-2.5 text-sm transition-colors flex items-center justify-center gap-1.5">
                      {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={14} />}
                      צור ושמור
                    </button>
                    <button onClick={() => setCreatingNew(false)}
                      className="px-4 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm hover:bg-gray-50">
                      ביטול
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Draft types ─────────────────────────────────────────────────────────────
interface Draft {
  id: string;
  name: string;
  savedAt: string;
  quote: QuoteItem[];
  overridePrices: Record<string, number>;
  overrideUnits: Record<string, string>;
  overrideNames: Record<string, string>;
  vatItems: Record<string, "before" | "after">;
}

// ── Save draft modal ─────────────────────────────────────────────────────────
function SaveDraftModal({ itemCount, total, onClose, onSave }: {
  itemCount: number; total: number;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const defaultName = new Date().toLocaleDateString("he-IL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const [name, setName] = useState(defaultName);

  function handleSave() {
    onSave(name.trim() || defaultName);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden" dir="rtl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Save size={16} className="text-amber-500" /> שמור טיוטה
          </h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="bg-amber-50 rounded-xl px-4 py-3 text-sm text-amber-800">
            {itemCount} פריטים · סה"כ {formatPrice(total)} · הצעה תאופס אחרי השמירה
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">שם הטיוטה</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSave()}
              placeholder="למשל: גינת כהן — שלב ראשון"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <button onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl py-3 text-sm transition-colors">
            <Save size={15} /> שמור ואפס הצעה
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Drafts list modal ────────────────────────────────────────────────────────
function DraftsListModal({ drafts, onClose, onLoad, onDelete }: {
  drafts: Draft[];
  onClose: () => void;
  onLoad: (draft: Draft) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden" dir="rtl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <BookOpen size={16} className="text-amber-500" /> טיוטות שמורות
          </h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        {drafts.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">אין טיוטות שמורות</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {drafts.map(d => (
              <div key={d.id} className="px-5 py-3.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{d.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(d.savedAt).toLocaleString("he-IL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {" · "}{d.quote.length} פריטים
                  </p>
                </div>
                <button onClick={() => { onLoad(d); onClose(); }}
                  className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
                  <RotateCcw size={11} /> טען
                </button>
                <button onClick={() => onDelete(d.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Quote panel ─────────────────────────────────────────────────────────────
function QuotePanel({
  quote, overridePrices, overrideUnits, overrideNames, vatItems,
  onQtyChange, onQtySet, onRemove, onClear, onPrint, onSaveToProject, onSaveDraft,
  collapsed, onToggle,
}: {
  quote: QuoteItem[];
  overridePrices: Record<string, number>;
  overrideUnits: Record<string, string>;
  overrideNames: Record<string, string>;
  vatItems: Record<string, "before" | "after">;
  onQtyChange: (id: string, delta: number) => void;
  onQtySet: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onPrint: () => void;
  onSaveToProject: () => void;
  onSaveDraft: () => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  function ep(item: PriceItem) { return overridePrices[item.id] ?? item.price; }
  function eu(item: PriceItem) { return overrideUnits[item.id] ?? item.unit; }
  function en(item: PriceItem) { return overrideNames[item.id] ?? item.name; }
  function vm(item: PriceItem) { return (vatItems[item.id] ?? "before") === "after" ? 1 + VAT : 1; }

  const total = quote.reduce((sum, qi) => sum + ep(qi.item) * vm(qi.item) * qi.qty, 0);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 cursor-pointer select-none" onClick={onToggle}>
        <ShoppingCart size={18} className="text-green-600 flex-shrink-0" />
        <h2 className="font-bold text-gray-900 text-base flex-1">הצעת מחיר</h2>
        {quote.length > 0 && (
          <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{quote.length}</span>
        )}
        {collapsed ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronUp size={16} className="text-gray-400" />}
      </div>

      {!collapsed && (
        <>
          <div className="flex-1 overflow-y-auto max-h-[420px]">
            {quote.length === 0 ? (
              <div className="py-10 text-center text-gray-400">
                <ShoppingCart size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">לחץ + להוסיף פריטים</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {quote.map(({ item, qty }) => {
                  const p = ep(item) * vm(item);
                  const isVat = (vatItems[item.id] ?? "before") === "after";
                  return (
                    <div key={item.id} className="px-4 py-2.5">
                      {/* Row 1: name + total + trash */}
                      <div className="flex items-center gap-2">
                        <p className="flex-1 text-xs font-semibold text-gray-800 leading-snug truncate min-w-0">{en(item)}</p>
                        <p className="text-xs font-bold text-green-700 whitespace-nowrap flex-shrink-0">{formatPrice(p * qty)}</p>
                        <button onClick={() => onRemove(item.id)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Row 2: badges + price info + qty controls */}
                      <div className="flex items-center gap-2 mt-1.5">
                        {isVat && (
                          <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 whitespace-nowrap">+מע"מ</span>
                        )}
                        <div className="flex-1 min-w-0 flex flex-col">
                          <span className="text-[11px] text-gray-400 leading-tight">{formatPrice(p)} / {eu(item)}</span>
                          {isVat && (
                            <span className="text-[11px] text-blue-500 font-medium leading-tight">לפני מע"מ: {formatPrice(ep(item))}</span>
                          )}
                        </div>
                        {/* Qty controls */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => onQtyChange(item.id, -1)}
                            className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 transition-colors">
                            <Minus size={10} />
                          </button>
                          <QtyInput qty={qty} onChange={n => onQtySet(item.id, n)} />
                          <button onClick={() => onQtyChange(item.id, 1)}
                            className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 transition-colors">
                            <Plus size={10} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {quote.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">סה"כ</span>
                <span className="text-xl font-black text-gray-900">{formatPrice(total)}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={onSaveToProject}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 rounded-xl transition-colors shadow-sm">
                  <FolderKanban size={15} /><span>שמור לפרויקט</span>
                </button>
                <button onClick={onPrint}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm transition-colors shadow-sm"
                  title="הדפס / PDF">
                  <Printer size={15} />
                </button>
                <button onClick={onClear}
                  className="px-3 py-2 border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 rounded-xl text-sm transition-colors"
                  title="נקה הצעה">
                  <Trash2 size={15} />
                </button>
              </div>
              {/* Save draft button */}
              <button onClick={onSaveDraft}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 border-dashed border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400 transition-all">
                <Save size={14} /> שמור טיוטה — המשך מאוחר יותר
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Print style ─────────────────────────────────────────────────────────────
const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #quote-print, #quote-print * { visibility: visible !important; }
  #quote-print { position: fixed !important; inset: 0 !important; padding: 30px !important; background: white !important; }
}
`;

// ── Main page ────────────────────────────────────────────────────────────────
export default function PricerPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [quote, setQuote] = useState<QuoteItem[]>([]);
  const [customItems, setCustomItems] = useState<PriceItem[]>(() => {
    try {
      const saved = localStorage.getItem("pricer_custom_items");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [overridePrices, setOverridePrices] = useState<Record<string, number>>({});
  const [overrideUnits, setOverrideUnits]   = useState<Record<string, string>>({});
  const [overrideNames, setOverrideNames]   = useState<Record<string, string>>({});
  const [vatItems, setVatItems]             = useState<Record<string, "before" | "after">>({});
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(() => {
    try {
      const saved = localStorage.getItem("pricer_custom_categories");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [deletedCategories, setDeletedCategories] = useState<string[]>(() => {
    try {
      const a = JSON.parse(localStorage.getItem("pricer_hidden_categories") ?? "[]");
      const b = JSON.parse(localStorage.getItem("pricer_deleted_categories") ?? "[]");
      const merged = [...new Set([...a, ...b])];
      localStorage.setItem("pricer_hidden_categories", JSON.stringify(merged));
      return merged;
    } catch { return []; }
  });
  const [deletedItems, setDeletedItems] = useState<string[]>(() => {
    try {
      const a = JSON.parse(localStorage.getItem("pricer_hidden_items") ?? "[]");
      const b = JSON.parse(localStorage.getItem("pricer_deleted_items") ?? "[]");
      const merged = [...new Set([...a, ...b])];
      localStorage.setItem("pricer_hidden_items", JSON.stringify(merged));
      return merged;
    } catch { return []; }
  });
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showSaveDraftModal, setShowSaveDraftModal] = useState(false);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>(() => {
    try {
      const raw = localStorage.getItem("pricer_drafts");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const printStyleRef = useRef(false);

  // ── Persist price/unit/vat overrides to localStorage ──────────────────────
  // IMPORTANT: save effects must be defined BEFORE the load effect so on the
  // initial render they skip (storageLoaded=false), and only save on subsequent
  // renders (after load sets storageLoaded=true).
  const storageLoaded = useRef(false);

  useEffect(() => {
    if (!storageLoaded.current) return;
    try { localStorage.setItem("pricer_override_prices", JSON.stringify(overridePrices)); } catch {}
  }, [overridePrices]);

  useEffect(() => {
    if (!storageLoaded.current) return;
    try { localStorage.setItem("pricer_override_units", JSON.stringify(overrideUnits)); } catch {}
  }, [overrideUnits]);

  useEffect(() => {
    if (!storageLoaded.current) return;
    try { localStorage.setItem("pricer_override_names", JSON.stringify(overrideNames)); } catch {}
  }, [overrideNames]);

  useEffect(() => {
    if (!storageLoaded.current) return;
    try { localStorage.setItem("pricer_vat_items", JSON.stringify(vatItems)); } catch {}
  }, [vatItems]);

  // Load from localStorage once on mount (client-side only), then enable saving
  useEffect(() => {
    try {
      const p = localStorage.getItem("pricer_override_prices");
      if (p) setOverridePrices(JSON.parse(p));
      const u = localStorage.getItem("pricer_override_units");
      if (u) setOverrideUnits(JSON.parse(u));
      const nn = localStorage.getItem("pricer_override_names");
      if (nn) setOverrideNames(JSON.parse(nn));
      const v = localStorage.getItem("pricer_vat_items");
      if (v) setVatItems(JSON.parse(v));
    } catch {}
    storageLoaded.current = true;
  }, []);

  function addCustomCategory(cat: CustomCategory) {
    setCustomCategories(prev => {
      const next = [...prev, cat];
      try { localStorage.setItem("pricer_custom_categories", JSON.stringify(next)); } catch {}
      return next;
    });
    setActiveCategory(cat.key);
  }

  function renameCustomCategory(key: string, newLabel: string) {
    setCustomCategories(prev => {
      const next = prev.map(c => c.key === key ? { ...c, label: newLabel } : c);
      try { localStorage.setItem("pricer_custom_categories", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function deleteCustomCategory(key: string) {
    setCustomCategories(prev => {
      const next = prev.filter(c => c.key !== key);
      try { localStorage.setItem("pricer_custom_categories", JSON.stringify(next)); } catch {}
      return next;
    });
    if (activeCategory === key) setActiveCategory("all");
  }

  const allCategories = useMemo(() => [
    ...PRICE_CATEGORIES.filter(c => !deletedCategories.includes(c.key)),
    ...customCategories,
  ], [customCategories, deletedCategories]);

  function ep(item: PriceItem) { return overridePrices[item.id] ?? item.price; }
  function eu(item: PriceItem) { return overrideUnits[item.id] ?? item.unit; }
  function en(item: PriceItem) { return overrideNames[item.id] ?? item.name; }
  function vat(item: PriceItem) { return vatItems[item.id] ?? "before"; }
  function vm(item: PriceItem) { return vat(item) === "after" ? 1 + VAT : 1; }

  function setPriceOverride(id: string, newPrice: number) {
    setOverridePrices(prev => {
      const item = [...PRICE_LIST, ...customItems].find(i => i.id === id);
      if (item && newPrice === item.price) { const { [id]: _, ...rest } = prev; return rest; }
      return { ...prev, [id]: newPrice };
    });
  }

  function setUnitOverride(id: string, newUnit: string) {
    setOverrideUnits(prev => {
      const item = [...PRICE_LIST, ...customItems].find(i => i.id === id);
      if (item && newUnit === item.unit) { const { [id]: _, ...rest } = prev; return rest; }
      return { ...prev, [id]: newUnit };
    });
  }

  function setNameOverride(id: string, newName: string) {
    setOverrideNames(prev => {
      const item = [...PRICE_LIST, ...customItems].find(i => i.id === id);
      if (item && newName === item.name) { const { [id]: _, ...rest } = prev; return rest; }
      return { ...prev, [id]: newName };
    });
  }

  function setVatOverride(id: string, v: "before" | "after") {
    setVatItems(prev => ({ ...prev, [id]: v }));
  }

  function deleteCustomItem(id: string) {
    setCustomItems(prev => {
      const next = prev.filter(i => i.id !== id);
      try { localStorage.setItem("pricer_custom_items", JSON.stringify(next)); } catch {}
      return next;
    });
    setQuote(prev => prev.filter(qi => qi.item.id !== id));
    setOverridePrices(prev => { const { [id]: _, ...rest } = prev; return rest; });
    setOverrideUnits(prev => { const { [id]: _, ...rest } = prev; return rest; });
    setOverrideNames(prev => { const { [id]: _, ...rest } = prev; return rest; });
    setVatItems(prev => { const { [id]: _, ...rest } = prev; return rest; });
  }

  function deleteBuiltinItem(id: string) {
    setDeletedItems(prev => {
      const next = [...prev, id];
      try { localStorage.setItem("pricer_hidden_items", JSON.stringify(next)); } catch {}
      return next;
    });
    setQuote(prev => prev.filter(qi => qi.item.id !== id));
  }

  function deleteItem(id: string) {
    if (id.startsWith("custom_")) deleteCustomItem(id);
    else deleteBuiltinItem(id);
  }

  function deleteBuiltinCategory(key: string) {
    setDeletedCategories(prev => {
      const next = [...prev, key];
      try { localStorage.setItem("pricer_hidden_categories", JSON.stringify(next)); } catch {}
      return next;
    });
    if (activeCategory === key) setActiveCategory("all");
  }

  function deleteCategory(key: string) {
    if (key.startsWith("user_")) deleteCustomCategory(key);
    else deleteBuiltinCategory(key);
  }


  function saveCustomItemOnly(item: PriceItem, vatMode: "before" | "after") {
    setCustomItems(prev => {
      const next = [...prev, item];
      try { localStorage.setItem("pricer_custom_items", JSON.stringify(next)); } catch {}
      return next;
    });
    setVatItems(prev => ({ ...prev, [item.id]: vatMode }));
    // Switch to the item's category so the user sees it immediately
    setActiveCategory(item.category);
  }

  function addCustomItemToQuote(item: PriceItem, qty: number, vatMode: "before" | "after") {
    setCustomItems(prev => {
      const next = [...prev, item];
      try { localStorage.setItem("pricer_custom_items", JSON.stringify(next)); } catch {}
      return next;
    });
    setOverridePrices(prev => ({ ...prev, [item.id]: item.price }));
    setVatItems(prev => ({ ...prev, [item.id]: vatMode }));
    setQuote(prev => [...prev, { item, qty }]);
    setPanelCollapsed(false);
  }

  const allItems = useMemo(() =>
    [...PRICE_LIST, ...customItems].filter(i => !deletedItems.includes(i.id)),
  [customItems, deletedItems]);

  const filtered = useMemo(() => allItems.filter(item => {
    const matchCat = activeCategory === "all" || item.category === activeCategory;
    const q = search.trim().toLowerCase();
    if (!q) return matchCat;
    return matchCat && (item.name.toLowerCase().includes(q) || (item.notes ?? "").toLowerCase().includes(q));
  }), [allItems, search, activeCategory]);

  function addToQuote(item: PriceItem) {
    setQuote(prev => {
      const existing = prev.find(qi => qi.item.id === item.id);
      if (existing) return prev.map(qi => qi.item.id === item.id ? { ...qi, qty: qi.qty + 1 } : qi);
      return [...prev, { item, qty: 1 }];
    });
    setPanelCollapsed(false);
  }

  function changeQty(id: string, delta: number) {
    setQuote(prev => prev.map(qi => qi.item.id === id ? { ...qi, qty: qi.qty + delta } : qi).filter(qi => qi.qty > 0));
  }

  function setQty(id: string, qty: number) {
    if (qty === 0) setQuote(prev => prev.filter(qi => qi.item.id !== id));
    else setQuote(prev => prev.map(qi => qi.item.id === id ? { ...qi, qty } : qi));
  }

  function saveDraftWithName(name: string) {
    const draft: Draft = {
      id: `draft_${Date.now()}`,
      name,
      savedAt: new Date().toISOString(),
      quote,
      overridePrices,
      overrideUnits,
      overrideNames,
      vatItems,
    };
    setDrafts(prev => {
      const next = [draft, ...prev];
      try { localStorage.setItem("pricer_drafts", JSON.stringify(next)); } catch {}
      return next;
    });
    // Clear current quote after saving
    setQuote([]);
    setOverridePrices({});
    setOverrideUnits({});
    setOverrideNames({});
    setVatItems({});
    setPanelCollapsed(true);
  }

  function loadDraft(draft: Draft) {
    setQuote(draft.quote ?? []);
    setOverridePrices(draft.overridePrices ?? {});
    setOverrideUnits(draft.overrideUnits ?? {});
    setOverrideNames(draft.overrideNames ?? {});
    setVatItems(draft.vatItems ?? {});
    setPanelCollapsed(false);
  }

  function deleteDraft(id: string) {
    setDrafts(prev => {
      const next = prev.filter(d => d.id !== id);
      try { localStorage.setItem("pricer_drafts", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function handlePrint() {
    if (!printStyleRef.current) {
      const s = document.createElement("style"); s.innerHTML = PRINT_STYLE;
      document.head.appendChild(s); printStyleRef.current = true;
    }
    window.print();
  }

  const total = quote.reduce((sum, qi) => sum + ep(qi.item) * vm(qi.item) * qi.qty, 0);

  const quoteMaterials = quote.map(qi => ({
    name: en(qi.item),
    qty: qi.qty,
    unit: eu(qi.item),
    price: ep(qi.item),
    vatIncluded: vat(qi.item) === "after",
  }));

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {showSaveModal && (
        <SaveToProjectModal materials={quoteMaterials} onClose={() => setShowSaveModal(false)} />
      )}

      {/* ── Print view ── */}
      <div id="quote-print" className="hidden print:block p-8" dir="rtl">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">הצעת מחיר — חומרי גינון</h1>
        <p className="text-sm text-gray-500 mb-6">{new Date().toLocaleDateString("he-IL")}</p>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="text-right p-2 border border-gray-200">פריט</th>
              <th className="text-center p-2 border border-gray-200">יח'</th>
              <th className="text-center p-2 border border-gray-200">כמות</th>
              <th className="text-center p-2 border border-gray-200">מע"מ</th>
              <th className="text-left p-2 border border-gray-200">מחיר יח'</th>
              <th className="text-left p-2 border border-gray-200">סה"כ</th>
            </tr>
          </thead>
          <tbody>
            {quote.map(({ item, qty }) => {
              const p = ep(item) * vm(item);
              return (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="p-2 border border-gray-200">{en(item)}</td>
                  <td className="p-2 text-center border border-gray-200">{eu(item)}</td>
                  <td className="p-2 text-center border border-gray-200">{qty}</td>
                  <td className="p-2 text-center border border-gray-200">{vat(item) === "after" ? "כולל" : "ללא"}</td>
                  <td className="p-2 text-left border border-gray-200">{formatPrice(p)}</td>
                  <td className="p-2 text-left font-bold border border-gray-200">{formatPrice(p * qty)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-bold">
              <td colSpan={5} className="p-2 text-right border border-gray-200">סה"כ:</td>
              <td className="p-2 text-left border border-gray-200">{formatPrice(total)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="text-xs text-gray-400 mt-6">* מחירים שכוללים מע"מ מסומנים בעמודת מע"מ</p>
      </div>

      {showAddModal && (
        <AddCustomItemModal
          onClose={() => setShowAddModal(false)}
          onSave={saveCustomItemOnly}
          onAdd={addCustomItemToQuote}
          extraCategories={customCategories}
          defaultCategory={activeCategory !== "all" ? activeCategory : "custom"}
        />
      )}

      {showAddCategoryModal && (
        <AddCategoryModal
          onClose={() => setShowAddCategoryModal(false)}
          onCreate={addCustomCategory}
        />
      )}

      {showSaveDraftModal && (
        <SaveDraftModal
          itemCount={quote.length}
          total={quote.reduce((s, qi) => s + (overridePrices[qi.item.id] ?? qi.item.price) * ((vatItems[qi.item.id] ?? "before") === "after" ? 1 + VAT : 1) * qi.qty, 0)}
          onClose={() => setShowSaveDraftModal(false)}
          onSave={saveDraftWithName}
        />
      )}

      {showDraftsModal && (
        <DraftsListModal
          drafts={drafts}
          onClose={() => setShowDraftsModal(false)}
          onLoad={loadDraft}
          onDelete={deleteDraft}
        />
      )}

      {/* ── Screen view ── */}
      <div className="print:hidden">

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-5">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => router.back()}
              className="flex items-center gap-1 text-gray-400 hover:text-gray-700 transition-colors text-sm font-medium">
              <ArrowRight size={18} />
              <span className="hidden sm:inline">חזור</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900 flex-1">💰 מחירון גינון</h1>
            {/* Drafts button */}
            <button onClick={() => setShowDraftsModal(true)}
              className="flex items-center gap-1.5 border border-amber-300 text-amber-700 hover:bg-amber-50 text-sm font-semibold px-3 py-2 rounded-xl transition-colors flex-shrink-0 relative">
              <BookOpen size={15} />
              <span className="hidden sm:inline">טיוטות</span>
              {drafts.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {drafts.length}
                </span>
              )}
            </button>
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-3 py-2 rounded-xl shadow-sm transition-colors flex-shrink-0">
              <PenLine size={15} />
              <span>פריט חדש</span>
            </button>
          </div>
          <p className="text-gray-500 text-sm">{allItems.length} פריטים · לחץ על מחיר/יחידה לעריכה · בחר מע"מ לכל פריט בנפרד</p>
          <div className="mt-4 relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="חיפוש פריט..."
              className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pr-9 pl-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Category pills */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3">
          <div className="flex flex-wrap gap-2">
            {allCategories.map(cat => {
              const active = activeCategory === cat.key;
              const isUserCat = cat.key.startsWith("user_");
              return (
                <div key={cat.key} className="group relative">
                  <button onClick={() => setActiveCategory(cat.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                      active ? "bg-green-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:border-green-300 hover:text-green-700"
                    }`}>
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                    {/* Inline edit icon for user categories */}
                    {isUserCat && (
                      <Pencil size={10} className={`opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0 ${active ? "text-white" : "text-gray-400"}`} />
                    )}
                  </button>
                  {/* Edit name button (user categories only) */}
                  {isUserCat && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        const newName = window.prompt("שם חדש לקטגוריה:", cat.label);
                        if (newName && newName.trim()) renameCustomCategory(cat.key, newName.trim());
                      }}
                      title="ערוך שם"
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-blue-500 hover:bg-blue-600 text-white hidden group-hover:flex items-center justify-center shadow z-10 transition-colors">
                      <Pencil size={7} strokeWidth={3} />
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); deleteCategory(cat.key); }}
                    title="מחק קטגוריה"
                    className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 text-white hidden group-hover:flex items-center justify-center shadow z-10 transition-colors">
                    <X size={8} strokeWidth={3} />
                  </button>
                </div>
              );
            })}

            {/* Add category button */}
            <button
              onClick={() => setShowAddCategoryModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-2 border-dashed border-gray-300 text-gray-400 hover:border-green-400 hover:text-green-600 transition-all duration-150 whitespace-nowrap">
              <Plus size={13} />
              <span>קטגוריה חדשה</span>
            </button>

          </div>
        </div>

        {/* Main */}
        <div className="px-4 sm:px-6 py-5 lg:flex lg:gap-5 lg:items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <p className="text-xs text-gray-400">{filtered.length} פריטים מוצגים</p>
            </div>
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-lg font-medium">לא נמצאו פריטים</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    price={ep(item)}
                    unit={eu(item)}
                    name={en(item)}
                    vat={vat(item)}
                    onAdd={() => addToQuote(item)}
                    onPriceChange={n => setPriceOverride(item.id, n)}
                    onUnitChange={s => setUnitOverride(item.id, s)}
                    onNameChange={s => setNameOverride(item.id, s)}
                    onVatChange={v => setVatOverride(item.id, v)}
                    onDelete={() => deleteItem(item.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Desktop quote panel */}
          <div className="hidden lg:block w-72 flex-shrink-0 sticky top-5">
            <QuotePanel
              quote={quote} overridePrices={overridePrices} overrideUnits={overrideUnits} overrideNames={overrideNames} vatItems={vatItems}
              onQtyChange={changeQty} onQtySet={setQty}
              onRemove={id => setQuote(prev => prev.filter(qi => qi.item.id !== id))}
              onClear={() => setQuote([])}
              onPrint={handlePrint}
              onSaveToProject={() => setShowSaveModal(true)}
              onSaveDraft={() => setShowSaveDraftModal(true)}
              collapsed={panelCollapsed} onToggle={() => setPanelCollapsed(p => !p)}
            />
          </div>
        </div>

        {/* Mobile quote panel */}
        <div className="lg:hidden">
          {quote.length > 0 && (
            <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 shadow-xl">
              <div className="px-4 pt-3 pb-4">
                <QuotePanel
                  quote={quote} overridePrices={overridePrices} overrideUnits={overrideUnits} overrideNames={overrideNames} vatItems={vatItems}
                  onQtyChange={changeQty} onQtySet={setQty}
                  onRemove={id => setQuote(prev => prev.filter(qi => qi.item.id !== id))}
                  onClear={() => setQuote([])}
                  onPrint={handlePrint}
                  onSaveToProject={() => setShowSaveModal(true)}
                  onSaveDraft={() => setShowSaveDraftModal(true)}
                  collapsed={panelCollapsed} onToggle={() => setPanelCollapsed(p => !p)}
                />
              </div>
            </div>
          )}
          {quote.length > 0 && <div className="h-44" />}
        </div>
      </div>
    </div>
  );
}
