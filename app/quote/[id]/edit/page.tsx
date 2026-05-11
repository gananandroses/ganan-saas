"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Plus, Trash2, Search, Save, Printer, MessageSquare, Loader2, X, ShoppingCart,
  ChevronDown, ChevronUp, Sparkles, AlertCircle, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast, confirmDialog } from "@/components/Toaster";
import { PRICE_CATEGORIES, type PriceItem } from "@/lib/price-list-data";
import { loadPricerSettings, buildEffectivePriceList, buildEffectiveCategories, type PricerSettings } from "@/lib/pricer-merge";

const VAT = 0.18;

interface QuoteItem {
  id: string;
  name: string;
  unit: string;
  basePrice: number;
  qty: number;
  customPrice?: number;
  description?: string;
  category?: string;
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

export default function QuoteEditPage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalStatus, setOriginalStatus] = useState<"draft" | "sent" | "accepted" | "rejected">("draft");
  const [quoteNumber, setQuoteNumber] = useState<string | null>(null);

  // Quote details
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [markup, setMarkup] = useState(100); // default 100%
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState<"amount" | "percent">("amount");
  const [depositPercent, setDepositPercent] = useState(50);
  const [successMode, setSuccessMode] = useState<null | "draft" | "saved">(null);

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

  // Same collapsible UI as /quote/new — keeps the form quiet by default.
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  // Pricer settings — synced with /pricer page
  const [pricerSettings, setPricerSettings] = useState<PricerSettings>({
    customItems: [], customCategories: [],
    overridePrices: {}, overrideUnits: {}, overrideNames: {},
    overrideCatNames: {}, overrideItemCats: {},
    hiddenItems: [], hiddenCategories: [],
  });

  // Payment settings (for the quote footer)
  const [settings, setSettings] = useState<PaymentSettings>({
    bitPhone: "", payboxPhone: "", bankName: "", bankBranch: "", bankAccount: "", businessName: "",
  });

  useEffect(() => {
    if (!quoteId) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [custRes, profileRes, quoteRes, pricerSet] = await Promise.all([
        supabase.from("customers").select("id, name, address, phone").eq("user_id", user.id).order("name"),
        supabase.from("user_profile").select("business_name, bit_phone, paybox_phone, bank_name, bank_branch, bank_account").eq("user_id", user.id).single(),
        supabase.from("quotes").select("*").eq("id", quoteId).eq("user_id", user.id).single(),
        loadPricerSettings(),
      ]);
      setPricerSettings(pricerSet);

      if (custRes.data) {
        setCustomers(custRes.data.map(c => ({
          id: String(c.id), name: c.name ?? "", address: c.address ?? "", phone: c.phone ?? "",
        })));
      }
      if (profileRes.data) {
        setSettings({
          businessName: profileRes.data.business_name ?? "",
          bitPhone: profileRes.data.bit_phone ?? "",
          payboxPhone: profileRes.data.paybox_phone ?? "",
          bankName: profileRes.data.bank_name ?? "",
          bankBranch: profileRes.data.bank_branch ?? "",
          bankAccount: profileRes.data.bank_account ?? "",
        });
      }

      if (quoteRes.data) {
        const q = quoteRes.data;
        setTitle(q.title ?? "");
        setItems(q.items ?? []);
        setMarkup(Number(q.markup_percent ?? 0));
        setValidUntil(q.valid_until ?? "");
        setNotes(q.notes ?? "");
        setOriginalStatus(q.status ?? "draft");
        setQuoteNumber(q.quote_number ?? null);
        setDiscountAmount(Number(q.discount_amount ?? 0));
        setDiscountType((q.discount_type as "amount" | "percent") ?? "amount");
        setDepositPercent(Number(q.deposit_percent ?? 50));

        // Customer
        if (q.customer_id) {
          const customer = custRes.data?.find(c => c.id === q.customer_id);
          if (customer) {
            setCustomerMode("existing");
            setSelectedCustomer({
              id: String(customer.id),
              name: customer.name ?? "",
              address: customer.address ?? "",
              phone: customer.phone ?? "",
            });
          } else {
            // Customer was deleted — fall back to "new" with stored data
            setCustomerMode("new");
            setNewCustomerName(q.customer_name ?? "");
            setNewCustomerPhone(q.customer_phone ?? "");
            setNewCustomerAddress(q.customer_address ?? "");
          }
        } else {
          // No customer_id stored — treat as "new" customer
          setCustomerMode("new");
          setNewCustomerName(q.customer_name ?? "");
          setNewCustomerPhone(q.customer_phone ?? "");
          setNewCustomerAddress(q.customer_address ?? "");
        }
      } else {
        toast.error("הצעת המחיר לא נמצאה");
        router.push("/quote");
        return;
      }

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId]);

  // Filter customers
  const filteredCustomers = customers.filter(c => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return true;
    return (c.name || "").toLowerCase().includes(q) || (c.address || "").toLowerCase().includes(q);
  });

  // Effective price list (PRICE_LIST + custom items, with overrides + hidden applied)
  const effectivePriceList = useMemo(
    () => buildEffectivePriceList(pricerSettings),
    [pricerSettings],
  );

  // Item picker — categories synced with /pricer page
  const categories = useMemo(
    () => buildEffectiveCategories(pricerSettings, effectivePriceList),
    [pricerSettings, effectivePriceList],
  );

  // Filtered price list
  const filteredPriceList = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    return effectivePriceList.filter(p => {
      if (activeCategory !== "all" && p.category !== activeCategory) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
    });
  }, [itemSearch, activeCategory, effectivePriceList]);

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
  const subtotalRaw = itemsWithCalc.reduce((s, i) => s + i.lineTotal, 0);
  const discountValue = discountType === "percent"
    ? Math.round((subtotalRaw * discountAmount) / 100)
    : Math.round(discountAmount);
  const subtotalBeforeVat = Math.max(0, subtotalRaw - discountValue);
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

    if (!customerName) { toast.error("חובה לבחור לקוח"); setSaving(false); return; }
    if (!title.trim()) { toast.error("חובה להזין כותרת להצעה"); setSaving(false); return; }
    if (items.length === 0) { toast.error("חובה להוסיף לפחות פריט אחד"); setSaving(false); return; }

    // Decide new status:
    // - If user clicked "save as draft" → draft
    // - If was draft and now saved → "sent" (promote to sent)
    // - If was sent/accepted/rejected → keep current status (just update content)
    const newStatus = asDraft
      ? "draft"
      : (originalStatus === "draft" ? "sent" : originalStatus);

    const { error } = await supabase.from("quotes").update({
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
      discount_amount: discountAmount,
      discount_type: discountType,
      deposit_percent: depositPercent,
      deposit_amount: Math.round((totalWithVat * depositPercent) / 100),
      status: newStatus,
      valid_until: validUntil || null,
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", quoteId).eq("user_id", user.id);

    setSaving(false);
    if (error) {
      toast.error(`שגיאה בשמירה: ${error.message}`);
      return;
    }
    setSuccessMode(asDraft ? "draft" : "saved");
    setTimeout(() => router.push(`/quote/${quoteId}`), 1800);
  }

  // Send WhatsApp
  function sendWhatsApp() {
    const phone = customerMode === "existing" ? selectedCustomer?.phone : newCustomerPhone;
    const customerName = customerMode === "existing" ? selectedCustomer?.name : newCustomerName;
    if (!phone) { toast.error("אין טלפון ללקוח"); return; }
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

  // Validation summary — used to gate the save CTA and to show the user
  // exactly what's missing instead of a generic "fill required fields".
  const effectiveCustomerName = customerMode === "existing"
    ? (selectedCustomer?.name ?? "")
    : newCustomerName.trim();
  const validation = {
    customer: !!effectiveCustomerName,
    title: !!title.trim(),
    items: items.length > 0,
  };
  const allValid = validation.customer && validation.title && validation.items;
  const missingItems: string[] = [];
  if (!validation.customer) missingItems.push("לקוח");
  if (!validation.title) missingItems.push("כותרת");
  if (!validation.items) missingItems.push("פריטים");

  const itemsInQuoteMap = new Map(items.map(i => [i.id, i.qty]));

  return (
    <div dir="rtl" className="min-h-screen bg-[#F7F8FA] print:bg-white">

      {/* ── Sticky header ── */}
      <header className="no-print sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">עריכת הצעה</h1>
            {quoteNumber && (
              <p className="text-[11px] text-gray-400 font-mono tabular-nums mt-0.5">#{quoteNumber}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => router.push(`/quote/${quoteId}`)}
              className="text-xs text-gray-500 hover:text-gray-800 font-medium px-2 py-1 rounded-lg transition-colors hidden sm:block"
            >
              ביטול
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="hidden sm:flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-2 rounded-xl border border-gray-200 transition-colors disabled:opacity-60"
            >
              💾 טיוטה
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 space-y-3 sm:space-y-4 pb-32 sm:pb-32">

        {/* ── Customer ── */}
        <section className="bg-white rounded-3xl border border-gray-100 p-4 sm:p-5 print:border-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900">לקוח</h2>
            {validation.customer && (
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 size={11} /> נבחר
              </span>
            )}
          </div>
          <div className="inline-flex w-full sm:w-auto bg-gray-100 rounded-xl p-0.5 mb-3 print:hidden">
            <button onClick={() => setCustomerMode("existing")}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                customerMode === "existing" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              לקוח קיים
            </button>
            <button onClick={() => { setCustomerMode("new"); setSelectedCustomer(null); }}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                customerMode === "new" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              לקוח חדש
            </button>
          </div>

          {customerMode === "existing" ? (
            <div className="space-y-2 print:hidden">
              {selectedCustomer ? (
                <div className="bg-emerald-50/60 rounded-xl border border-emerald-100 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
                      <CheckCircle2 size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{selectedCustomer.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {[selectedCustomer.address, selectedCustomer.phone].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); }}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-900 px-2 py-1 rounded-lg flex-shrink-0">
                    שנה
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      autoFocus
                      autoComplete="off"
                      inputMode="search"
                      value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                      placeholder={`חפש בין ${customers.length} לקוחות...`}
                      className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 pr-9 text-sm focus:outline-none focus:bg-white focus:border-gray-200 transition-colors"
                    />
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 max-h-56 overflow-y-auto">
                    {filteredCustomers.length === 0 ? (
                      <p className="px-4 py-3 text-center text-sm text-gray-400">לא נמצא לקוח</p>
                    ) : (
                      filteredCustomers.map(c => (
                        <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(""); }}
                          className="w-full text-right px-4 py-2.5 transition-colors border-b border-gray-50 last:border-0 hover:bg-gray-50">
                          <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                          {c.address && <p className="text-[11px] text-gray-400 mt-0.5">{c.address}</p>}
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
                autoComplete="name"
                className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:bg-white focus:border-gray-200 transition-colors" />
              <input value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} placeholder="טלפון"
                autoComplete="tel" inputMode="tel"
                className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-gray-200 transition-colors" />
              <input value={newCustomerAddress} onChange={e => setNewCustomerAddress(e.target.value)} placeholder="כתובת"
                autoComplete="street-address"
                className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-gray-200 transition-colors" />
            </div>
          )}
        </section>

        {/* ── Title + valid_until ── */}
        <section className="bg-white rounded-3xl border border-gray-100 p-4 sm:p-5 space-y-3 print:border-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">פרטי הצעה</h2>
            {validation.title && (
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 size={11} /> כותרת מולאה
              </span>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">כותרת *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              autoComplete="off"
              placeholder="לדוגמה: הקמת גינה — משפחת כהן"
              className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 text-base font-bold focus:outline-none focus:bg-white focus:border-gray-200 transition-colors" />
          </div>
          <div className="print:hidden">
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">תקף עד</label>
            <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} dir="ltr"
              className="w-full sm:w-48 bg-gray-50 border border-transparent rounded-xl px-3 py-2 text-sm focus:outline-none focus:bg-white focus:border-gray-200 transition-colors" />
          </div>
        </section>

        {/* ── Items as cards ── */}
        <section className="bg-white rounded-3xl border border-gray-100 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart size={15} className="text-gray-400" />
              פריטים {items.length > 0 && <span className="text-gray-400 font-medium">· {items.length}</span>}
            </h2>
            <button onClick={() => setPickerOpen(true)}
              className="flex items-center gap-1 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl print:hidden transition-colors">
              <Plus size={13} /> הוסף פריט
            </button>
          </div>

          {items.length === 0 ? (
            <button
              onClick={() => setPickerOpen(true)}
              className="w-full text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl hover:border-gray-300 hover:bg-gray-50 transition-colors print:hidden"
            >
              <ShoppingCart size={28} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">אין פריטים עדיין</p>
              <p className="text-xs text-gray-400 mt-1">לחץ כאן להוספה מהמחירון</p>
            </button>
          ) : (
            <div className="space-y-2">
              {itemsWithCalc.map((i, idx) => (
                <div key={i.id} className="group bg-white border border-gray-100 hover:border-gray-200 rounded-2xl p-3 sm:p-4 transition-colors">
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-xl bg-gray-50 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0 tabular-nums">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 leading-tight">{i.name}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        מחירון: <span className="tabular-nums">{fmt(i.basePrice)}</span> · {i.unit}
                      </p>
                    </div>
                    <button onClick={() => removeItem(i.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors print:hidden flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 print:hidden">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">כמות</label>
                      <input type="number" min={0} step={0.5} value={i.qty}
                        onChange={e => updateItem(i.id, { qty: parseFloat(e.target.value) || 0 })}
                        autoComplete="off" inputMode="decimal"
                        className="w-full bg-gray-50 border border-transparent rounded-lg px-2 py-1.5 text-center text-sm font-medium focus:outline-none focus:bg-white focus:border-gray-200 tabular-nums transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">מחיר ליח׳</label>
                      <input type="number" min={0} value={i.finalPrice}
                        onChange={e => updateItem(i.id, { customPrice: parseFloat(e.target.value) || 0 })}
                        autoComplete="off" inputMode="decimal"
                        className="w-full bg-gray-50 border border-transparent rounded-lg px-2 py-1.5 text-center text-sm font-medium focus:outline-none focus:bg-white focus:border-gray-200 tabular-nums transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">סה״כ</label>
                      <div className="bg-gray-900 text-white rounded-lg px-2 py-1.5 text-center text-sm font-black tabular-nums">
                        {fmt(i.lineTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Advanced settings ── */}
        {items.length > 0 && (
          <section className="bg-white rounded-3xl border border-gray-100 print:hidden">
            <button
              onClick={() => setAdvancedOpen(o => !o)}
              className="w-full px-4 sm:px-5 py-4 flex items-center justify-between gap-3 text-right"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles size={15} className="text-gray-400 flex-shrink-0" />
                <h2 className="text-sm font-bold text-gray-900">התאמות מתקדמות</h2>
                {!advancedOpen && (
                  <span className="text-[11px] text-gray-400 truncate">
                    תוספת רווח · הנחה · מקדמה
                  </span>
                )}
              </div>
              {advancedOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>

            {advancedOpen && (
              <div className="px-4 sm:px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-700">תוספת רווח על מחיר עלות</label>
                    <div className="flex items-center gap-1">
                      <input type="number" min={0} max={500} step={5} value={markup}
                        onChange={e => setMarkup(Math.max(0, Math.min(500, parseFloat(e.target.value) || 0)))}
                        autoComplete="off" inputMode="decimal"
                        className="w-14 bg-gray-50 border border-transparent rounded-lg px-2 py-1 text-center text-sm font-bold tabular-nums focus:outline-none focus:bg-white focus:border-gray-200 transition-colors" />
                      <span className="text-xs font-bold text-gray-500">%</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {[0, 25, 50, 100, 150, 200].map(v => (
                      <button key={v} onClick={() => setMarkup(v)}
                        className={`flex-1 text-xs py-1.5 rounded-lg font-bold transition-colors tabular-nums ${
                          markup === v ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                        }`}>
                        {v}%
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2 tabular-nums">
                    דוגמה: ₪10 → <span className="font-bold text-gray-700">{fmt(Math.round(10 * markupMultiplier))}</span> (לפני מע״מ)
                  </p>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-700">הנחה</label>
                    <div className="flex items-center gap-1.5">
                      <input type="number" min={0} step={1} value={discountAmount}
                        onChange={e => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                        autoComplete="off" inputMode="decimal"
                        className="w-20 bg-gray-50 border border-transparent rounded-lg px-2 py-1 text-sm text-center font-bold tabular-nums focus:outline-none focus:bg-white focus:border-gray-200 transition-colors" />
                      <div className="flex bg-gray-100 rounded-lg overflow-hidden p-0.5">
                        <button type="button" onClick={() => setDiscountType("amount")}
                          className={`px-2 py-0.5 text-xs font-bold rounded ${discountType === "amount" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>₪</button>
                        <button type="button" onClick={() => setDiscountType("percent")}
                          className={`px-2 py-0.5 text-xs font-bold rounded ${discountType === "percent" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>%</button>
                      </div>
                    </div>
                  </div>
                  {discountValue > 0 && (
                    <p className="text-[11px] text-rose-600 mt-1.5 font-medium">
                      − {fmt(discountValue)} {discountType === "percent" ? `(${discountAmount}% מהסכום)` : ""}
                    </p>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-700">מקדמה לאישור</label>
                    <div className="flex items-center gap-1">
                      <input type="number" min={0} max={100} step={5} value={depositPercent}
                        onChange={e => setDepositPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                        autoComplete="off" inputMode="decimal"
                        className="w-14 bg-gray-50 border border-transparent rounded-lg px-2 py-1 text-center text-sm font-bold tabular-nums focus:outline-none focus:bg-white focus:border-gray-200 transition-colors" />
                      <span className="text-xs font-bold text-gray-500">%</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {[0, 25, 50, 100].map(v => (
                      <button key={v} type="button" onClick={() => setDepositPercent(v)}
                        className={`flex-1 text-xs py-1.5 rounded-lg font-bold transition-colors ${
                          depositPercent === v ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                        }`}>
                        {v === 0 ? "ללא" : v === 100 ? "מלא" : `${v}%`}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2">
                    {depositPercent > 0
                      ? <>הלקוח ידרש לשלם <strong className="text-gray-800 tabular-nums">{fmt(Math.round(totalWithVat * depositPercent / 100))}</strong> ({depositPercent}%) לפני אישור</>
                      : "ללא מקדמה — הלקוח חותם בלי תשלום"}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Notes ── */}
        <section className="bg-white rounded-3xl border border-gray-100 print:border-0">
          <button
            onClick={() => setNotesOpen(o => !o)}
            className="w-full px-4 sm:px-5 py-4 flex items-center justify-between gap-3 text-right print:hidden"
          >
            <h2 className="text-sm font-bold text-gray-900">הערות {notes && <span className="text-emerald-600 text-[11px] font-medium">· מולאו</span>}</h2>
            {notesOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </button>
          {(notesOpen || notes) && (
            <div className="px-4 sm:px-5 pb-5 print:p-0">
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                autoComplete="off"
                placeholder="תנאי תשלום, תיאור עבודה, מועד התחלה..."
                className="w-full bg-gray-50 border border-transparent rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-gray-200 resize-none transition-colors" />
            </div>
          )}
        </section>

        {/* ── Live totals card ── */}
        {items.length > 0 && (
          <section className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-6 print:border-0">
            <h2 className="text-sm font-bold text-gray-900 mb-3">סיכום</h2>
            <div className="space-y-2">
              {discountValue > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">סכום פריטים</span>
                  <span className="text-gray-700 tabular-nums">{fmt(subtotalRaw)}</span>
                </div>
              )}
              {discountValue > 0 && (
                <div className="flex justify-between text-sm text-rose-600 font-semibold">
                  <span>הנחה</span>
                  <span className="tabular-nums">−{fmt(discountValue)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">לפני מע״מ</span>
                <span className="text-gray-700 tabular-nums">{fmt(subtotalBeforeVat)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">מע״מ (18%)</span>
                <span className="text-gray-700 tabular-nums">{fmt(vatAmount)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-1 flex justify-between items-baseline">
                <span className="text-sm font-semibold text-gray-600">סה״כ לתשלום</span>
                <span className="text-3xl font-black text-gray-900 tabular-nums">{fmt(totalWithVat)}</span>
              </div>
              {depositPercent > 0 && (
                <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
                  <span className="text-xs text-emerald-700 font-semibold">💰 מקדמה לאישור</span>
                  <span className="text-base font-black text-emerald-700 tabular-nums">{fmt(Math.round(totalWithVat * depositPercent / 100))}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Validation hints ── */}
        {!allValid && items.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-center gap-3 print:hidden">
            <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-800 font-medium">
              חסר {missingItems.join(" + ")} כדי לשמור
            </p>
          </div>
        )}
      </div>

      {/* ── Sticky bottom action bar ── */}
      <div className="no-print fixed bottom-0 right-0 left-0 z-20 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.08)]">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-gray-400 leading-tight">סה״כ {items.length} פריטים</p>
            <p className="text-lg font-black text-gray-900 tabular-nums leading-tight">{fmt(totalWithVat)}</p>
          </div>
          <button
            onClick={sendWhatsApp}
            disabled={items.length === 0}
            title="שלח ב-WhatsApp"
            className="hidden sm:flex w-11 h-11 items-center justify-center rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-40 transition-colors"
          >
            <MessageSquare size={16} />
          </button>
          <button
            onClick={handlePrint}
            disabled={items.length === 0}
            title="הדפס"
            className="hidden sm:flex w-11 h-11 items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-40 transition-colors"
          >
            <Printer size={16} />
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            title="שמור כטיוטה"
            className="sm:hidden w-11 h-11 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-40 transition-colors text-xs font-bold"
          >
            טיוטה
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving || !allValid}
            title={!allValid ? `חסר: ${missingItems.join(", ")}` : "שמור שינויים"}
            className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-black rounded-xl px-5 sm:px-6 h-11 text-sm transition-colors"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{saving ? "שומר..." : "שמור"}</span>
          </button>
        </div>
      </div>

      {/* ── Item picker — multi-add with already-in-quote badges ── */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && setPickerOpen(false)}>
          <div className="bg-white w-full sm:max-w-lg sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh]" dir="rtl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">הוסף פריט</h3>
                {items.length > 0 && <p className="text-[11px] text-gray-400 mt-0.5">{items.length} כבר בהצעה</p>}
              </div>
              <button onClick={() => setPickerOpen(false)} className="hit-44 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                <X size={16} className="text-gray-500" />
              </button>
            </div>
            <div className="px-5 py-3 border-b border-gray-100 space-y-2">
              <div className="relative">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="חפש פריט..."
                  autoFocus
                  autoComplete="off" inputMode="search"
                  className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2 pr-9 text-sm focus:outline-none focus:bg-white focus:border-gray-200 transition-colors" />
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {categories.map(c => (
                  <button key={c.key} onClick={() => setActiveCategory(c.key)}
                    className={`text-xs px-3 py-1.5 rounded-xl whitespace-nowrap font-semibold transition-colors ${
                      activeCategory === c.key ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}>
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
                  const inQuote = itemsInQuoteMap.get(p.id);
                  return (
                    <button key={p.id} onClick={() => addItem(p)}
                      className={`w-full text-right px-5 py-3 border-b border-gray-50 flex items-center justify-between gap-2 transition-colors ${
                        inQuote ? "bg-emerald-50/40 hover:bg-emerald-50/70" : "hover:bg-gray-50"
                      }`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                          {inQuote && (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full tabular-nums flex-shrink-0">
                              ✓ {inQuote} בהצעה
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5 tabular-nums">₪{p.price} / {p.unit} · {catLabel}</p>
                      </div>
                      <div className={`w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 transition-colors ${
                        inQuote ? "bg-emerald-100 text-emerald-700" : "bg-gray-900 text-white group-hover:bg-gray-800"
                      }`}>
                        <Plus size={16} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-100">
              <button onClick={() => setPickerOpen(false)} className="w-full py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold transition-colors">
                סיום · {items.length} פריטים
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success overlay */}
      {successMode && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center" dir="rtl" role="dialog" aria-modal="true">
          <div className="bg-white rounded-3xl shadow-2xl mx-4 px-8 py-10 max-w-sm w-full text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="relative w-24 h-24 mx-auto mb-5">
              <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-50"></div>
              <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
                <svg className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">
              {successMode === "draft" ? "טיוטה נשמרה!" : "ההצעה עודכנה!"}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {successMode === "draft" ? "השינויים נשמרו כטיוטה." : "ההצעה המעודכנת מוכנה."}
            </p>
            <div className="bg-gray-50 rounded-2xl p-3">
              <p className="text-xs text-gray-500">חוזר לתצוגת ההצעה...</p>
              <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ animation: "progressBar 1.8s linear forwards", width: "0%" }}></div>
              </div>
            </div>
          </div>
          <style jsx global>{`
            @keyframes progressBar {
              from { width: 0%; }
              to { width: 100%; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
