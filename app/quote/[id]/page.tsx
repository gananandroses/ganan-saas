"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Loader2, ChevronRight, Printer, MessageSquare, CheckCircle2, XCircle, Trash2, Edit3, Phone, MapPin, Copy, Eye, FileBox, X, MoreHorizontal, AlertTriangle, KeyRound, Share2, Clock,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast, confirmDialog } from "@/components/Toaster";

interface QuoteItemDB {
  id: string;
  name: string;
  unit: string;
  basePrice: number;
  qty: number;
  customPrice?: number;
  description?: string;
  category?: string;
}

interface QuoteData {
  id: string;
  title: string;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  customer_id: string | null;
  items: QuoteItemDB[];
  markup_percent: number;
  subtotal_before_vat: number;
  vat_amount: number;
  total_with_vat: number;
  status: "draft" | "sent" | "accepted" | "rejected";
  valid_until: string | null;
  notes: string | null;
  created_at: string;
  quote_number: string | null;
  public_token: string | null;
  view_count: number | null;
  viewed_at: string | null;
  signed_at: string | null;
  signed_by_name: string | null;
  project_id: string | null;
  user_id: string;
  discount_amount: number | null;
  discount_type: "amount" | "percent" | null;
  pin_code: string | null;
  pin_attempts: number | null;
  pin_locked_until: string | null;
  deposit_percent: number | null;
  deposit_amount: number | null;
  payment_status: "unpaid" | "pending_verification" | "deposit_paid" | "fully_paid" | null;
  payment_method: string | null;
  payment_marked_at: string | null;
  payment_verified_at: string | null;
  payment_reference: string | null;
  payment_proof_url: string | null;
}

interface PaymentSettings {
  bitPhone: string;
  payboxPhone: string;
  bankName: string;
  bankBranch: string;
  bankAccount: string;
  businessName: string;
  ownerName: string;
  phone: string;
  city: string;
  logoUrl: string;
  quoteTitleLabel: string;
  quoteIntroText: string;
  quoteDefaultFooter: string;
}

