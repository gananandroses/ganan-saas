"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, Phone, MapPin, FileText, Printer, X, Copy, ExternalLink } from "lucide-react";
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
  pin_code: string | null;
  pin_attempts: number | null;
  pin_locked_until: string | null;
  deposit_percent: number | null;
  deposit_amount: number | null;
  payment_status: "unpaid" | "pending_verification" | "deposit_paid" | "fully_paid" | null;
  payment_method: string | null;
  payment_reference: string | null;
  payment_proof_url: string | null;
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
  payment_gateway: "none" | "meshulam" | "cardcom" | "tranzila" | "payplus" | null;
  payment_gateway_user_id: string | null;
  payment_gateway_page_code: string | null;
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
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  // Payment flow
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [paymentMarking, setPaymentMarking] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

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
          .select("business_name, owner_name, phone, city, bit_phone, paybox_phone, bank_name, bank_branch, bank_account, business_logo_url, quote_title_label, quote_intro_text, quote_default_footer, testimonials, trust_badges, hero_image_url, payment_gateway, payment_gateway_user_id, payment_gateway_page_code")
          .eq("user_id", q.user_id)
          .maybeSingle();
        if (p) setProfile(p as PublicProfile);
      }
      setLoading(false);
    })();
  }, [token]);

  // Setup canvas for signature — works for BOTH the signature modal AND payment modal step 3
  const canvasVisible =
    showSignModal || (showPaymentModal && pinVerified && !!selectedMethod);

  useEffect(() => {
    if (!canvasVisible) return;
    // Defer until DOM is rendered
    const t = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Reset canvas size in case it was just mounted
      ctx.clearRect(0, 0, canvas.width, canvas.height);

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

      // Cleanup attached to the ref so we can remove on next effect
      (canvas as HTMLCanvasElement & { _cleanup?: () => void })._cleanup = () => {
        canvas.removeEventListener("mousedown", start);
        canvas.removeEventListener("mousemove", move);
        canvas.removeEventListener("mouseup", end);
        canvas.removeEventListener("mouseleave", end);
        canvas.removeEventListener("touchstart", start);
        canvas.removeEventListener("touchmove", move);
        canvas.removeEventListener("touchend", end);
      };
    }, 50);

    return () => {
      clearTimeout(t);
      const canvas = canvasRef.current as
        | (HTMLCanvasElement & { _cleanup?: () => void })
        | null;
      if (canvas?._cleanup) canvas._cleanup();
    };
  }, [canvasVisible]);

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  async function verifyPin(): Promise<boolean> {
    if (!quote) return false;
    setPinError(null);

    const { data: freshQuote } = await supabase
      .from("quotes")
      .select("pin_code, pin_attempts, pin_locked_until")
      .eq("public_token", token)
      .maybeSingle();

    const currentPin = freshQuote?.pin_code ?? quote.pin_code;
    const currentAttempts = freshQuote?.pin_attempts ?? quote.pin_attempts ?? 0;
    const currentLockedUntil = freshQuote?.pin_locked_until ?? quote.pin_locked_until;

    if (currentLockedUntil && new Date(currentLockedUntil) > new Date()) {
      setPinError(`הקוד ננעל. נסה שוב לאחר ${new Date(currentLockedUntil).toLocaleTimeString("he-IL")}`);
      return false;
    }

    if (currentPin) {
      if (!pinInput || pinInput.length !== 4) {
        setPinError("הזן קוד 4 ספרות");
        return false;
      }
      if (pinInput.trim() !== String(currentPin).trim()) {
        const newAttempts = currentAttempts + 1;
        const updates: Record<string, unknown> = { pin_attempts: newAttempts };
        if (newAttempts >= 3) {
          const lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
          updates.pin_locked_until = lockUntil;
          await supabase.from("quotes").update(updates).eq("public_token", token);
          setQuote({ ...quote, pin_attempts: newAttempts, pin_locked_until: lockUntil });
          setPinError(`קוד שגוי. נחסם ל-15 דקות. צור קשר עם השולח לקבלת קוד חדש.`);
          return false;
        }
        await supabase.from("quotes").update(updates).eq("public_token", token);
        setQuote({ ...quote, pin_attempts: newAttempts });
        setPinError(`קוד שגוי. נשארו ${3 - newAttempts} ניסיונות.`);
        return false;
      }
    }
    return true;
  }

  // Step 1: Customer chose method, show payment instructions + proof upload
  function selectPaymentMethod(method: string) {
    setSelectedMethod(method);
  }

  // Copy-to-clipboard with toast feedback
  const [copiedField, setCopiedField] = useState<string | null>(null);
  async function copyToClipboard(text: string, fieldId: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch {}
      document.body.removeChild(ta);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 1500);
    }
  }

  // Build deep links for Bit / PayBox apps
  function buildBitLink(phone: string, amount: number, desc: string) {
    const cleanPhone = phone.replace(/\D/g, "");
    // Bit's official share-link format — opens the app on mobile, web fallback otherwise
    return `https://www.bitpay.co.il/app/share-link?bituname=${encodeURIComponent(cleanPhone)}&amount=${amount}&description=${encodeURIComponent(desc)}`;
  }
  function buildPayBoxLink(phone: string) {
    const cleanPhone = phone.replace(/\D/g, "");
    // PayBox doesn't expose a stable P2P deep link with amount;
    // open the app's universal link (will open the app if installed).
    return `https://link.payboxapp.com/?phone=${encodeURIComponent(cleanPhone)}`;
  }

  function handleProofChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1) Validate it's an image (JPG/PNG/HEIC/WEBP)
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/heic", "image/webp"];
    const isImageType = allowedTypes.includes(file.type) || file.type.startsWith("image/");
    if (!isImageType) {
      toast.error("יש להעלות תמונה בלבד (JPG / PNG / HEIC).");
      e.target.value = "";
      return;
    }

    // 2) Validate size — minimum 10KB (rule out empty/blank), maximum 5MB
    if (file.size < 10 * 1024) {
      toast.error("הקובץ קטן מדי. ודא שזה צילום מסך אמיתי של אישור התשלום.");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("הקובץ גדול מדי. מקסימום 5MB.");
      e.target.value = "";
      return;
    }

    // 3) Validate by actually loading as image (catches files with image extension but bad content)
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const testImg = new window.Image();
      testImg.onload = () => {
        // Reject suspicious dimensions (too small to be a payment screenshot)
        if (testImg.width < 200 || testImg.height < 200) {
          toast.error("התמונה קטנה מדי. ודא שזה צילום מסך מלא של האישור.");
          return;
        }
        setProofFile(file);
        setProofPreview(dataUrl);
      };
      testImg.onerror = () => {
        toast.error("הקובץ אינו תמונה תקינה. נסה צילום מסך אחר.");
        e.target.value = "";
      };
      testImg.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  // Final submit: upload proof, save reference, signature, status=pending_verification
  async function submitPaymentProofAndSign() {
    if (!quote || !signerName.trim() || !hasSignature) return;
    if (!paymentReference.trim()) {
      toast.error("חובה להזין מספר אסמכתא של התשלום");
      return;
    }
    setPaymentMarking(true);
    setUploadingProof(true);

    let proofUrl: string | null = null;
    if (proofFile) {
      const ext = proofFile.name.split(".").pop() || "jpg";
      const path = `${quote.id}/proof-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("payment-proofs")
        .upload(path, proofFile, { upsert: true });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("payment-proofs").getPublicUrl(path);
        proofUrl = urlData.publicUrl;
      }
    }
    setUploadingProof(false);

    const canvas = canvasRef.current;
    const sigData = canvas ? canvas.toDataURL("image/png") : null;

    setSigning(true);
    await supabase.from("quotes").update({
      payment_status: "pending_verification",
      payment_method: selectedMethod,
      payment_marked_at: new Date().toISOString(),
      payment_reference: paymentReference.trim(),
      payment_proof_url: proofUrl,
      signed_at: new Date().toISOString(),
      signature_data: sigData,
      signed_by_name: signerName.trim(),
      // status stays "sent" — quote becomes "accepted" only when seller verifies payment
      pin_code: null,
      pin_attempts: 0,
      pin_locked_until: null,
    }).eq("public_token", token);

    setQuote({
      ...quote,
      payment_status: "pending_verification",
      payment_method: selectedMethod,
      payment_reference: paymentReference.trim(),
      payment_proof_url: proofUrl,
      signed_at: new Date().toISOString(),
      signature_data: sigData,
      signed_by_name: signerName.trim(),
      pin_code: null,
    });
    setSigning(false);
    setPaymentMarking(false);
    setShowPaymentModal(false);
  }

  async function handleSign() {
    if (!quote || !signerName.trim() || !hasSignature) return;
    setPinError(null);
    const ok = await verifyPin();
    if (!ok) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const sigData = canvas.toDataURL("image/png");

    setSigning(true);
    await supabase.from("quotes").update({
      signed_at: new Date().toISOString(),
      signature_data: sigData,
      signed_by_name: signerName.trim(),
      status: "accepted",
      pin_code: null,             // Invalidate PIN after successful sign
      pin_attempts: 0,
      pin_locked_until: null,
    }).eq("public_token", token);

    setQuote({
      ...quote,
      signed_at: new Date().toISOString(),
      signature_data: sigData,
      signed_by_name: signerName.trim(),
      status: "accepted",
      pin_code: null,
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
  const isPendingVerification = quote.payment_status === "pending_verification" && !!quote.signed_at;
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
            {!isAccepted && !isPendingVerification && (
              <button onClick={() => {
                  if ((quote.deposit_amount ?? 0) > 0 && quote.payment_status === "unpaid") {
                    setShowPaymentModal(true);
                  } else {
                    setShowSignModal(true);
                  }
                }}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-sm">
                <CheckCircle2 size={14} /> אשר ההצעה
              </button>
            )}
            {isPendingVerification && (
              <span className="flex items-center gap-1.5 bg-amber-100 text-amber-800 text-xs font-bold px-3 py-2 rounded-lg">
                ⏳ ממתין לאימות תשלום
              </span>
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
            {!isAccepted && !isPendingVerification && (
              <div className="no-print mt-6 bg-gradient-to-l from-green-500 to-emerald-600 rounded-2xl p-5 text-white text-center shadow-lg">
                <p className="text-sm font-semibold mb-3">מאשר את ההצעה?</p>
                <button onClick={() => {
                  if ((quote.deposit_amount ?? 0) > 0 && quote.payment_status === "unpaid") {
                    setShowPaymentModal(true);
                  } else {
                    setShowSignModal(true);
                  }
                }}
                  className="bg-white text-green-700 hover:bg-green-50 font-black px-8 py-3 rounded-xl text-base shadow-md inline-flex items-center gap-2">
                  <CheckCircle2 size={18} /> חתום ואשר עכשיו
                </button>
                <p className="text-xs text-green-50 mt-2">⚡ אישור מיידי · ללא צורך בהדפסה</p>
              </div>
            )}

            {/* Pending verification banner */}
            {isPendingVerification && (
              <div className="mt-6 bg-gradient-to-l from-amber-100 to-yellow-100 border-2 border-amber-300 rounded-2xl p-5 text-center">
                <div className="text-4xl mb-2">⏳</div>
                <p className="text-base font-black text-amber-900 mb-1">תודה! קיבלנו את ההזמנה</p>
                <p className="text-sm text-amber-800 mb-3">החתימה שלך והוכחת התשלום נשלחו לספק.</p>
                <div className="bg-white rounded-xl p-3 text-right text-xs text-gray-700 space-y-1">
                  {quote.payment_reference && <p><span className="text-gray-500">אסמכתא:</span> <span className="font-mono font-bold">{quote.payment_reference}</span></p>}
                  {quote.signed_by_name && <p><span className="text-gray-500">חתימת:</span> <strong>{quote.signed_by_name}</strong></p>}
                  {quote.signed_at && <p><span className="text-gray-500">תאריך:</span> {formatDate(quote.signed_at)}</p>}
                </div>
                <p className="text-xs text-amber-700 mt-3">
                  הספק יאמת את התשלום בבנק שלו ויעדכן אותך בהקדם (תוך 24 שעות).
                </p>
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
      {/* Payment Modal */}
      {showPaymentModal && quote.deposit_amount && (() => {
        const depositAmount = quote.deposit_amount || 0;
        const depositPercent = quote.deposit_percent || 50;
        const allowBit = depositAmount <= 3000 && profile?.bit_phone;
        const allowPayBox = depositAmount <= 3000 && profile?.paybox_phone;
        const allowMeshulam = profile?.payment_gateway === "meshulam" && profile?.payment_gateway_user_id;
        const allowBank = profile?.bank_name || profile?.bank_account;

        return (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={(e) => e.target === e.currentTarget && setShowPaymentModal(false)}>
            <div className="bg-white w-full sm:max-w-md sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh]" dir="rtl">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-xl">💰</div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">מקדמה לאישור ההצעה</h3>
                    <p className="text-xs text-gray-500">{depositPercent}% מסכום ההצעה</p>
                  </div>
                </div>
                <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              {/* Step 1: PIN */}
              {!pinVerified && (
                <div className="p-5 space-y-3 overflow-y-auto flex-1">
                  <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 text-center">
                    <p className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">סכום מקדמה</p>
                    <p className="text-3xl font-black text-emerald-700 mt-1">{fmt(depositAmount)}</p>
                    <p className="text-xs text-emerald-600 mt-0.5">מתוך סה״כ {fmt(quote.total_with_vat)}</p>
                  </div>

                  {quote.pin_code && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">🔐 קוד אישור (4 ספרות) *</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={pinInput}
                        onChange={e => { setPinInput(e.target.value.replace(/\D/g, "")); setPinError(null); }}
                        placeholder="••••"
                        autoComplete="one-time-code"
                        className="w-full border-2 border-amber-300 rounded-xl px-3 py-3 text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <p className="text-[11px] text-gray-500 mt-1.5">הקוד נשלח לך בהודעה נפרדת מהקישור.</p>
                      {pinError && (
                        <p className="text-[12px] text-red-600 font-semibold mt-1.5 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5">⚠️ {pinError}</p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={async () => {
                      const ok = await verifyPin();
                      if (ok) setPinVerified(true);
                    }}
                    className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold"
                  >
                    אמת קוד והמשך לתשלום
                  </button>
                </div>
              )}

              {/* Step 2: Payment method selection (no method chosen yet) */}
              {pinVerified && !selectedMethod && (
                <div className="p-5 space-y-2.5 overflow-y-auto flex-1">
                  <p className="text-sm font-semibold text-gray-800 mb-1">בחר אופציית תשלום:</p>

                  {allowMeshulam && (
                    <button onClick={() => toast.info("חיבור משולם יושלם בקרוב")}
                      className="w-full flex items-center gap-3 p-3 border-2 border-emerald-200 hover:bg-emerald-50 rounded-2xl text-right transition-colors">
                      <div className="text-3xl">💳</div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-sm">תשלום בכרטיס אשראי</p>
                        <p className="text-xs text-gray-500">סליקה מאובטחת — {fmt(depositAmount)}</p>
                      </div>
                    </button>
                  )}

                  {allowBit && (
                    <button onClick={() => selectPaymentMethod("bit")}
                      className="w-full flex items-center gap-3 p-3 border-2 border-blue-200 hover:bg-blue-50 rounded-2xl text-right transition-colors">
                      <div className="text-3xl">💸</div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-sm">Bit</p>
                        <p className="text-xs text-gray-500">שלח Bit ל-{profile?.bit_phone} · {fmt(depositAmount)}</p>
                      </div>
                    </button>
                  )}

                  {allowPayBox && (
                    <button onClick={() => selectPaymentMethod("paybox")}
                      className="w-full flex items-center gap-3 p-3 border-2 border-purple-200 hover:bg-purple-50 rounded-2xl text-right transition-colors">
                      <div className="text-3xl">📱</div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-sm">PayBox</p>
                        <p className="text-xs text-gray-500">שלח PayBox ל-{profile?.paybox_phone} · {fmt(depositAmount)}</p>
                      </div>
                    </button>
                  )}

                  {allowBank && (
                    <button onClick={() => selectPaymentMethod("bank")}
                      className="w-full flex items-center gap-3 p-3 border-2 border-gray-200 hover:bg-gray-50 rounded-2xl text-right transition-colors">
                      <div className="text-3xl">🏦</div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-sm">העברה בנקאית</p>
                        <p className="text-xs text-gray-500">{profile?.bank_name}{profile?.bank_branch ? ` · סניף ${profile.bank_branch}` : ""}{profile?.bank_account ? ` · חשבון ${profile.bank_account}` : ""}</p>
                      </div>
                    </button>
                  )}

                  {!allowBit && !allowPayBox && !allowMeshulam && !allowBank && (
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 space-y-3 text-center">
                      <div className="text-3xl">📞</div>
                      <p className="text-sm font-bold text-amber-900">לתיאום תשלום — צור קשר ישירות</p>
                      <p className="text-xs text-amber-700">הספק יספק לך פרטי תשלום בשיחה</p>
                      {profile?.phone && (
                        <div className="flex flex-col gap-2 pt-1">
                          <a href={`tel:${profile.phone.replace(/\D/g, "")}`}
                            className="bg-white border-2 border-amber-300 hover:bg-amber-100 text-amber-800 text-sm font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                            <Phone size={14} /> התקשר עכשיו: {profile.phone}
                          </a>
                          <a href={`https://api.whatsapp.com/send?phone=${(() => {
                            const p = profile.phone.replace(/\D/g, "");
                            if (p.startsWith("0")) return "972" + p.slice(1);
                            if (p.startsWith("972")) return p;
                            return p;
                          })()}&text=${encodeURIComponent(`היי, רוצה לבצע תשלום על הצעה ${quote.quote_number ? `#${quote.quote_number}` : ""}`)}`}
                            target="_blank" rel="noreferrer"
                            className="bg-green-500 hover:bg-green-600 text-white text-sm font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                            💬 שלח WhatsApp
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {depositAmount > 3000 && (
                    <p className="text-[11px] text-gray-400 mt-2">
                      ⓘ Bit/PayBox מוגבלים ל-₪3,000 לפי החוק. לסכומים גבוהים — כרטיס אשראי או העברה בנקאית.
                    </p>
                  )}

                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 mt-3">
                    💡 לאחר ביצוע התשלום, לחץ על השיטה שבחרת וחתום על ההצעה.
                  </div>
                </div>
              )}

              {/* Step 3: Payment instructions + proof + signature */}
              {pinVerified && selectedMethod && (
                <div className="p-5 space-y-4 overflow-y-auto flex-1">
                  {/* Back button */}
                  <button onClick={() => setSelectedMethod(null)}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 font-semibold">
                    ← חזור לבחירת שיטה
                  </button>

                  {/* Payment instructions per method */}
                  {selectedMethod === "bit" && profile?.bit_phone && (
                    <div className="bg-gradient-to-l from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-4 text-center space-y-3">
                      <div className="text-4xl">💸</div>
                      <p className="text-sm font-bold text-blue-900">שלח Bit עכשיו</p>
                      <div className="bg-white rounded-xl p-3 mt-2 space-y-2">
                        <div>
                          <p className="text-[11px] text-gray-500">לטלפון:</p>
                          <div className="flex items-center justify-center gap-2 mt-0.5">
                            <p className="text-xl font-black text-blue-700 tracking-wide ltr-num" dir="ltr">{profile.bit_phone}</p>
                            <button onClick={() => copyToClipboard(profile.bit_phone, "bit-phone")}
                              className="bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg px-2.5 py-1 text-[11px] font-bold flex items-center gap-1">
                              {copiedField === "bit-phone" ? <><CheckCircle2 size={12}/> הועתק</> : <><Copy size={12}/> העתק</>}
                            </button>
                          </div>
                        </div>
                        <div className="border-t border-gray-100 pt-2">
                          <p className="text-[11px] text-gray-500">סכום:</p>
                          <p className="text-2xl font-black text-blue-700">{fmt(depositAmount)}</p>
                        </div>
                      </div>
                      <a href={buildBitLink(profile.bit_phone, depositAmount, `מקדמה ${quote.quote_number ? "#" + quote.quote_number : ""}`)}
                        target="_blank" rel="noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md text-sm">
                        <ExternalLink size={16}/> פתח את אפליקציית Bit
                      </a>
                      <p className="text-[10px] text-blue-700/70">אם האפליקציה לא נפתחת — שלח ידנית למספר למעלה</p>
                    </div>
                  )}
                  {selectedMethod === "paybox" && profile?.paybox_phone && (
                    <div className="bg-gradient-to-l from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-4 text-center space-y-3">
                      <div className="text-4xl">📱</div>
                      <p className="text-sm font-bold text-purple-900">שלח PayBox עכשיו</p>
                      <div className="bg-white rounded-xl p-3 mt-2 space-y-2">
                        <div>
                          <p className="text-[11px] text-gray-500">לטלפון:</p>
                          <div className="flex items-center justify-center gap-2 mt-0.5">
                            <p className="text-xl font-black text-purple-700 tracking-wide ltr-num" dir="ltr">{profile.paybox_phone}</p>
                            <button onClick={() => copyToClipboard(profile.paybox_phone, "paybox-phone")}
                              className="bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg px-2.5 py-1 text-[11px] font-bold flex items-center gap-1">
                              {copiedField === "paybox-phone" ? <><CheckCircle2 size={12}/> הועתק</> : <><Copy size={12}/> העתק</>}
                            </button>
                          </div>
                        </div>
                        <div className="border-t border-gray-100 pt-2">
                          <p className="text-[11px] text-gray-500">סכום:</p>
                          <p className="text-2xl font-black text-purple-700">{fmt(depositAmount)}</p>
                        </div>
                      </div>
                      <a href={buildPayBoxLink(profile.paybox_phone)}
                        target="_blank" rel="noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl shadow-md text-sm">
                        <ExternalLink size={16}/> פתח את אפליקציית PayBox
                      </a>
                      <p className="text-[10px] text-purple-700/70">לאחר פתיחת PayBox — חפש את המספר וטען את הסכום ידנית</p>
                    </div>
                  )}
                  {selectedMethod === "bank" && (
                    <div className="bg-gradient-to-l from-gray-50 to-slate-100 border-2 border-gray-300 rounded-2xl p-4 space-y-2">
                      <div className="text-center">
                        <div className="text-4xl">🏦</div>
                        <p className="text-sm font-bold text-gray-900 mt-1">בצע העברה בנקאית</p>
                      </div>
                      <div className="bg-white rounded-xl p-3 mt-2 space-y-2">
                        {profile?.bank_name && (
                          <div className="flex items-center justify-between gap-2 text-right">
                            <div>
                              <p className="text-[11px] text-gray-500">בנק:</p>
                              <p className="text-sm font-bold text-gray-900">{profile.bank_name}</p>
                            </div>
                            <button onClick={() => copyToClipboard(profile.bank_name, "bank-name")}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 flex-shrink-0">
                              {copiedField === "bank-name" ? <><CheckCircle2 size={12}/> הועתק</> : <><Copy size={12}/> העתק</>}
                            </button>
                          </div>
                        )}
                        {profile?.bank_branch && (
                          <div className="flex items-center justify-between gap-2 text-right border-t border-gray-100 pt-2">
                            <div>
                              <p className="text-[11px] text-gray-500">מספר סניף:</p>
                              <p className="text-base font-black text-gray-900 ltr-num" dir="ltr">{profile.bank_branch}</p>
                            </div>
                            <button onClick={() => copyToClipboard(profile.bank_branch, "bank-branch")}
                              className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 flex-shrink-0">
                              {copiedField === "bank-branch" ? <><CheckCircle2 size={12}/> הועתק</> : <><Copy size={12}/> העתק סניף</>}
                            </button>
                          </div>
                        )}
                        {profile?.bank_account && (
                          <div className="flex items-center justify-between gap-2 text-right border-t border-gray-100 pt-2">
                            <div>
                              <p className="text-[11px] text-gray-500">מספר חשבון:</p>
                              <p className="text-base font-black text-gray-900 ltr-num" dir="ltr">{profile.bank_account}</p>
                            </div>
                            <button onClick={() => copyToClipboard(profile.bank_account, "bank-account")}
                              className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 flex-shrink-0">
                              {copiedField === "bank-account" ? <><CheckCircle2 size={12}/> הועתק</> : <><Copy size={12}/> העתק חשבון</>}
                            </button>
                          </div>
                        )}
                        {profile?.business_name && (
                          <div className="flex items-center justify-between gap-2 text-right border-t border-gray-100 pt-2">
                            <div>
                              <p className="text-[11px] text-gray-500">לפקודת:</p>
                              <p className="text-sm font-bold text-gray-900">{profile.business_name}</p>
                            </div>
                            <button onClick={() => copyToClipboard(profile.business_name, "biz-name")}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 flex-shrink-0">
                              {copiedField === "biz-name" ? <><CheckCircle2 size={12}/> הועתק</> : <><Copy size={12}/> העתק</>}
                            </button>
                          </div>
                        )}
                        <div className="border-t-2 border-gray-200 pt-2 flex items-center justify-between gap-2">
                          <div>
                            <p className="text-[11px] text-gray-500">סכום להעברה:</p>
                            <p className="text-xl font-black text-emerald-700">{fmt(depositAmount)}</p>
                          </div>
                          <button onClick={() => copyToClipboard(String(depositAmount), "amount")}
                            className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 flex-shrink-0">
                            {copiedField === "amount" ? <><CheckCircle2 size={12}/> הועתק</> : <><Copy size={12}/> העתק סכום</>}
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 text-center">העתק את הפרטים והדבק באפליקציית הבנק שלך</p>
                    </div>
                  )}

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 leading-relaxed">
                    ⚠️ <strong>שלב 1:</strong> בצע את התשלום באפליקציה / בנק.<br/>
                    <strong>שלב 2:</strong> חזור לכאן והזן אסמכתא + העלה צילום מסך + חתום.<br/>
                    <strong>שלב 3:</strong> הספק יאמת את התשלום בבנק שלו ואז ההצעה תאושר רשמית.
                  </div>

                  {/* Proof form */}
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">📌 מספר אסמכתא / Reference *</label>
                      <input value={paymentReference} onChange={e => setPaymentReference(e.target.value)}
                        placeholder="לדוגמה: 123456789"
                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                      <p className="text-[11px] text-gray-400 mt-1">המספר שמופיע באישור התשלום שקיבלת</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">📷 צילום מסך של האישור (אופציונלי)</label>
                      {!proofPreview ? (
                        <label className="flex flex-col items-center justify-center w-full py-6 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                          <span className="text-3xl">📤</span>
                          <span className="text-xs text-gray-500 mt-1">לחץ להעלאת תמונה</span>
                          <input type="file" accept="image/*" onChange={handleProofChange} className="hidden" />
                        </label>
                      ) : (
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={proofPreview} alt="הוכחת תשלום" className="w-full max-h-48 object-contain rounded-xl border border-gray-200 bg-gray-50" />
                          <button onClick={() => { setProofFile(null); setProofPreview(null); }}
                            className="absolute top-2 left-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold">
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">שם מלא לחתימה *</label>
                      <input value={signerName} onChange={e => setSignerName(e.target.value)}
                        placeholder="שם מלא"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-gray-800">חתימה *</label>
                        <button type="button" onClick={clearSignature} className="text-xs text-gray-500 hover:text-red-600 font-medium">נקה</button>
                      </div>
                      <canvas ref={canvasRef} width={600} height={200}
                        className="w-full border-2 border-gray-200 rounded-xl bg-gray-50 touch-none cursor-crosshair"
                        style={{ aspectRatio: "3/1" }} />
                    </div>
                  </div>

                  <button onClick={submitPaymentProofAndSign}
                    disabled={paymentMarking || signing || uploadingProof || !paymentReference.trim() || !signerName.trim() || !hasSignature}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-base font-bold mt-2">
                    {(paymentMarking || signing || uploadingProof) ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                    {uploadingProof ? "מעלה תמונה..." : signing ? "שומר..." : "סיימתי לשלם → חתום ושלח לאימות"}
                  </button>

                  <p className="text-[11px] text-gray-500 text-center">
                    ההצעה תקבל אישור סופי לאחר שהספק יאמת את התשלום בבנק שלו (תוך 24 שעות).
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {showSignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={(e) => e.target === e.currentTarget && setShowSignModal(false)}>
          <div className="bg-white w-full sm:max-w-md sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col" dir="rtl">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">אישור הצעת המחיר</h3>
              <p className="text-xs text-gray-500 mt-0.5">חתום כדי לאשר את ההצעה</p>
            </div>
            <div className="p-5 space-y-3">
              {/* PIN input */}
              {quote.pin_code && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">🔐 קוד אישור (4 ספרות) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={pinInput}
                    onChange={e => { setPinInput(e.target.value.replace(/\D/g, "")); setPinError(null); }}
                    placeholder="••••"
                    autoComplete="one-time-code"
                    className="w-full border-2 border-amber-300 rounded-xl px-3 py-3 text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-500"
                  />
                  <p className="text-[11px] text-gray-500 mt-1.5">הקוד נשלח לך בהודעה נפרדת מהקישור.</p>
                  {pinError && (
                    <p className="text-[12px] text-red-600 font-semibold mt-1.5 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5">⚠️ {pinError}</p>
                  )}
                </div>
              )}
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
