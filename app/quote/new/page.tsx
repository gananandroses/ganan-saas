"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Plus, Trash2, Search, Save, Printer, MessageSquare, Loader2, ChevronRight, X, User as UserIcon, Calendar as CalendarIcon, ShoppingCart,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { PRICE_LIST, PRICE_CATEGORIES, type PriceItem } from "@/lib/price-list-data";

const VAT = 0.18;

interface QuoteItem {
  id: string;
  name: string;
  unit: string;
  basePrice: number;
  qty: number;
  customPrice?: number;
}

interface CustomerOption { id: string; name: string; address: string; phone: string }

interface PaymentSettings {
  bitPhone: string;
  payboxPhone: string;
  bankName: string;
  bankBranch: string;
  bankAccount: string;
  businessName: string;
}

function fmt(n: number) {
  return `₪${Math.round(n).toLocaleString("he-IL")}`;
}

export default function QuotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Quote details
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [markup, setMarkup] = useState(100); // default 100%
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");

  // Customer
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");

  // Item picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  // Payment settings (for the quote footer)
  const [settings, setSettings] = useState<PaymentSettings>({
    bitPhone: "", payboxPhone: "", bankName: "", bankBranch: "", bankAccount: "", businessName: "",
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [custRes, profileRes] = await Promise.all([
        supabase.from("customers").select("id, name, address, phone").eq("user_id", user.id).order("name"),
        supabase.from("user_profile").select("business_name, bit_phone, paybox_phone, bank_name, bank_branch, bank_account, quote_default_validity_days, quote_default_markup, quote_default_notes").eq("user_id", user.id).single(),
      ]);

      if (custRes.data) {
        setCustomers(custRes.data.map(c => ({
          id: String(c.id), name: c.name ?? "", address: c.address ?? "", phone: c.phone ?? "",
        })));
      }

      let validityDays = 30;
      if (profileRes.data) {
        setSettings({
          businessName: profileRes.data.business_name ?? "",
          bitPhone: profileRes.data.bit_phone ?? "",
          payboxPhone: profileRes.data.paybox_phone ?? "",
          bankName: profileRes.data.bank_name ?? "",
          bankBranch: profileRes.data.bank_branch ?? "",
          bankAccount: profileRes.data.bank_account ?? "",
        });
        // Apply template defaults
        validityDays = Number(profileRes.data.quote_default_validity_days ?? 30);
        if (profileRes.data.quote_default_markup !== null && profileRes.data.quote_default_markup !== undefined) {
          setMarkup(Number(profileRes.data.quote_default_markup));
        }
        if (profileRes.data.quote_default_notes) {
          setNotes(profileRes.data.quote_default_notes);
        }
      }

      // Default valid_until = +N days from template
      const d = new Date();
      d.setDate(d.getDate() + validityDays);
      setValidUntil(d.toISOString().slice(0, 10));

      setLoading(false);
    })();
  }, []);

  // Filter customers
  const filteredCustomers = customers.filter(c => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return true;
    return (c.name || "").toLowerCase().includes(q) || (c.address || "").toLowerCase().includes(q);
  });

  // Item picker — categories with Hebrew labels
  const categories = useMemo(() => {
    const seen = new Set<string>();
    PRICE_LIST.forEach(p => seen.add(p.category));
    // Build list with Hebrew labels from PRICE_CATEGORIES, fallback to key
    const labelFor = (key: string) => {
      const c = PRICE_CATEGORIES.find(c => c.key === key);
      return c ? `${c.emoji} ${c.label}` : key;
    };
    return [
      { key: "all", label: "📋 הכל" },
      ...Array.from(seen).sort().map(key => ({ key, label: labelFor(key) })),
    ];
  }, []);

  // Filtered price list
  const filteredPriceList = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    return PRICE_LIST.filter(p => {
      if (activeCategory !== "all" && p.category !== activeCategory) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
    });
  }, [itemSearch, activeCategory]);

  // Add item to quote
  function addItem(p: PriceItem) {
    if (items.find(i => i.id === p.id)) {
      // already in quote — increase qty
      setItems(prev => prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setItems(prev => [...prev, { id: p.id, name: p.name, unit: p.unit, basePrice: p.price, qty: 1 }]);
    }
  }

  function updateItem(id: string, patch: Partial<QuoteItem>) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  }
  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  // Calculate totals
  const markupMultiplier = 1 + markup / 100;
  const itemsWithCalc = items.map(i => {
    const finalPrice = i.customPrice !== undefined ? i.customPrice : Math.round(i.basePrice * markupMultiplier);
    const lineTotal = finalPrice * i.qty;
    return { ...i, finalPrice, lineTotal };
  });
  const subtotalBeforeVat = itemsWithCalc.reduce((s, i) => s + i.lineTotal, 0);
  const vatAmount = Math.round(subtotalBeforeVat * VAT);
  const totalWithVat = subtotalBeforeVat + vatAmount;

  // Save quote
  async function handleSave(asDraft = false) {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const customerName = customerMode === "existing"
      ? (selectedCustomer?.name ?? "")
      : newCustomerName.trim();
    const customerPhone = customerMode === "existing"
      ? (selectedCustomer?.phone ?? "")
      : newCustomerPhone.trim();
    const customerAddress = customerMode === "existing"
      ? (selectedCustomer?.address ?? "")
      : newCustomerAddress.trim();

    if (!customerName) { alert("חובה לבחור לקוח"); setSaving(false); return; }
    if (!title.trim()) { alert("חובה להזין כותרת להצעה"); setSaving(false); return; }
    if (items.length === 0) { alert("חובה להוסיף לפחות פריט אחד"); setSaving(false); return; }

    await supabase.from("quotes").insert({
      user_id: user.id,
      customer_id: customerMode === "existing" ? selectedCustomer?.id : null,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      title: title.trim(),
      items,
      markup_percent: markup,
      subtotal_before_vat: subtotalBeforeVat,
      vat_amount: vatAmount,
      total_with_vat: totalWithVat,
      status: asDraft ? "draft" : "sent",
      valid_until: validUntil || null,
      notes: notes.trim() || null,
    });

    setSaving(false);
    alert(asDraft ? "✅ ההצעה נשמרה כטיוטה" : "✅ הצעת המחיר נשמרה");
    router.push("/quote");
  }

  // Send WhatsApp
  function sendWhatsApp() {
    const phone = customerMode === "existing" ? selectedCustomer?.phone : newCustomerPhone;
    const customerName = customerMode === "existing" ? selectedCustomer?.name : newCustomerName;
    if (!phone) { alert("אין טלפון ללקוח"); return; }
    const cleaned = phone.replace(/\D/g, "");
    let intl = cleaned;
    if (cleaned.startsWith("0")) intl = "972" + cleaned.slice(1);
    else if (cleaned.startsWith("972")) intl = cleaned;

    let msg = `שלום ${customerName},\n\nמצורפת הצעת מחיר עבור "${title}":\n\n`;
    itemsWithCalc.forEach(i => {
      msg += `• ${i.name}: ${i.qty} ${i.unit} × ${fmt(i.finalPrice)} = ${fmt(i.lineTotal)}\n`;
    });
    msg += `\nסה"כ לפני מע"מ: ${fmt(subtotalBeforeVat)}`;
    msg += `\nמע"מ (18%): ${fmt(vatAmount)}`;
    msg += `\nסה"כ לתשלום: ${fmt(totalWithVat)}`;
    if (validUntil) msg += `\n\nההצעה בתוקף עד: ${validUntil}`;
    if (notes) msg += `\n\nהערות: ${notes}`;

    // Append payment block
    const lines: string[] = [];
    if (settings.bitPhone) lines.push(`• Bit: ${settings.bitPhone}`);
    if (settings.payboxPhone) lines.push(`• PayBox: ${settings.payboxPhone}`);
    if (settings.bankName || settings.bankAccount) {
      lines.push(`• העברה בנקאית: ${settings.bankName}${settings.bankBranch ? ` סניף ${settings.bankBranch}` : ""}${settings.bankAccount ? ` חשבון ${settings.bankAccount}` : ""}`);
    }
    if (lines.length > 0) {
      msg += `\n\nאמצעי תשלום:\n${lines.join("\n")}`;
    }
    if (settings.businessName) msg += `\n\n${settings.businessName}`;

    window.open(`https://api.whatsapp.com/send?phone=${intl}&text=${encodeURIComponent(msg)}`, "_blank");
  }

  function handlePrint() { window.print(); }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Loader2 size={28} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 print:bg-white">
      <div className="px-4 py-5 max-w-4xl mx-auto space-y-4 pb-32">

        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/quote")} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-100" title="חזרה לרשימת הצעות">
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">הצעת מחיר ללקוח</h1>
              <p className="text-xs text-gray-500">בנה הצעה מהמחירון, ערוך ושלח</p>
            </div>
          </div>
        </div>

        {/* Customer selector */}
        <section className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 space-y-3 print:bg-white print:border-0">
          <label className="block text-sm font-bold text-blue-900 print:text-black">1️⃣ לקוח</label>
          <div className="flex gap-2 print:hidden">
            <button onClick={() => setCustomerMode("existing")}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${customerMode === "existing" ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-500 border-gray-200"}`}>
              👤 לקוח קיים
            </button>
            <button onClick={() => { setCustomerMode("new"); setSelectedCustomer(null); }}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${customerMode === "new" ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-500 border-gray-200"}`}>
              ✨ לקוח חדש
            </button>
          </div>
          {customerMode === "existing" ? (
            <div className="space-y-2 print:hidden">
              {selectedCustomer ? (
                /* Selected customer card with change button */
                <div className="bg-white rounded-xl border-2 border-green-300 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                      ✓
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{selectedCustomer.name}</p>
                      {selectedCustomer.address && (
                        <p className="text-xs text-gray-500">{selectedCustomer.address}</p>
                      )}
                      {selectedCustomer.phone && (
                        <p className="text-xs text-gray-400">{selectedCustomer.phone}</p>
                      )}
                    </div>
                  </div>
                  <button onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50">
                    שנה
                  </button>
                </div>
              ) : (
                /* Search + list (only when nothing selected) */
                <>
                  <div className="relative">
                    <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500" />
                    <input
                      autoFocus
                      value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                      placeholder={`חפש בין ${customers.length} לקוחות...`}
                      className="w-full border-2 border-blue-300 bg-white rounded-xl px-4 py-2.5 pr-9 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl max-h-48 overflow-y-auto">
                    {filteredCustomers.length === 0 ? (
                      <p className="px-4 py-3 text-center text-sm text-gray-500">לא נמצא לקוח</p>
                    ) : (
                      filteredCustomers.map(c => (
                        <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(""); }}
                          className="w-full text-right px-4 py-2 transition-colors border-b border-gray-50 last:border-0 hover:bg-green-50">
                          <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                          {c.address && <p className="text-xs text-gray-400">{c.address}</p>}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2 print:hidden">
              <input value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} placeholder="שם הלקוח *"
                className="w-full border-2 border-blue-300 bg-white rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <input value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} placeholder="טלפון"
                className="w-full border border-gray-200 bg-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <input value={newCustomerAddress} onChange={e => setNewCustomerAddress(e.target.value)} placeholder="כתובת"
                className="w-full border border-gray-200 bg-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          )}
          {(selectedCustomer || (customerMode === "new" && newCustomerName)) && (
            <div className="bg-white rounded-xl px-3 py-2 text-sm border border-blue-100 print:border-0 print:px-0">
              <span className="text-gray-500 ml-2">לקוח:</span>
              <span className="font-bold text-gray-900">
                {customerMode === "existing" ? selectedCustomer?.name : newCustomerName}
              </span>
              {(customerMode === "existing" ? selectedCustomer?.address : newCustomerAddress) && (
                <span className="text-gray-500 mr-2">· {customerMode === "existing" ? selectedCustomer?.address : newCustomerAddress}</span>
              )}
            </div>
          )}
        </section>

        {/* Title + dates */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 print:border-0">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 print:hidden">2️⃣ כותרת ההצעה</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="לדוגמה: הקמת גינה — משפחת כהן"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-base font-bold focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div className="grid grid-cols-2 gap-3 print:hidden">
            <div>
              <label className="block text-xs text-gray-500 mb-1">תקף עד</label>
              <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} dir="ltr"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>
        </section>

        {/* Markup control */}
        <section className="bg-gradient-to-l from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-4 space-y-3 print:hidden">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-amber-900">💰 אחוז ייקור על מחיר עלות</label>
            <div className="flex items-center gap-1.5">
              <input type="number" min={0} max={500} step={5} value={markup}
                onChange={e => setMarkup(Math.max(0, Math.min(500, parseFloat(e.target.value) || 0)))}
                className="w-16 border border-amber-300 bg-white rounded-lg px-2 py-1 text-center font-bold text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-400" />
              <span className="text-sm font-bold text-amber-700">%</span>
            </div>
          </div>
          <div className="flex gap-1.5">
            {[0, 25, 50, 100, 150, 200].map(v => (
              <button key={v} onClick={() => setMarkup(v)}
                className={`flex-1 text-xs py-1.5 rounded-lg font-bold transition-colors ${markup === v ? "bg-amber-500 text-white" : "bg-white text-amber-700 border border-amber-200"}`}>
                {v}%
              </button>
            ))}
          </div>
          <p className="text-xs text-amber-700">
            ⓘ מחיר מחירון × {markupMultiplier.toFixed(2)}. דוגמה: עציץ ב-₪10 יוצג כ-{fmt(Math.round(10 * markupMultiplier))} (לפני מע״מ)
          </p>
        </section>

        {/* Items */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart size={16} /> 3️⃣ פריטים בהצעה ({items.length})
            </label>
            <button onClick={() => setPickerOpen(true)} className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg print:hidden">
              <Plus size={14} /> בחר מהמחירון
            </button>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
              <p>אין פריטים. לחץ "בחר מהמחירון" להוסיף.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100">
                    <th className="text-right py-2">פריט</th>
                    <th className="text-center py-2 w-20">כמות</th>
                    <th className="text-center py-2 w-24">מחיר ליח'</th>
                    <th className="text-left py-2 w-24">סה״כ</th>
                    <th className="w-8 print:hidden"></th>
                  </tr>
                </thead>
                <tbody>
                  {itemsWithCalc.map(i => (
                    <tr key={i.id} className="border-b border-gray-50">
                      <td className="py-2.5">
                        <p className="font-medium text-gray-800">{i.name}</p>
                        <p className="text-xs text-gray-400">{i.unit} · מחירון: {fmt(i.basePrice)}</p>
                      </td>
                      <td className="text-center py-2.5">
                        <input type="number" min={0} step={0.5} value={i.qty}
                          onChange={e => updateItem(i.id, { qty: parseFloat(e.target.value) || 0 })}
                          className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-green-400 print:border-0" />
                      </td>
                      <td className="text-center py-2.5">
                        <input type="number" min={0} value={i.finalPrice}
                          onChange={e => updateItem(i.id, { customPrice: parseFloat(e.target.value) || 0 })}
                          className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-green-400 print:border-0" />
                      </td>
                      <td className="text-left py-2.5 font-bold text-gray-900">{fmt(i.lineTotal)}</td>
                      <td className="print:hidden">
                        <button onClick={() => removeItem(i.id)} className="text-gray-300 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          {items.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 mt-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">סה״כ לפני מע״מ</span>
                <span className="font-semibold text-gray-800">{fmt(subtotalBeforeVat)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">מע״מ (18%)</span>
                <span className="font-semibold text-gray-800">{fmt(vatAmount)}</span>
              </div>
              <div className="flex justify-between text-base border-t border-gray-200 pt-1.5 mt-1.5">
                <span className="font-bold text-gray-900">סה״כ לתשלום</span>
                <span className="font-black text-green-700 text-lg">{fmt(totalWithVat)}</span>
              </div>
            </div>
          )}
        </section>

        {/* Notes */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 print:border-0">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">הערות (אופציונלי)</label>
          <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="תנאי תשלום, תיאור עבודה, וכו'..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
        </section>

        {/* Actions */}
        <div className="flex flex-col gap-2 print:hidden">
          <div className="flex gap-2">
            <button onClick={() => handleSave(false)} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold rounded-2xl py-3 text-sm">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "שומר..." : "שמור הצעה"}
            </button>
            <button onClick={() => handleSave(true)} disabled={saving}
              className="px-4 py-3 rounded-2xl bg-purple-50 border-2 border-purple-200 text-purple-700 hover:bg-purple-100 text-sm font-semibold">
              📝 טיוטה
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={sendWhatsApp} disabled={items.length === 0}
              className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold rounded-2xl py-3 text-sm">
              <MessageSquare size={16} /> שלח ב-WhatsApp
            </button>
            <button onClick={handlePrint} disabled={items.length === 0}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 text-sm font-semibold">
              <Printer size={16} /> הדפס/PDF
            </button>
          </div>
        </div>
      </div>

      {/* Item picker modal */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={(e) => e.target === e.currentTarget && setPickerOpen(false)}>
          <div className="bg-white w-full sm:max-w-lg sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh]" dir="rtl">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-gray-900">בחר פריט מהמחירון</h3>
              <button onClick={() => setPickerOpen(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="px-5 py-3 border-b space-y-2">
              <div className="relative">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="חפש פריט..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {categories.map(c => (
                  <button key={c.key} onClick={() => setActiveCategory(c.key)}
                    className={`text-xs px-2.5 py-1 rounded-lg whitespace-nowrap ${activeCategory === c.key ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredPriceList.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">לא נמצא פריט</p>
              ) : (
                filteredPriceList.slice(0, 100).map(p => {
                  const cat = PRICE_CATEGORIES.find(c => c.key === p.category);
                  const catLabel = cat ? `${cat.emoji} ${cat.label}` : p.category;
                  return (
                    <button key={p.id} onClick={() => addItem(p)}
                      className="w-full text-right px-5 py-2.5 hover:bg-green-50 border-b border-gray-50 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                        <p className="text-xs text-gray-400">₪{p.price} / {p.unit} · {catLabel}</p>
                      </div>
                      <Plus size={18} className="text-green-600 flex-shrink-0" />
                    </button>
                  );
                })
              )}
            </div>
            <div className="px-5 py-3 border-t">
              <button onClick={() => setPickerOpen(false)} className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold">
                סיום ({items.length} פריטים)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
