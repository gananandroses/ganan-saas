"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Loader2, ChevronRight, Printer, MessageSquare, CheckCircle2, XCircle, Trash2, Edit3, Calendar, User as UserIcon, Phone, MapPin, Copy, Eye, FileBox,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface QuoteItemDB {
  id: string;
  name: string;
  unit: string;
  basePrice: number;
  qty: number;
  customPrice?: number;
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

const STATUS_CONFIG: Record<QuoteData["status"], { label: string; bg: string; text: string }> = {
  draft:    { label: "טיוטה",  bg: "bg-purple-100", text: "text-purple-800" },
  sent:     { label: "נשלחה ללקוח",  bg: "bg-blue-100",   text: "text-blue-800" },
  accepted: { label: "אושרה",  bg: "bg-green-100",  text: "text-green-800" },
  rejected: { label: "נדחתה",  bg: "bg-red-100",    text: "text-red-800" },
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
          alert(`✅ ההצעה אושרה!\nנוצר אוטומטית פרויקט חדש: "${quote.title}"`);
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
    if (!confirm(`למחוק את ההצעה "${quote.title}"?`)) return;
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
    }).select().single();

    if (dupe) {
      router.push(`/quote/${dupe.id}/edit`);
    }
  }

  async function copyPublicLink() {
    if (!quote || !quote.public_token) return;
    const url = `${window.location.origin}/q/${quote.public_token}`;
    try {
      await navigator.clipboard.writeText(url);
      alert(`✅ הקישור הועתק!\n\n${url}\n\nהדבק אותו ב-WhatsApp / מייל ושלח ללקוח.`);
    } catch {
      prompt("העתק את הקישור:", url);
    }
  }

  function handlePrint() { window.print(); }

  function sendWhatsApp() {
    if (!quote || !quote.customer_phone) { alert("אין טלפון ללקוח"); return; }
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

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 print:bg-white">
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 1.5cm; }
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>

      {/* Top action bar (hidden in print) */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/quote")} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50">
              <ChevronRight size={18} className="text-gray-500" />
            </button>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${status.bg} ${status.text}`}>
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => router.push(`/quote/${quote.id}/edit`)}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-2 rounded-lg">
              <Edit3 size={13} /> ערוך
            </button>
            <button onClick={handleDuplicate}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-2 rounded-lg" title="שכפול">
              <Copy size={13} /> שכפל
            </button>
            {quote.public_token && (
              <button onClick={copyPublicLink}
                className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-lg" title="העתק קישור ציבורי">
                <Copy size={13} /> קישור
              </button>
            )}
            <button onClick={sendWhatsApp}
              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-2 rounded-lg">
              <MessageSquare size={13} /> שלח
            </button>
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-800 text-white text-xs font-semibold px-3 py-2 rounded-lg">
              <Printer size={13} /> הדפס
            </button>
            <button onClick={handleDelete}
              className="w-8 h-8 flex items-center justify-center border border-red-200 text-red-400 hover:bg-red-50 rounded-lg">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Activity tracking bar */}
      {(quote.view_count || quote.signed_at || quote.project_id) && (
        <div className="no-print bg-violet-50 border-b border-violet-100 px-4 py-2.5">
          <div className="max-w-3xl mx-auto flex items-center gap-4 text-xs text-violet-800 flex-wrap">
            {(quote.view_count || 0) > 0 && (
              <span className="flex items-center gap-1"><Eye size={12} /> נצפה {quote.view_count} פעמים</span>
            )}
            {quote.signed_at && (
              <span className="flex items-center gap-1 font-semibold">
                ✍️ נחתם ע״י {quote.signed_by_name} · {formatDate(quote.signed_at)}
              </span>
            )}
            {quote.project_id && (
              <button onClick={() => router.push("/projects")}
                className="flex items-center gap-1 text-violet-700 hover:text-violet-900 font-semibold underline">
                <FileBox size={12} /> נוצר פרויקט מההצעה — צפה
              </button>
            )}
          </div>
        </div>
      )}

      {/* Status update bar (only for sent quotes) */}
      {quote.status === "sent" && (
        <div className="no-print bg-blue-50 border-b border-blue-100 px-4 py-2.5">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm text-blue-800 font-semibold">📨 ההצעה נשלחה. מה ענה הלקוח?</span>
            <div className="flex gap-2">
              <button onClick={() => updateStatus("accepted")} disabled={updating}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                <CheckCircle2 size={13} /> אושר
              </button>
              <button onClick={() => updateStatus("rejected")} disabled={updating}
                className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                <XCircle size={13} /> נדחה
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main quote document */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden print:shadow-none print:border-0 print:rounded-none">

          {/* Hero header with gradient */}
          <div className="bg-gradient-to-l from-emerald-600 via-green-600 to-teal-600 text-white px-8 py-8 print:bg-green-700">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="flex items-center gap-4">
                {settings.logoUrl ? (
                  <div className="w-16 h-16 rounded-2xl bg-white p-2 flex items-center justify-center shadow-lg flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={settings.logoUrl} alt="לוגו" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl flex-shrink-0">
                    🌿
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-widest text-green-100 font-semibold">{settings.businessName || "העסק שלי"}</p>
                  <h1 className="text-2xl sm:text-3xl font-black mt-1">{settings.quoteTitleLabel || "הצעת מחיר"}</h1>
                  {settings.ownerName && <p className="text-sm text-green-50 mt-0.5">{settings.ownerName}</p>}
                </div>
              </div>
              <div className="text-left">
                <p className="text-xs text-green-100 uppercase tracking-wider">מספר הצעה</p>
                <p className="text-lg font-bold">{quote.quote_number ? `#${quote.quote_number}` : `#${quote.id.slice(0, 8).toUpperCase()}`}</p>
                <p className="text-xs text-green-100 mt-2">תאריך: {formatDate(quote.created_at)}</p>
                {quote.valid_until && <p className="text-xs text-green-100">תקף עד: {formatDate(quote.valid_until)}</p>}
              </div>
            </div>
          </div>

          {/* Customer + business contact info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-gray-100">
            <div className="p-5">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">עבור</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{quote.customer_name}</p>
              {quote.customer_phone && (
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                  <Phone size={12} /> {quote.customer_phone}
                </p>
              )}
              {quote.customer_address && (
                <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                  <MapPin size={12} /> {quote.customer_address}
                </p>
              )}
            </div>
            <div className="p-5 sm:text-left">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">מאת</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{settings.businessName || "העסק שלי"}</p>
              {settings.phone && (
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1 sm:justify-end">
                  <Phone size={12} /> {settings.phone}
                </p>
              )}
              {settings.city && (
                <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1 sm:justify-end">
                  <MapPin size={12} /> {settings.city}
                </p>
              )}
            </div>
          </div>

          {/* Quote title */}
          <div className="px-8 py-5 bg-gradient-to-l from-amber-50 to-orange-50 border-y border-amber-100">
            <p className="text-[10px] uppercase tracking-widest text-amber-700 font-bold">פרויקט</p>
            <h2 className="text-xl font-bold text-gray-900 mt-1">{quote.title}</h2>
          </div>

          {/* Intro text from template */}
          {settings.quoteIntroText && (
            <div className="px-8 py-4 bg-white border-b border-gray-100">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{settings.quoteIntroText}</p>
            </div>
          )}

          {/* Items table */}
          <div className="px-5 sm:px-8 py-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-right py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">פריט</th>
                    <th className="text-center py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-16">כמות</th>
                    <th className="text-center py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-24">מחיר ליח׳</th>
                    <th className="text-left py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-28">סה״כ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {itemsWithCalc.map((i, idx) => (
                    <tr key={idx}>
                      <td className="py-3.5">
                        <p className="text-sm font-semibold text-gray-900">{i.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{i.unit}</p>
                      </td>
                      <td className="text-center py-3.5 text-sm font-medium text-gray-700">{i.qty}</td>
                      <td className="text-center py-3.5 text-sm text-gray-700">{fmt(i.finalPrice)}</td>
                      <td className="text-left py-3.5 text-sm font-bold text-gray-900">{fmt(i.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-6 flex justify-end">
              <div className="w-full sm:w-72 bg-gray-50 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">סה״כ לפני מע״מ</span>
                  <span className="font-bold text-gray-800">{fmt(quote.subtotal_before_vat)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">מע״מ (18%)</span>
                  <span className="font-bold text-gray-800">{fmt(quote.vat_amount)}</span>
                </div>
                <div className="border-t-2 border-gray-200 pt-2 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-gray-900">סה״כ לתשלום</span>
                  <span className="text-2xl font-black text-green-700">{fmt(quote.total_with_vat)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="px-8 py-5 bg-amber-50/50 border-y border-amber-100">
              <p className="text-[10px] uppercase tracking-widest text-amber-700 font-bold mb-1.5">הערות</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}

          {/* Payment methods */}
          {(settings.bitPhone || settings.payboxPhone || settings.bankName) && (
            <div className="px-8 py-5">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">אמצעי תשלום</p>
              <div className="space-y-1.5 text-sm text-gray-700">
                {settings.bitPhone && (
                  <p>💳 <span className="font-semibold">Bit:</span> {settings.bitPhone}</p>
                )}
                {settings.payboxPhone && (
                  <p>📱 <span className="font-semibold">PayBox:</span> {settings.payboxPhone}</p>
                )}
                {(settings.bankName || settings.bankAccount) && (
                  <p>🏦 <span className="font-semibold">העברה בנקאית:</span> {settings.bankName}
                    {settings.bankBranch ? ` · סניף ${settings.bankBranch}` : ""}
                    {settings.bankAccount ? ` · חשבון ${settings.bankAccount}` : ""}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Footer / signature line */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 mb-3 whitespace-pre-wrap">
              {settings.quoteDefaultFooter || `ההצעה תקפה ${quote.valid_until ? `עד ${formatDate(quote.valid_until)}` : "ל-30 ימים מהיום"}. חתימה על ההצעה מהווה אישור לביצוע העבודה.`}
            </p>
            {settings.businessName && (
              <p className="text-sm font-bold text-gray-700">{settings.businessName}</p>
            )}
            <p className="text-[10px] text-gray-400 mt-1">המחירים כוללים מע״מ · המסמך הופק במערכת mygananpro</p>
          </div>
        </div>
      </div>
    </div>
  );
}
