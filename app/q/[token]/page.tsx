"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, Phone, MapPin, FileText, Printer } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

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
  quote_number: string | null;
  title: string;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  items: QuoteItemDB[];
  markup_percent: number;
  subtotal_before_vat: number;
  vat_amount: number;
  total_with_vat: number;
  discount_amount: number | null;
  discount_type: "amount" | "percent" | null;
  status: "draft" | "sent" | "accepted" | "rejected";
  valid_until: string | null;
  notes: string | null;
  created_at: string;
  user_id: string;
  view_count: number | null;
  signed_at: string | null;
  signature_data: string | null;
  signed_by_name: string | null;
}

interface Testimonial { customer_name: string; rating: number; text: string; location?: string }
interface TrustBadge { icon: string; text: string }

interface PublicProfile {
  business_name: string;
  owner_name: string;
  phone: string;
  city: string;
  bit_phone: string;
  paybox_phone: string;
  bank_name: string;
  bank_branch: string;
  bank_account: string;
  business_logo_url: string;
  quote_title_label: string;
  quote_intro_text: string;
  quote_default_footer: string;
  testimonials: Testimonial[];
  trust_badges: TrustBadge[];
  hero_image_url: string;
}

function fmt(n: number) {
  return `₪${Math.round(n).toLocaleString("he-IL")}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function PublicQuotePage() {
  const params = useParams();
  const token = params.token as string;
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signing, setSigning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; expired: boolean } | null>(null);

  // Countdown timer for valid_until
  useEffect(() => {
    if (!quote?.valid_until) return;
    const update = () => {
      const target = new Date(quote.valid_until!).getTime();
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, expired: true });
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setCountdown({ days, hours, minutes, expired: false });
    };
    update();
    const interval = setInterval(update, 60000); // update every minute
    return () => clearInterval(interval);
  }, [quote?.valid_until]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      // Find quote by public token (no auth required)
      const { data: q } = await supabase
        .from("quotes")
        .select("*")
        .eq("public_token", token)
        .maybeSingle();

      if (q) {
        setQuote(q as QuoteData);
        // Increment view count + set viewed_at on first view
        if (!q.viewed_at) {
          await supabase.from("quotes").update({
            viewed_at: new Date().toISOString(),
            view_count: (q.view_count || 0) + 1,
          }).eq("public_token", token);
        } else {
          await supabase.from("quotes").update({
            view_count: (q.view_count || 0) + 1,
          }).eq("public_token", token);
        }

        // Fetch business profile (public read of selected fields)
        const { data: p } = await supabase
          .from("user_profile")
          .select("business_name, owner_name, phone, city, bit_phone, paybox_phone, bank_name, bank_branch, bank_account, business_logo_url, quote_title_label, quote_intro_text, quote_default_footer, testimonials, trust_badges, hero_image_url")
          .eq("user_id", q.user_id)
          .maybeSingle();
        if (p) setProfile(p as PublicProfile);
      }
      setLoading(false);
    })();
  }, [token]);

  // Setup canvas for signature
  useEffect(() => {
    if (!showSignModal) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let drawing = false;
    let lastX = 0;
    let lastY = 0;

    function getPos(e: MouseEvent | TouchEvent): { x: number; y: number } {
      const rect = canvas!.getBoundingClientRect();
      let clientX = 0, clientY = 0;
      if ("touches" in e && e.touches.length) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ("clientX" in e) {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }
      return {
        x: (clientX - rect.left) * (canvas!.width / rect.width),
        y: (clientY - rect.top) * (canvas!.height / rect.height),
      };
    }

    function start(e: MouseEvent | TouchEvent) {
      e.preventDefault();
      drawing = true;
      const { x, y } = getPos(e);
      lastX = x;
      lastY = y;
    }
    function move(e: MouseEvent | TouchEvent) {
      if (!drawing) return;
      e.preventDefault();
      const { x, y } = getPos(e);
      ctx!.strokeStyle = "#0f172a";
      ctx!.lineWidth = 2.5;
      ctx!.lineCap = "round";
      ctx!.lineJoin = "round";
      ctx!.beginPath();
      ctx!.moveTo(lastX, lastY);
      ctx!.lineTo(x, y);
      ctx!.stroke();
      lastX = x;
      lastY = y;
      setHasSignature(true);
    }
    function end() { drawing = false; }

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    canvas.addEventListener("mouseup", end);
    canvas.addEventListener("mouseleave", end);
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", end);

    return () => {
      canvas.removeEventListener("mousedown", start);
      canvas.removeEventListener("mousemove", move);
      canvas.removeEventListener("mouseup", end);
      canvas.removeEventListener("mouseleave", end);
      canvas.removeEventListener("touchstart", start);
      canvas.removeEventListener("touchmove", move);
      canvas.removeEventListener("touchend", end);
    };
  }, [showSignModal]);

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  async function handleSign() {
    if (!quote || !signerName.trim() || !hasSignature) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sigData = canvas.toDataURL("image/png");

    setSigning(true);
    await supabase.from("quotes").update({
      signed_at: new Date().toISOString(),
      signature_data: sigData,
      signed_by_name: signerName.trim(),
      status: "accepted",
    }).eq("public_token", token);

    setQuote({
      ...quote,
      signed_at: new Date().toISOString(),
      signature_data: sigData,
      signed_by_name: signerName.trim(),
      status: "accepted",
    });
    setSigning(false);
    setShowSignModal(false);
  }

  function handlePrint() { window.print(); }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={28} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center bg-slate-50" dir="rtl">
        <div>
          <FileText size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-lg text-gray-600 font-bold">הצעת המחיר לא נמצאה</p>
          <p className="text-sm text-gray-400 mt-1">ייתכן שהקישור פג תוקף או שגוי.</p>
        </div>
      </div>
    );
  }

  const itemsWithCalc = quote.items.map(i => {
    const finalPrice = i.customPrice !== undefined ? i.customPrice : Math.round(i.basePrice * (1 + quote.markup_percent / 100));
    return { ...i, finalPrice, lineTotal: finalPrice * i.qty };
  });

  const isAccepted = quote.status === "accepted";
  const titleLabel = profile?.quote_title_label || "הצעת מחיר";

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 print:bg-white">
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 1.5cm; }
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>

      {/* Top action bar */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500">
            {quote.quote_number ? `#${quote.quote_number}` : "הצעת מחיר"}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-2 rounded-lg">
              <Printer size={13} /> הדפס
            </button>
            {!isAccepted && (
              <button onClick={() => setShowSignModal(true)}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-sm">
                <CheckCircle2 size={14} /> אשר ההצעה
              </button>
            )}
            {isAccepted && (
              <span className="flex items-center gap-1.5 bg-green-100 text-green-800 text-xs font-bold px-3 py-2 rounded-lg">
                <CheckCircle2 size={14} /> ההצעה אושרה
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main quote document */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden print:shadow-none print:border-0 print:rounded-none">

          {/* Hero header */}
          <div className="bg-gradient-to-l from-emerald-600 via-green-600 to-teal-600 text-white px-8 py-8 print:bg-green-700">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="flex items-center gap-4">
                {profile?.business_logo_url ? (
                  <div className="w-16 h-16 rounded-2xl bg-white p-2 flex items-center justify-center shadow-lg flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={profile.business_logo_url} alt="לוגו" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl flex-shrink-0">🌿</div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-widest text-green-100 font-semibold">
                    {profile?.business_name || "העסק שלי"}
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-black mt-1">{titleLabel}</h1>
                  {profile?.owner_name && <p className="text-sm text-green-50 mt-0.5">{profile.owner_name}</p>}
                </div>
              </div>
              <div className="text-left">
                <p className="text-xs text-green-100 uppercase tracking-wider">מספר הצעה</p>
                <p className="text-lg font-bold">{quote.quote_number ? `#${quote.quote_number}` : "—"}</p>
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
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1"><Phone size={12} /> {quote.customer_phone}</p>
              )}
              {quote.customer_address && (
                <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1"><MapPin size={12} /> {quote.customer_address}</p>
              )}
            </div>
            <div className="p-5 sm:text-left">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">מאת</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{profile?.business_name || "העסק שלי"}</p>
              {profile?.phone && (
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1 sm:justify-end"><Phone size={12} /> {profile.phone}</p>
              )}
              {profile?.city && (
                <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1 sm:justify-end"><MapPin size={12} /> {profile.city}</p>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="px-8 py-5 bg-gradient-to-l from-amber-50 to-orange-50 border-y border-amber-100">
            <p className="text-[10px] uppercase tracking-widest text-amber-700 font-bold">פרויקט</p>
            <h2 className="text-xl font-bold text-gray-900 mt-1">{quote.title}</h2>
          </div>

          {profile?.quote_intro_text && (
            <div className="px-8 py-4 bg-white border-b border-gray-100">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{profile.quote_intro_text}</p>
            </div>
          )}

          {/* Trust badges */}
          {profile?.trust_badges && profile.trust_badges.length > 0 && (
            <div className="px-5 sm:px-8 py-4 bg-blue-50 border-b border-blue-100">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {profile.trust_badges.map((b, idx) => (
                  <div key={idx} className="bg-white rounded-xl p-2.5 text-center border border-blue-100">
                    <div className="text-2xl">{b.icon}</div>
                    <p className="text-[11px] font-semibold text-gray-700 mt-1 leading-tight">{b.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Countdown timer */}
          {!isAccepted && countdown && !countdown.expired && (countdown.days <= 7) && (
            <div className="no-print mx-5 sm:mx-8 my-4 bg-gradient-to-l from-orange-500 to-red-500 text-white rounded-2xl p-4 text-center shadow-lg">
              <p className="text-xs uppercase tracking-widest font-semibold opacity-90">⏰ ההצעה תפוג בעוד</p>
              <div className="flex items-center justify-center gap-3 mt-2">
                <div className="bg-white/20 backdrop-blur rounded-xl px-3 py-1.5 min-w-14">
                  <p className="text-2xl font-black">{countdown.days}</p>
                  <p className="text-[10px] uppercase">ימים</p>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-xl px-3 py-1.5 min-w-14">
                  <p className="text-2xl font-black">{countdown.hours}</p>
                  <p className="text-[10px] uppercase">שעות</p>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-xl px-3 py-1.5 min-w-14">
                  <p className="text-2xl font-black">{countdown.minutes}</p>
                  <p className="text-[10px] uppercase">דקות</p>
                </div>
              </div>
              <p className="text-xs mt-2 opacity-90">חתום עכשיו ושמור על המחיר!</p>
            </div>
          )}

          {!isAccepted && countdown?.expired && (
            <div className="no-print mx-5 sm:mx-8 my-4 bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-center">
              <p className="text-sm font-bold text-red-700">⚠️ תוקף ההצעה פג</p>
              <p className="text-xs text-red-600 mt-1">צור קשר לקבלת הצעה מעודכנת</p>
            </div>
          )}

          {/* Items */}
          <div className="px-5 sm:px-8 py-6">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-right py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-10">#</th>
                  <th className="text-right py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">פריט</th>
                  <th className="text-center py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-16">כמות</th>
                  <th className="text-center py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-24">מחיר ליח׳</th>
                  <th className="text-left py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-28">סה״כ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {itemsWithCalc.map((i, idx) => (
                  <tr key={idx}>
                    <td className="py-3.5 text-sm font-bold text-gray-400 align-top">{idx + 1}</td>
                    <td className="py-3.5">
                      <p className="text-sm font-semibold text-gray-900">{i.name}</p>
                      {i.description && <p className="text-xs text-gray-600 mt-1 leading-relaxed">{i.description}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">{i.unit}</p>
                    </td>
                    <td className="text-center py-3.5 text-sm font-medium text-gray-700 align-top">{i.qty}</td>
                    <td className="text-center py-3.5 text-sm text-gray-700 align-top">{fmt(i.finalPrice)}</td>
                    <td className="text-left py-3.5 text-sm font-bold text-gray-900 align-top">{fmt(i.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-6 flex justify-end">
              <div className="w-full sm:w-80 bg-gray-50 rounded-2xl p-4 space-y-2">
                {(quote.discount_amount ?? 0) > 0 && (() => {
                  const subRaw = itemsWithCalc.reduce((s, i) => s + i.lineTotal, 0);
                  const disc = quote.discount_type === "percent"
                    ? Math.round((subRaw * (quote.discount_amount || 0)) / 100)
                    : Math.round(quote.discount_amount || 0);
                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">סכום פריטים</span>
                        <span className="text-gray-700">{fmt(subRaw)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-rose-600 font-semibold">
                        <span>הנחה {quote.discount_type === "percent" ? `(${quote.discount_amount}%)` : ""}</span>
                        <span>-{fmt(disc)}</span>
                      </div>
                    </>
                  );
                })()}
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

            {/* Big CTA inside body */}
            {!isAccepted && (
              <div className="no-print mt-6 bg-gradient-to-l from-green-500 to-emerald-600 rounded-2xl p-5 text-white text-center shadow-lg">
                <p className="text-sm font-semibold mb-3">מאשר את ההצעה?</p>
                <button onClick={() => setShowSignModal(true)}
                  className="bg-white text-green-700 hover:bg-green-50 font-black px-8 py-3 rounded-xl text-base shadow-md inline-flex items-center gap-2">
                  <CheckCircle2 size={18} /> חתום ואשר עכשיו
                </button>
                <p className="text-xs text-green-50 mt-2">⚡ אישור מיידי · ללא צורך בהדפסה</p>
              </div>
            )}

            {/* Quick contact buttons */}
            {(profile?.phone || quote.customer_phone) && (
              <div className="no-print mt-4 grid grid-cols-2 gap-2">
                {profile?.phone && (
                  <a href={`tel:${profile.phone.replace(/\D/g, "")}`}
                    className="flex items-center justify-center gap-2 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-800 text-sm font-semibold py-3 rounded-xl">
                    <Phone size={14} /> התקשר
                  </a>
                )}
                {profile?.phone && (
                  <a href={`https://api.whatsapp.com/send?phone=${(() => {
                    const p = profile.phone.replace(/\D/g, "");
                    if (p.startsWith("0")) return "972" + p.slice(1);
                    if (p.startsWith("972")) return p;
                    return p;
                  })()}&text=${encodeURIComponent(`היי, יש לי שאלה על הצעת המחיר ${quote.quote_number ? `#${quote.quote_number}` : ""}`)}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-3 rounded-xl">
                    💬 שלח שאלה ב-WhatsApp
                  </a>
                )}
              </div>
            )}
          </div>

          {quote.notes && (
            <div className="px-8 py-5 bg-amber-50/50 border-y border-amber-100">
              <p className="text-[10px] uppercase tracking-widest text-amber-700 font-bold mb-1.5">הערות</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}

          {(profile?.bit_phone || profile?.paybox_phone || profile?.bank_name) && (
            <div className="px-8 py-5">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">אמצעי תשלום</p>
              <div className="space-y-1.5 text-sm text-gray-700">
                {profile.bit_phone && <p>💳 <span className="font-semibold">Bit:</span> {profile.bit_phone}</p>}
                {profile.paybox_phone && <p>📱 <span className="font-semibold">PayBox:</span> {profile.paybox_phone}</p>}
                {(profile.bank_name || profile.bank_account) && (
                  <p>🏦 <span className="font-semibold">העברה בנקאית:</span> {profile.bank_name}
                    {profile.bank_branch ? ` · סניף ${profile.bank_branch}` : ""}
                    {profile.bank_account ? ` · חשבון ${profile.bank_account}` : ""}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Signature display if signed */}
          {isAccepted && quote.signature_data && (
            <div className="px-8 py-6 bg-green-50 border-t-2 border-green-200">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs uppercase tracking-wider text-green-700 font-bold">✓ ההצעה אושרה</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">{quote.signed_by_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">חתם בתאריך {formatDate(quote.signed_at)}</p>
                </div>
                <div className="bg-white rounded-xl border border-green-200 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={quote.signature_data} alt="חתימה" className="h-16 w-auto" />
                </div>
              </div>
            </div>
          )}

          {/* Testimonials */}
          {profile?.testimonials && profile.testimonials.length > 0 && (
            <div className="px-5 sm:px-8 py-6 bg-amber-50 border-t border-amber-100">
              <p className="text-[10px] uppercase tracking-widest text-amber-700 font-bold mb-3 text-center">⭐ לקוחות מרוצים מספרים</p>
              <div className="space-y-3">
                {profile.testimonials.slice(0, 3).map((t, idx) => (
                  <div key={idx} className="bg-white rounded-xl p-3 border border-amber-100">
                    <div className="flex items-center gap-1 mb-1">
                      {Array.from({length: 5}, (_, i) => (
                        <span key={i} className={`text-sm ${i < t.rating ? "text-amber-400" : "text-gray-200"}`}>★</span>
                      ))}
                    </div>
                    <p className="text-sm text-gray-700 italic leading-relaxed">&quot;{t.text}&quot;</p>
                    <p className="text-xs text-gray-500 mt-1.5 font-semibold">— {t.customer_name}{t.location ? ` · ${t.location}` : ""}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 mb-3 whitespace-pre-wrap">
              {profile?.quote_default_footer || "ההצעה תקפה ל-30 ימים מהיום. חתימה על ההצעה מהווה אישור לביצוע העבודה."}
            </p>
            {profile?.business_name && (
              <p className="text-sm font-bold text-gray-700">{profile.business_name}</p>
            )}
            <p className="text-[10px] text-gray-400 mt-1">המחירים כוללים מע״מ · המסמך הופק במערכת mygananpro</p>
          </div>
        </div>
      </div>

      {/* Signature modal */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={(e) => e.target === e.currentTarget && setShowSignModal(false)}>
          <div className="bg-white w-full sm:max-w-md sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col" dir="rtl">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">אישור הצעת המחיר</h3>
              <p className="text-xs text-gray-500 mt-0.5">חתום כדי לאשר את ההצעה</p>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">שם מלא *</label>
                <input value={signerName} onChange={e => setSignerName(e.target.value)}
                  placeholder="שם מלא של החותם"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-700">חתימה *</label>
                  <button type="button" onClick={clearSignature} className="text-xs text-gray-500 hover:text-red-600 font-medium">נקה</button>
                </div>
                <canvas ref={canvasRef} width={600} height={200}
                  className="w-full border-2 border-gray-200 rounded-xl bg-gray-50 touch-none cursor-crosshair"
                  style={{ aspectRatio: "3/1" }} />
                <p className="text-[11px] text-gray-400 mt-1">חתום באצבע או בעכבר</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-xs text-amber-800">
                  לאחר אישור החתימה, ההצעה תיחתם דיגיטלית והעסקה תיסגר. תקבל אישור מהעסק.
                </p>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button onClick={() => setShowSignModal(false)} disabled={signing}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-700 text-sm font-semibold">
                ביטול
              </button>
              <button onClick={handleSign}
                disabled={signing || !signerName.trim() || !hasSignature}
                className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-bold">
                {signing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {signing ? "שומר..." : "אשר וחתום"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