const STATUS_CONFIG: Record<QuoteData["status"], { label: string; bg: string; text: string; dot: string }> = {
  draft:    { label: "טיוטה",        bg: "bg-purple-50",  text: "text-purple-700",  dot: "bg-purple-400" },
  sent:     { label: "נשלחה ללקוח",  bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-400" },
  accepted: { label: "אושרה",        bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  rejected: { label: "נדחתה",        bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-400" },
};

function fmt(n: number) {
  return `₪${Math.round(n).toLocaleString("he-IL")}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function QuoteViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [settings, setSettings] = useState<PaymentSettings>({
    bitPhone: "", payboxPhone: "", bankName: "", bankBranch: "", bankAccount: "",
    businessName: "", ownerName: "", phone: "", city: "", logoUrl: "",
    quoteTitleLabel: "הצעת מחיר", quoteIntroText: "",
    quoteDefaultFooter: "ההצעה תקפה למשך 30 ימים מהיום. חתימה על ההצעה מהווה אישור לביצוע העבודה.",
  });
  const [updating, setUpdating] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Close overflow menu on any outside click
  useEffect(() => {
    if (!menuOpen) return;
    function onClick() { setMenuOpen(false); }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [quoteRes, profileRes] = await Promise.all([
        supabase.from("quotes").select("*").eq("id", id).eq("user_id", user.id).single(),
        supabase.from("user_profile").select("business_name, owner_name, phone, city, bit_phone, paybox_phone, bank_name, bank_branch, bank_account, business_logo_url, quote_title_label, quote_intro_text, quote_default_footer").eq("user_id", user.id).single(),
      ]);

      if (quoteRes.data) setQuote(quoteRes.data as QuoteData);
      if (profileRes.data) {
        setSettings({
          businessName: profileRes.data.business_name ?? "",
          ownerName: profileRes.data.owner_name ?? "",
          phone: profileRes.data.phone ?? "",
          city: profileRes.data.city ?? "",
          bitPhone: profileRes.data.bit_phone ?? "",
          payboxPhone: profileRes.data.paybox_phone ?? "",
          bankName: profileRes.data.bank_name ?? "",
          bankBranch: profileRes.data.bank_branch ?? "",
          bankAccount: profileRes.data.bank_account ?? "",
          logoUrl: profileRes.data.business_logo_url ?? "",
          quoteTitleLabel: profileRes.data.quote_title_label ?? "הצעת מחיר",
          quoteIntroText: profileRes.data.quote_intro_text ?? "",
          quoteDefaultFooter: profileRes.data.quote_default_footer ?? "ההצעה תקפה למשך 30 ימים מהיום. חתימה על ההצעה מהווה אישור לביצוע העבודה.",
        });
      }
      setLoading(false);
    })();
  }, [id]);

  async function updateStatus(status: QuoteData["status"]) {
    if (!quote) return;
    setUpdating(true);

    // If accepting → automatically create a project
    if (status === "accepted" && !quote.project_id) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        // Convert quote items to project materials
        const materials = quote.items.map(i => ({
          name: i.name,
          qty: i.qty,
          unit: i.unit,
          price: i.customPrice !== undefined ? i.customPrice : Math.round(i.basePrice * (1 + quote.markup_percent / 100)),
          vatIncluded: false,
        }));
        const totalCost = materials.reduce((s, m) => s + m.qty * m.price, 0);

        const { data: project } = await supabase.from("projects").insert({
          user_id: user.id,
          name: quote.title,
          customer_id: quote.customer_id,
          customer_name: quote.customer_name,
          description: `נוצר מהצעת מחיר ${quote.quote_number || "#" + quote.id.slice(0, 8)}`,
          start_date: new Date().toISOString().split("T")[0],
          budget: quote.total_with_vat,
          spent: totalCost,
          status: "planning",
          materials,
          tasks: [],
          labor_hours: 0,
          hourly_rate: 0,
          vat_included: true,
          progress: 0,
        }).select().single();

        // Link the quote to the new project
        if (project) {
          await supabase.from("quotes").update({
            status,
            project_id: project.id,
          }).eq("id", quote.id);
          setQuote({ ...quote, status, project_id: project.id });
          setUpdating(false);
          toast.success("ההצעה אושרה!", `נוצר אוטומטית פרויקט חדש: "${quote.title}"`);
          return;
        }
      }
    }

    await supabase.from("quotes").update({ status }).eq("id", quote.id);
    setQuote({ ...quote, status });
    setUpdating(false);
  }

  async function handleDelete() {
    if (!quote) return;
    if (!await confirmDialog({ title: `למחוק את ההצעה "${quote.title}"?`, confirmLabel: "מחק", destructive: true })) return;
    await supabase.from("quotes").delete().eq("id", quote.id);
    router.push("/quote");
  }

  async function handleDuplicate() {
    if (!quote) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Generate new quote number + token
    const currentYear = new Date().getFullYear();
    const { data: lastQuotes } = await supabase
      .from("quotes")
      .select("quote_seq")
      .eq("user_id", user.id)
      .eq("quote_year", currentYear)
      .order("quote_seq", { ascending: false })
      .limit(1);
    const nextSeq = ((lastQuotes && lastQuotes[0]?.quote_seq) || 0) + 1;
    const quoteNumber = `${currentYear}-${String(nextSeq).padStart(3, "0")}`;
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    const publicToken = Array.from(arr).map(b => b.toString(36).padStart(2, "0")).join("").slice(0, 22);
    const pinCode = String(Math.floor(1000 + Math.random() * 9000));

    const { data: dupe } = await supabase.from("quotes").insert({
      user_id: user.id,
      customer_id: quote.customer_id,
      customer_name: quote.customer_name,
      customer_phone: quote.customer_phone,
      customer_address: quote.customer_address,
      title: `${quote.title} (העתק)`,
      items: quote.items,
      markup_percent: quote.markup_percent,
      subtotal_before_vat: quote.subtotal_before_vat,
      vat_amount: quote.vat_amount,
      total_with_vat: quote.total_with_vat,
      status: "draft",
      valid_until: quote.valid_until,
      notes: quote.notes,
      quote_number: quoteNumber,
      quote_year: currentYear,
      quote_seq: nextSeq,
      public_token: publicToken,
      pin_code: pinCode,
    }).select().single();

    if (dupe) {
      router.push(`/quote/${dupe.id}/edit`);
    }
  }

  // Backwards-compat shim — old call sites used a local showToast() that
  // mounted a one-line bar at the bottom of the page. They all show
  // "✅ ..." messages, so route them through the global toast.success.
  function showToast(message: string) {
    toast.success(message.replace(/^✅\s*/, ""));
  }

  async function copyPublicLink() {
    if (!quote || !quote.public_token) return;
    setShowShareModal(true);
  }

  async function copyLinkOnly() {
    if (!quote?.public_token) return;
    const url = `${window.location.origin}/q/${quote.public_token}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast("✅ הקישור הועתק");
    } catch {
      prompt("העתק את הקישור:", url);
    }
  }

  async function copyPin() {
    if (!quote?.pin_code) return;
    try {
      await navigator.clipboard.writeText(quote.pin_code);
      showToast(`✅ הקוד הועתק: ${quote.pin_code}`);
    } catch {
      prompt("העתק את הקוד:", quote.pin_code);
    }
  }

  async function verifyPayment() {
    if (!quote) return;
    if (!await confirmDialog({ title: "מאשר שקיבלת את התשלום בבנק שלך?", description: "ההצעה תאושר ופרויקט ייווצר אוטומטית.", confirmLabel: "אישור" })) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1) Mark payment verified + quote accepted
    await supabase.from("quotes").update({
      payment_status: "deposit_paid",
      payment_verified_at: new Date().toISOString(),
      status: "accepted",
    }).eq("id", quote.id);

    // 2) Auto-create project (if not already)
    if (!quote.project_id) {
      const materials = quote.items.map(i => ({
        name: i.name,
        qty: i.qty,
        unit: i.unit,
        price: i.customPrice !== undefined ? i.customPrice : Math.round(i.basePrice * (1 + quote.markup_percent / 100)),
        vatIncluded: false,
      }));
      const totalCost = materials.reduce((s, m) => s + m.qty * m.price, 0);
      const { data: project } = await supabase.from("projects").insert({
        user_id: user.id,
        name: quote.title,
        customer_id: quote.customer_id,
        customer_name: quote.customer_name,
        description: `נוצר אוטומטית מהצעה אושרה ${quote.quote_number ? `#${quote.quote_number}` : ""}`,
        start_date: new Date().toISOString().split("T")[0],
        budget: quote.total_with_vat,
        spent: totalCost,
        status: "planning",
        materials,
        tasks: [],
        labor_hours: 0,
        hourly_rate: 0,
        vat_included: true,
        progress: 0,
      }).select().single();
      if (project) {
        await supabase.from("quotes").update({ project_id: project.id }).eq("id", quote.id);
      }
    }

    setQuote({
      ...quote,
      payment_status: "deposit_paid",
      payment_verified_at: new Date().toISOString(),
      status: "accepted",
    });
    showToast("✅ התשלום אומת! ההצעה אושרה ופרויקט נוצר");
  }

  async function copyBothLinkAndPin() {
    if (!quote?.public_token || !quote.pin_code) return;
    const url = `${window.location.origin}/q/${quote.public_token}`;
    const text = `הצעת מחיר${quote.quote_number ? ` #${quote.quote_number}` : ""}:\n${url}\n\nקוד אישור: ${quote.pin_code}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast("✅ הכל הועתק (קישור + קוד)");
    } catch {
      prompt("העתק:", text);
    }
  }

  function sendPinViaWhatsApp() {
    if (!quote || !quote.customer_phone || !quote.pin_code) return;
    const cleaned = quote.customer_phone.replace(/\D/g, "");
    let intl = cleaned;
    if (cleaned.startsWith("0")) intl = "972" + cleaned.slice(1);
    else if (cleaned.startsWith("972")) intl = cleaned;
    const msg = `הקוד לאישור הצעת המחיר ${quote.quote_number ? `#${quote.quote_number} ` : ""}: ${quote.pin_code}\n\nהזן אותו בעמוד ההצעה כדי לחתום ולאשר.`;
    window.open(`https://api.whatsapp.com/send?phone=${intl}&text=${encodeURIComponent(msg)}`, "_blank");
  }

  async function regeneratePin() {
    if (!quote) return;
    if (!await confirmDialog({ title: "ייצר קוד חדש?", description: "הקוד הנוכחי יבוטל.", confirmLabel: "ייצר חדש" })) return;
    const newPin = String(Math.floor(1000 + Math.random() * 9000));
    await supabase.from("quotes").update({
      pin_code: newPin,
      pin_attempts: 0,
      pin_locked_until: null,
    }).eq("id", quote.id);
    setQuote({ ...quote, pin_code: newPin, pin_attempts: 0, pin_locked_until: null });
  }

  function handlePrint() { window.print(); }

  function sendWhatsApp() {
    if (!quote || !quote.customer_phone) { toast.error("אין טלפון ללקוח"); return; }
    const cleaned = quote.customer_phone.replace(/\D/g, "");
    let intl = cleaned;
    if (cleaned.startsWith("0")) intl = "972" + cleaned.slice(1);
    else if (cleaned.startsWith("972")) intl = cleaned;

    // Use public link if available — much cleaner than full text
    const publicUrl = quote.public_token ? `${window.location.origin}/q/${quote.public_token}` : null;

    let msg: string;
    if (publicUrl) {
      msg = `שלום ${quote.customer_name},\n\nמצורפת הצעת מחיר עבור "${quote.title}" 🌿\n\n`;
      msg += `📄 צפייה ואישור:\n${publicUrl}\n\n`;
      msg += `סה"כ: ${fmt(quote.total_with_vat)} (כולל מע"מ)`;
      if (quote.valid_until) msg += `\nתוקף: ${formatDate(quote.valid_until)}`;
      if (settings.businessName) msg += `\n\n${settings.businessName}`;
    } else {
      // Fallback for old quotes without token
      msg = `שלום ${quote.customer_name},\n\nמצורפת הצעת מחיר עבור "${quote.title}":\n\n`;
      quote.items.forEach((i: QuoteItemDB) => {
        const finalPrice = i.customPrice !== undefined ? i.customPrice : Math.round(i.basePrice * (1 + quote.markup_percent / 100));
        msg += `• ${i.name}: ${i.qty} ${i.unit} × ${fmt(finalPrice)} = ${fmt(finalPrice * i.qty)}\n`;
      });
      msg += `\nסה"כ לתשלום: ${fmt(quote.total_with_vat)}`;
      if (settings.businessName) msg += `\n\n${settings.businessName}`;
    }

    window.open(`https://api.whatsapp.com/send?phone=${intl}&text=${encodeURIComponent(msg)}`, "_blank");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Loader2 size={28} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <p className="text-gray-500 mb-3">הצעת המחיר לא נמצאה</p>
        <button onClick={() => router.push("/quote")} className="text-green-600 font-semibold">חזרה לרשימה</button>
      </div>
    );
  }

  const status = STATUS_CONFIG[quote.status];

  // Calculate items with effective prices
  const itemsWithCalc = quote.items.map(i => {
    const finalPrice = i.customPrice !== undefined ? i.customPrice : Math.round(i.basePrice * (1 + quote.markup_percent / 100));
    return { ...i, finalPrice, lineTotal: finalPrice * i.qty };
  });

  const subRaw = itemsWithCalc.reduce((s, i) => s + i.lineTotal, 0);
  const discountValue = quote.discount_amount && quote.discount_amount > 0
    ? (quote.discount_type === "percent"
        ? Math.round((subRaw * (quote.discount_amount || 0)) / 100)
        : Math.round(quote.discount_amount || 0))
    : 0;

  const isLocked = !!(quote.pin_locked_until && new Date(quote.pin_locked_until) > new Date() && !quote.signed_at);
  const showActivity = !!(quote.view_count || quote.signed_at || quote.project_id);
  const hasDeposit = (quote.deposit_amount ?? 0) > 0;
  const showPinPanel = quote.pin_code && !quote.signed_at;

  return (
    <div dir="rtl" className="min-h-screen bg-[#F7F8FA] print:bg-white">
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 1.5cm; }
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>

      {/* ── Sticky toolbar — clean, 1 primary action + ⋯ menu ── */}
      <header className="no-print sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => router.push("/quote")}
              className="hit-44 w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0">
              <ChevronRight size={18} />
            </button>
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${status.bg} ${status.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
            {quote.quote_number && (
              <span className="hidden sm:inline text-[11px] font-mono font-bold text-gray-400 tabular-nums">#{quote.quote_number}</span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {quote.public_token && (
              <button onClick={copyPublicLink}
                className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-2 rounded-xl border border-gray-200 transition-colors"
                title="שתף עם הלקוח"
              >
                <Share2 size={13} /> <span className="hidden sm:inline">שתף</span>
              </button>
            )}
            <button onClick={() => router.push(`/quote/${quote.id}/edit`)}
              className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
            >
              <Edit3 size={13} /> ערוך
            </button>
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o); }}
                className="hit-44 w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
                title="עוד"
              >
                <MoreHorizontal size={16} />
              </button>
              {menuOpen && (
                <div onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10"
                >
                  {quote.customer_phone && (
                    <button onClick={() => { setMenuOpen(false); sendWhatsApp(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 text-right">
                      <MessageSquare size={13} /> שלח ב-WhatsApp
                    </button>
                  )}
                  <button onClick={() => { setMenuOpen(false); handleDuplicate(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 text-right">
                    <Copy size={13} /> שכפל
                  </button>
                  <button onClick={() => { setMenuOpen(false); handlePrint(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 text-right">
                    <Printer size={13} /> הדפס / PDF
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button onClick={() => { setMenuOpen(false); handleDelete(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 text-right">
                    <Trash2 size={13} /> מחק הצעה
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 sm:py-5 space-y-3 pb-12">

        {/* ── Status decision prompt — only when sent and waiting for response ── */}
        {quote.status === "sent" && !quote.signed_at && (
          <div className="no-print bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Clock size={15} className="text-blue-500" />
              </div>
              <p className="text-sm font-semibold text-gray-700">ממתין לתשובת הלקוח</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => updateStatus("accepted")} disabled={updating}
                className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-100 transition-colors">
                <CheckCircle2 size={13} /> אושר
              </button>
              <button onClick={() => updateStatus("rejected")} disabled={updating}
                className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-red-100 transition-colors">
                <XCircle size={13} /> נדחה
              </button>
            </div>
          </div>
        )}

        {/* ── PIN locked warning — top of stack so it's seen ── */}
        {isLocked && (
          <div className="no-print bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-red-700">הקוד ננעל</p>
              <p className="text-xs text-red-600 mt-1">
                ננעל אחרי 3 ניסיונות שגויים. נסה שוב לאחר {new Date(quote.pin_locked_until!).toLocaleTimeString("he-IL")}, או צור קוד חדש.
              </p>
              <button onClick={regeneratePin}
                className="mt-2 text-xs font-bold text-red-700 hover:text-red-900 underline">
                צור קוד חדש →
              </button>
            </div>
          </div>
        )}

        {/* ── PIN panel — quiet card, not amber gradient ── */}
        {showPinPanel && (
          <div className="no-print bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <KeyRound size={14} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">קוד אישור</p>
                  <p className="text-[11px] text-gray-400">שלח ללקוח בנפרד מהקישור</p>
                </div>
              </div>
              {(quote.pin_attempts ?? 0) > 0 && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
                  {quote.pin_attempts} ניסיונות
                </span>
              )}
            </div>
            <div className="px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                {quote.pin_code!.split("").map((digit, idx) => (
                  <div key={idx} className="w-10 h-12 sm:w-11 sm:h-13 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center">
                    <span className="text-xl sm:text-2xl font-black text-gray-900 tabular-nums">{digit}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                {quote.customer_phone && (
                  <button onClick={sendPinViaWhatsApp}
                    title="שלח קוד ב-WhatsApp"
                    className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
                    <MessageSquare size={13} /> שלח
                  </button>
                )}
                <button onClick={copyPin}
                  title="העתק קוד"
                  className="flex items-center gap-1 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-2 rounded-xl border border-gray-200 transition-colors">
                  <Copy size={13} /> העתק
                </button>
                <button onClick={regeneratePin}
                  title="צור קוד חדש"
                  className="hit-44 w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 transition-colors">
                  🔄
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Payment / deposit panel ── */}
        {hasDeposit && (
          <div className="no-print bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 text-base">💰</div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 leading-tight">
                    מקדמה <span className="text-gray-400 font-medium">· {quote.deposit_percent || 50}%</span>
                  </p>
                  <p className="text-base font-black text-gray-900 tabular-nums">{fmt(quote.deposit_amount || 0)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {quote.payment_status === "unpaid" && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-100">
                    <Clock size={11} /> ממתין לתשלום
                  </span>
                )}
                {quote.payment_status === "pending_verification" && (
                  <>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                      🔔 הלקוח סימן ששילם
                    </span>
                    <button onClick={verifyPayment}
                      className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors">
                      <CheckCircle2 size={12} /> אמת
                    </button>
                  </>
                )}
                {quote.payment_status === "deposit_paid" && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <CheckCircle2 size={11} /> מקדמה שולמה
                  </span>
                )}
                {quote.payment_status === "fully_paid" && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    <CheckCircle2 size={11} /> שולם במלואו
                  </span>
                )}
              </div>
            </div>

            {quote.payment_method && quote.payment_marked_at && (
              <div className="px-4 py-3 text-[11px] text-gray-500 leading-relaxed">
                שיטה: {quote.payment_method === "bit" ? "💸 Bit" : quote.payment_method === "paybox" ? "📱 PayBox" : quote.payment_method === "bank" ? "🏦 העברה בנקאית" : quote.payment_method === "meshulam" ? "💳 משולם" : quote.payment_method}
                <span className="text-gray-400"> · סומן {formatDate(quote.payment_marked_at)}</span>
                {quote.payment_verified_at && <span className="text-gray-400"> · אומת {formatDate(quote.payment_verified_at)}</span>}
              </div>
            )}

            {(quote.payment_reference || quote.payment_proof_url) && quote.payment_status === "pending_verification" && (
              <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">הוכחת תשלום</p>
                {quote.payment_reference && (
                  <div className="bg-gray-50 rounded-xl px-3 py-2">
                    <p className="text-[10px] text-gray-400 uppercase">אסמכתא</p>
                    <p className="font-mono font-bold text-gray-900 text-sm tabular-nums">{quote.payment_reference}</p>
                  </div>
                )}
                {quote.payment_proof_url && (
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase mb-1">צילום מסך</p>
                    <a href={quote.payment_proof_url} target="_blank" rel="noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={quote.payment_proof_url} alt="הוכחת תשלום" className="w-full max-h-64 object-contain rounded-xl border border-gray-200 bg-gray-50 cursor-pointer hover:opacity-90 transition-opacity" />
                    </a>
                  </div>
                )}
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  ⓘ ודא בבנק/Bit שלך שהתשלום נכנס ואז לחץ <strong>אמת</strong>. עם האימות — ההצעה תאושר ויווצר פרויקט.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Activity strip — subtle, single row ── */}
        {showActivity && (
          <div className="no-print bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-4 text-xs text-gray-600 flex-wrap">
            {(quote.view_count || 0) > 0 && (
              <span className="flex items-center gap-1.5 font-medium">
                <Eye size={12} className="text-gray-400" />
                <span>נצפה <span className="font-bold tabular-nums">{quote.view_count}</span> פעמים</span>
              </span>
            )}
            {quote.signed_at && (
              <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                <CheckCircle2 size={12} />
                נחתם ע״י {quote.signed_by_name} · {formatDate(quote.signed_at)}
              </span>
            )}
            {quote.project_id && (
              <button onClick={() => router.push("/projects")}
                className="flex items-center gap-1.5 text-gray-700 hover:text-gray-900 font-semibold mr-auto">
                <FileBox size={12} className="text-gray-400" />
                נוצר פרויקט מההצעה →
              </button>
            )}
          </div>
        )}

        {/* ── The quote document — same restraint as /q/[token] ── */}
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden print:rounded-none print:border-0 print:shadow-none">

          {/* Hero — quiet emerald-to-white gradient */}
          <div className="relative bg-gradient-to-bl from-emerald-50 via-white to-white px-6 sm:px-8 pt-7 pb-6 border-b border-gray-100 print:bg-white">
            <div className="flex items-start gap-4">
              {settings.logoUrl ? (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white p-2 flex items-center justify-center border border-gray-100 shadow-sm flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={settings.logoUrl} alt="לוגו" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
                  🌿
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-700 font-bold">
                  {settings.quoteTitleLabel || "הצעת מחיר"}
                </p>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5 leading-tight">
                  {settings.businessName || "העסק שלי"}
                </h1>
                {settings.ownerName && (
                  <p className="text-sm text-gray-500 mt-0.5">{settings.ownerName}</p>
                )}
              </div>
            </div>
            <div className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">פרויקט</p>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 mt-1 leading-snug">{quote.title}</h2>
              </div>
              <div className="text-left">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">מספר</p>
                <p className="text-sm font-mono font-black text-gray-700 tabular-nums">
                  {quote.quote_number ? `#${quote.quote_number}` : `#${quote.id.slice(0, 8).toUpperCase()}`}
                </p>
                <p className="text-[11px] text-gray-400 mt-1 tabular-nums">{formatDate(quote.created_at)}</p>
                {quote.valid_until && <p className="text-[11px] text-gray-400 tabular-nums">תקף עד {formatDate(quote.valid_until)}</p>}
              </div>
            </div>
          </div>

          {/* Customer / business contact strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-gray-100">
            <div className="p-5 sm:p-6">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">עבור</p>
              <p className="text-base font-bold text-gray-900 mt-1">{quote.customer_name}</p>
              {quote.customer_phone && (
                <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1.5"><Phone size={11} /> <span dir="ltr">{quote.customer_phone}</span></p>
              )}
              {quote.customer_address && (
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5"><MapPin size={11} /> {quote.customer_address}</p>
              )}
            </div>
            <div className="p-5 sm:p-6 sm:text-left">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">מאת</p>
              <p className="text-base font-bold text-gray-900 mt-1">{settings.businessName || "העסק שלי"}</p>
              {settings.phone && (
                <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1.5 sm:justify-end"><Phone size={11} /> <span dir="ltr">{settings.phone}</span></p>
              )}
              {settings.city && (
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 sm:justify-end"><MapPin size={11} /> {settings.city}</p>
              )}
            </div>
          </div>

          {/* Intro */}
          {settings.quoteIntroText && (
            <div className="px-6 sm:px-8 py-4 border-t border-gray-100 bg-gray-50/60">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{settings.quoteIntroText}</p>
            </div>
          )}

          {/* Items as cards */}
          <div className="px-5 sm:px-8 py-6 border-t border-gray-100">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-3">פריטים</p>
            <div className="space-y-2">
              {itemsWithCalc.map((i, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 sm:p-4 rounded-2xl border border-gray-100 bg-white">
                  <span className="w-7 h-7 rounded-xl bg-gray-50 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0 tabular-nums">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 leading-tight">{i.name}</p>
                    {i.description && (
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">{i.description}</p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1.5 tabular-nums">
                      {i.qty} × {fmt(i.finalPrice)}
                      {i.unit && <span className="text-gray-400"> · {i.unit}</span>}
                    </p>
                  </div>
                  <div className="text-left flex-shrink-0">
                    <p className="text-base font-black text-gray-900 tabular-nums">{fmt(i.lineTotal)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="px-5 sm:px-8 pb-6">
            <div className="bg-gray-50 rounded-2xl p-5 space-y-2.5">
              {discountValue > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">סכום פריטים</span>
                    <span className="text-gray-700 tabular-nums">{fmt(subRaw)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-rose-600 font-semibold">
                    <span>הנחה {quote.discount_type === "percent" ? `(${quote.discount_amount}%)` : ""}</span>
                    <span className="tabular-nums">−{fmt(discountValue)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">לפני מע״מ</span>
                <span className="text-gray-700 tabular-nums">{fmt(quote.subtotal_before_vat)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">מע״מ (18%)</span>
                <span className="text-gray-700 tabular-nums">{fmt(quote.vat_amount)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 mt-1 flex justify-between items-baseline">
                <span className="text-sm font-semibold text-gray-600">סה״כ לתשלום</span>
                <span className="text-3xl sm:text-4xl font-black text-gray-900 tabular-nums">{fmt(quote.total_with_vat)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="px-6 sm:px-8 py-5 border-t border-gray-100 bg-amber-50/40">
              <p className="text-[10px] uppercase tracking-widest text-amber-700 font-bold mb-2">הערות</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{quote.notes}</p>
            </div>
          )}

          {/* Payment methods */}
          {(settings.bitPhone || settings.payboxPhone || settings.bankName) && (
            <div className="px-6 sm:px-8 py-5 border-t border-gray-100">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">אמצעי תשלום</p>
              <div className="flex flex-wrap gap-2">
                {settings.bitPhone && (
                  <span className="inline-flex items-center gap-1.5 bg-gray-50 text-gray-700 text-xs px-3 py-1.5 rounded-xl border border-gray-100">
                    💳 Bit · <span dir="ltr" className="font-mono">{settings.bitPhone}</span>
                  </span>
                )}
                {settings.payboxPhone && (
                  <span className="inline-flex items-center gap-1.5 bg-gray-50 text-gray-700 text-xs px-3 py-1.5 rounded-xl border border-gray-100">
                    📱 PayBox · <span dir="ltr" className="font-mono">{settings.payboxPhone}</span>
                  </span>
                )}
                {(settings.bankName || settings.bankAccount) && (
                  <span className="inline-flex items-center gap-1.5 bg-gray-50 text-gray-700 text-xs px-3 py-1.5 rounded-xl border border-gray-100">
                    🏦 {settings.bankName}
                    {settings.bankBranch ? ` · סניף ${settings.bankBranch}` : ""}
                    {settings.bankAccount ? ` · חשבון ${settings.bankAccount}` : ""}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 sm:px-8 py-5 border-t border-gray-100 text-center">
            <p className="text-[11px] text-gray-500 mb-2 whitespace-pre-wrap leading-relaxed">
              {settings.quoteDefaultFooter || `ההצעה תקפה ${quote.valid_until ? `עד ${formatDate(quote.valid_until)}` : "ל-30 ימים מהיום"}. חתימה על ההצעה מהווה אישור לביצוע העבודה.`}
            </p>
            {settings.businessName && (
              <p className="text-xs font-bold text-gray-700">{settings.businessName}</p>
            )}
            <p className="text-[10px] text-gray-400 mt-1">המחירים כוללים מע״מ · המסמך הופק במערכת mygananpro</p>
          </div>
        </div>
      </main>

      {/* Share Modal */}
      {showShareModal && quote.public_token && (
        <div className="no-print fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && setShowShareModal(false)}>
          <div className="bg-white w-full sm:max-w-md sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col" dir="rtl">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-xl">🔗</div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">שיתוף הצעה</h3>
                  <p className="text-xs text-gray-500">שלח ללקוח את הקישור והקוד</p>
                </div>
              </div>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Link box */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">קישור ציבורי</label>
                <div className="flex gap-1.5">
                  <input readOnly value={`${typeof window !== "undefined" ? window.location.origin : ""}/q/${quote.public_token}`}
                    autoComplete="url" inputMode="url"
                    className="flex-1 border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-700 focus:outline-none"
                    onClick={(e) => (e.target as HTMLInputElement).select()} />
                  <button onClick={copyLinkOnly}
                    className="flex items-center gap-1 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold px-3 rounded-xl transition-colors">
                    <Copy size={13} />העתק
                  </button>
                </div>
              </div>

              {/* PIN box */}
              {quote.pin_code && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">🔐 קוד אישור (שלח בנפרד)</label>
                  <div className="flex gap-1.5">
                    <div className="flex-1 border-2 border-amber-300 bg-amber-50 rounded-xl px-3 py-2.5 text-center text-xl font-black text-amber-700 tracking-[0.4em]">
                      {quote.pin_code}
                    </div>
                    <button onClick={copyPin}
                      className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 rounded-xl">
                      <Copy size={13} />העתק
                    </button>
                  </div>
                </div>
              )}

              {/* Quick action buttons */}
              <div className="space-y-2 pt-1">
                <button onClick={copyBothLinkAndPin}
                  className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold py-3 rounded-2xl">
                  📋 העתק הכל (קישור + קוד)
                </button>

                {quote.customer_phone && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { sendWhatsApp(); setShowShareModal(false); }}
                      className="flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-3 rounded-2xl">
                      <MessageSquare size={15} />שלח קישור
                    </button>
                    {quote.pin_code && (
                      <button onClick={() => { sendPinViaWhatsApp(); setShowShareModal(false); }}
                        className="flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold py-3 rounded-2xl">
                        <MessageSquare size={15} />שלח קוד
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 leading-relaxed">
                💡 <strong>טיפ:</strong> שלח את הקישור והקוד ב-2 הודעות נפרדות ב-WhatsApp לאבטחה מקסימלית.
              </div>
            </div>

            <div className="px-5 py-3 border-t border-gray-100 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button onClick={() => setShowShareModal(false)}
                className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold">
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
