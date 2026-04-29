"use client";

import { useState, useMemo, useRef } from "react";
import { Search, X, Plus, Minus, Trash2, Printer, ShoppingCart, ChevronDown, ChevronUp } from "lucide-react";
import { PRICE_LIST, PRICE_CATEGORIES, type PriceItem } from "@/lib/price-list-data";

interface QuoteItem {
  item: PriceItem;
  qty: number;
}

function formatPrice(n: number) {
  return "₪" + n.toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function ItemRow({ item, onAdd }: { item: PriceItem; onAdd: () => void }) {
  const catEmoji = PRICE_CATEGORIES.find(c => c.key === item.category)?.emoji ?? "📦";
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow group">
      <span className="text-xl flex-shrink-0">{catEmoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 leading-snug">{item.name}</p>
        {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
      </div>
      <div className="flex-shrink-0 text-left">
        <p className="text-base font-bold text-green-700">{formatPrice(item.price)}</p>
        <p className="text-xs text-gray-400">לכל {item.unit}</p>
      </div>
      <button
        onClick={onAdd}
        className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center transition-colors shadow-sm"
        title="הוסף להצעה"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

function QuotePanel({
  quote,
  onQtyChange,
  onRemove,
  onClear,
  onPrint,
  collapsed,
  onToggle,
}: {
  quote: QuoteItem[];
  onQtyChange: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onPrint: () => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const total = quote.reduce((sum, qi) => sum + qi.item.price * qi.qty, 0);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 cursor-pointer select-none"
        onClick={onToggle}
      >
        <ShoppingCart size={18} className="text-green-600 flex-shrink-0" />
        <h2 className="font-bold text-gray-900 text-base flex-1">הצעת מחיר</h2>
        {quote.length > 0 && (
          <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {quote.length}
          </span>
        )}
        {collapsed ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronUp size={16} className="text-gray-400" />}
      </div>

      {!collapsed && (
        <>
          {/* Items */}
          <div className="flex-1 overflow-y-auto max-h-[420px]">
            {quote.length === 0 ? (
              <div className="py-10 text-center text-gray-400">
                <ShoppingCart size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">לחץ + להוסיף פריטים</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {quote.map(({ item, qty }) => (
                  <div key={item.id} className="px-4 py-2.5 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700 leading-snug truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">{formatPrice(item.price)} / {item.unit}</p>
                    </div>
                    {/* Qty controls */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => onQtyChange(item.id, -1)}
                        className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 transition-colors"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="w-7 text-center text-sm font-bold text-gray-800">{qty}</span>
                      <button
                        onClick={() => onQtyChange(item.id, 1)}
                        className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 transition-colors"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                    <div className="w-16 text-left flex-shrink-0">
                      <p className="text-xs font-bold text-green-700">{formatPrice(item.price * qty)}</p>
                    </div>
                    <button
                      onClick={() => onRemove(item.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {quote.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">סה"כ חומרים</span>
                <span className="text-xl font-black text-gray-900">{formatPrice(total)}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onPrint}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded-xl transition-colors shadow-sm"
                >
                  <Printer size={15} />
                  <span>הדפס / PDF</span>
                </button>
                <button
                  onClick={onClear}
                  className="px-3 py-2 border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 rounded-xl text-sm transition-colors"
                  title="נקה הצעה"
                >
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

/* ── Print stylesheet injected once ── */
const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #quote-print, #quote-print * { visibility: visible !important; }
  #quote-print { position: fixed !important; inset: 0 !important; padding: 30px !important; background: white !important; }
}
`;

export default function PricerPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [quote, setQuote] = useState<QuoteItem[]>([]);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const printStyleRef = useRef(false);

  const filtered = useMemo(() => {
    return PRICE_LIST.filter((item) => {
      const matchCat = activeCategory === "all" || item.category === activeCategory;
      const q = search.trim().toLowerCase();
      if (!q) return matchCat;
      return matchCat && (
        item.name.toLowerCase().includes(q) ||
        (item.notes ?? "").toLowerCase().includes(q)
      );
    });
  }, [search, activeCategory]);

  function addToQuote(item: PriceItem) {
    setQuote(prev => {
      const existing = prev.find(qi => qi.item.id === item.id);
      if (existing) return prev.map(qi => qi.item.id === item.id ? { ...qi, qty: qi.qty + 1 } : qi);
      return [...prev, { item, qty: 1 }];
    });
    setPanelCollapsed(false);
  }

  function changeQty(id: string, delta: number) {
    setQuote(prev => {
      return prev
        .map(qi => qi.item.id === id ? { ...qi, qty: qi.qty + delta } : qi)
        .filter(qi => qi.qty > 0);
    });
  }

  function removeItem(id: string) {
    setQuote(prev => prev.filter(qi => qi.item.id !== id));
  }

  function clearQuote() {
    setQuote([]);
  }

  function handlePrint() {
    // Inject print style once
    if (!printStyleRef.current) {
      const style = document.createElement("style");
      style.innerHTML = PRINT_STYLE;
      document.head.appendChild(style);
      printStyleRef.current = true;
    }
    window.print();
  }

  const total = quote.reduce((sum, qi) => sum + qi.item.price * qi.qty, 0);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Print-only quote sheet */}
      <div id="quote-print" className="hidden print:block p-8" dir="rtl">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">הצעת מחיר — חומרי גינון</h1>
        <p className="text-sm text-gray-500 mb-6">{new Date().toLocaleDateString("he-IL")}</p>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="text-right p-2 border border-gray-200">פריט</th>
              <th className="text-center p-2 border border-gray-200">יח'</th>
              <th className="text-center p-2 border border-gray-200">כמות</th>
              <th className="text-left p-2 border border-gray-200">מחיר יח'</th>
              <th className="text-left p-2 border border-gray-200">סה"כ</th>
            </tr>
          </thead>
          <tbody>
            {quote.map(({ item, qty }) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="p-2 border border-gray-200">{item.name}</td>
                <td className="p-2 text-center border border-gray-200">{item.unit}</td>
                <td className="p-2 text-center border border-gray-200">{qty}</td>
                <td className="p-2 text-left border border-gray-200">{formatPrice(item.price)}</td>
                <td className="p-2 text-left font-bold border border-gray-200">{formatPrice(item.price * qty)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-bold">
              <td colSpan={4} className="p-2 text-right border border-gray-200">סה"כ:</td>
              <td className="p-2 text-left border border-gray-200">{formatPrice(total)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="text-xs text-gray-400 mt-6">* המחירים הינם ממוצע סיטונאי ועשויים להשתנות</p>
      </div>

      {/* Screen layout */}
      <div className="print:hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-5">
          <h1 className="text-2xl font-bold text-gray-900 mb-0.5">💰 מחירון גינון</h1>
          <p className="text-gray-500 text-sm">{PRICE_LIST.length} פריטים · מחירי עלות ממוצעים לגנן</p>
          {/* Search */}
          <div className="mt-4 relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="חיפוש פריט..."
              className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pr-9 pl-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
            />
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
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 whitespace-nowrap ${
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

        {/* Main content */}
        <div className="px-4 sm:px-6 py-5 lg:flex lg:gap-5 lg:items-start">
          {/* Items list */}
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-3">{filtered.length} פריטים מוצגים</p>
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-lg font-medium">לא נמצאו פריטים</p>
                <p className="text-sm mt-1">נסה לשנות את החיפוש</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(item => (
                  <ItemRow key={item.id} item={item} onAdd={() => addToQuote(item)} />
                ))}
              </div>
            )}
          </div>

          {/* Quote panel — desktop sticky sidebar */}
          <div className="hidden lg:block w-72 flex-shrink-0 sticky top-5">
            <QuotePanel
              quote={quote}
              onQtyChange={changeQty}
              onRemove={removeItem}
              onClear={clearQuote}
              onPrint={handlePrint}
              collapsed={panelCollapsed}
              onToggle={() => setPanelCollapsed(p => !p)}
            />
          </div>
        </div>

        {/* Mobile: floating quote button + bottom sheet */}
        <div className="lg:hidden">
          {quote.length > 0 && (
            <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 shadow-xl">
              <div className="px-4 pt-3 pb-4">
                <QuotePanel
                  quote={quote}
                  onQtyChange={changeQty}
                  onRemove={removeItem}
                  onClear={clearQuote}
                  onPrint={handlePrint}
                  collapsed={panelCollapsed}
                  onToggle={() => setPanelCollapsed(p => !p)}
                />
              </div>
            </div>
          )}
          {/* Spacer so content isn't hidden behind panel */}
          {quote.length > 0 && <div className="h-44" />}
        </div>
      </div>
    </div>
  );
}
