"use client";

import { useState, useMemo, useRef } from "react";
import { Search, X, Plus, Minus, Trash2, Printer, ShoppingCart, ChevronDown, ChevronUp, Pencil, Check } from "lucide-react";
import { PRICE_LIST, PRICE_CATEGORIES, type PriceItem } from "@/lib/price-list-data";

const VAT = 0.17;

interface QuoteItem {
  item: PriceItem;
  qty: number;
}

function formatPrice(n: number) {
  return "₪" + n.toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
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
      <input ref={ref} type={numeric ? "number" : "text"} min={numeric ? 0 : undefined}
        value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
        className={inputClass} />
      <button onClick={commit} className="text-green-600 hover:text-green-800 flex-shrink-0"><Check size={14} /></button>
    </div>
  );
  return (
    <button onClick={start} className={`group/ie flex items-center gap-1 ${displayClass}`} title="לחץ לעריכה">
      {prefix && !isCustom && <span>{prefix}</span>}
      <span className={isCustom ? "text-orange-600" : ""}>{value}</span>
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
  item, price, unit, vat,
  onAdd, onPriceChange, onUnitChange, onVatChange,
}: {
  item: PriceItem; price: number; unit: string; vat: "before" | "after";
  onAdd: () => void;
  onPriceChange: (n: number) => void;
  onUnitChange: (s: string) => void;
  onVatChange: (v: "before" | "after") => void;
}) {
  const catEmoji = PRICE_CATEGORIES.find(c => c.key === item.category)?.emoji ?? "📦";
  const vatMul = vat === "after" ? 1 + VAT : 1;
  const displayPrice = price * vatMul;

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
      <span className="text-xl flex-shrink-0">{catEmoji}</span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 leading-snug">{item.name}</p>
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

      <button onClick={onAdd}
        className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center transition-colors shadow-sm"
        title="הוסף להצעה">
        <Plus size={16} />
      </button>
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

// ── Quote panel ─────────────────────────────────────────────────────────────
function QuotePanel({
  quote, overridePrices, overrideUnits, vatItems,
  onQtyChange, onQtySet, onRemove, onClear, onPrint, collapsed, onToggle,
}: {
  quote: QuoteItem[];
  overridePrices: Record<string, number>;
  overrideUnits: Record<string, string>;
  vatItems: Record<string, "before" | "after">;
  onQtyChange: (id: string, delta: number) => void;
  onQtySet: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onPrint: () => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  function ep(item: PriceItem) { return overridePrices[item.id] ?? item.price; }
  function eu(item: PriceItem) { return overrideUnits[item.id] ?? item.unit; }
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
                    <div key={item.id} className="px-4 py-2.5 flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 leading-snug truncate">{item.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-xs text-gray-400">{formatPrice(p)} / {eu(item)}</p>
                          {isVat && (
                            <span className="text-[10px] bg-blue-100 text-blue-600 px-1 rounded font-medium">+מע"מ</span>
                          )}
                        </div>
                      </div>
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
                      <div className="w-16 text-left flex-shrink-0">
                        <p className="text-xs font-bold text-green-700">{formatPrice(p * qty)}</p>
                      </div>
                      <button onClick={() => onRemove(item.id)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                        <Trash2 size={13} />
                      </button>
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
                <button onClick={onPrint}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded-xl transition-colors shadow-sm">
                  <Printer size={15} /><span>הדפס / PDF</span>
                </button>
                <button onClick={onClear}
                  className="px-3 py-2 border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 rounded-xl text-sm transition-colors"
                  title="נקה הצעה">
                  <Trash2 size={15} />
                </button>
              </div>
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
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [quote, setQuote] = useState<QuoteItem[]>([]);
  const [overridePrices, setOverridePrices] = useState<Record<string, number>>({});
  const [overrideUnits, setOverrideUnits] = useState<Record<string, string>>({});
  const [vatItems, setVatItems] = useState<Record<string, "before" | "after">>({});
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const printStyleRef = useRef(false);

  function ep(item: PriceItem) { return overridePrices[item.id] ?? item.price; }
  function eu(item: PriceItem) { return overrideUnits[item.id] ?? item.unit; }
  function vat(item: PriceItem) { return vatItems[item.id] ?? "before"; }
  function vm(item: PriceItem) { return vat(item) === "after" ? 1 + VAT : 1; }

  function setPriceOverride(id: string, newPrice: number) {
    setOverridePrices(prev => {
      const item = PRICE_LIST.find(i => i.id === id);
      if (item && newPrice === item.price) { const { [id]: _, ...rest } = prev; return rest; }
      return { ...prev, [id]: newPrice };
    });
  }

  function setUnitOverride(id: string, newUnit: string) {
    setOverrideUnits(prev => {
      const item = PRICE_LIST.find(i => i.id === id);
      if (item && newUnit === item.unit) { const { [id]: _, ...rest } = prev; return rest; }
      return { ...prev, [id]: newUnit };
    });
  }

  function setVatOverride(id: string, v: "before" | "after") {
    setVatItems(prev => ({ ...prev, [id]: v }));
  }

  const filtered = useMemo(() => PRICE_LIST.filter(item => {
    const matchCat = activeCategory === "all" || item.category === activeCategory;
    const q = search.trim().toLowerCase();
    if (!q) return matchCat;
    return matchCat && (item.name.toLowerCase().includes(q) || (item.notes ?? "").toLowerCase().includes(q));
  }), [search, activeCategory]);

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

  function handlePrint() {
    if (!printStyleRef.current) {
      const s = document.createElement("style"); s.innerHTML = PRINT_STYLE;
      document.head.appendChild(s); printStyleRef.current = true;
    }
    window.print();
  }

  const total = quote.reduce((sum, qi) => sum + ep(qi.item) * vm(qi.item) * qi.qty, 0);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

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
                  <td className="p-2 border border-gray-200">{item.name}</td>
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

      {/* ── Screen view ── */}
      <div className="print:hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-5">
          <h1 className="text-2xl font-bold text-gray-900 mb-0.5">💰 מחירון גינון</h1>
          <p className="text-gray-500 text-sm">{PRICE_LIST.length} פריטים · לחץ על מחיר/יחידה לעריכה · בחר מע"מ לכל פריט בנפרד</p>
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
            {PRICE_CATEGORIES.map(cat => {
              const active = activeCategory === cat.key;
              return (
                <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                    active ? "bg-green-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:border-green-300 hover:text-green-700"
                  }`}>
                  <span>{cat.emoji}</span><span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main */}
        <div className="px-4 sm:px-6 py-5 lg:flex lg:gap-5 lg:items-start">
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-3">{filtered.length} פריטים מוצגים</p>
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
                    vat={vat(item)}
                    onAdd={() => addToQuote(item)}
                    onPriceChange={n => setPriceOverride(item.id, n)}
                    onUnitChange={s => setUnitOverride(item.id, s)}
                    onVatChange={v => setVatOverride(item.id, v)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Desktop quote panel */}
          <div className="hidden lg:block w-72 flex-shrink-0 sticky top-5">
            <QuotePanel
              quote={quote} overridePrices={overridePrices} overrideUnits={overrideUnits} vatItems={vatItems}
              onQtyChange={changeQty} onQtySet={setQty}
              onRemove={id => setQuote(prev => prev.filter(qi => qi.item.id !== id))}
              onClear={() => setQuote([])}
              onPrint={handlePrint}
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
                  quote={quote} overridePrices={overridePrices} overrideUnits={overrideUnits} vatItems={vatItems}
                  onQtyChange={changeQty} onQtySet={setQty}
                  onRemove={id => setQuote(prev => prev.filter(qi => qi.item.id !== id))}
                  onClear={() => setQuote([])}
                  onPrint={handlePrint}
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
