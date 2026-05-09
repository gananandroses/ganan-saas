"use client";

import { useState, useEffect } from "react";
import { User, Bell, BellOff, Lock, Building, Save, Loader2, CheckCircle, ChevronRight, Check, X, FileText, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { toast, confirmDialog } from "@/components/Toaster";
import { getDefaultVatMode, setDefaultVatMode, type VatMode } from "@/lib/vat-settings";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type PushStatus = "idle" | "loading" | "enabled" | "denied" | "unsupported";

export default function SettingsPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");

  // Business / account form
  const [form, setForm] = useState({
    businessName: "",
    ownerName: "",
    phone: "",
    email: "",
    city: "",
    bitPhone: "",
    payboxPhone: "",
    bankName: "",
    bankBranch: "",
    bankAccount: "",
    businessLogoUrl: "",
    quoteDefaultValidityDays: 30,
    quoteDefaultMarkup: 100,
    quoteTitleLabel: "הצעת מחיר",
    quoteDefaultNotes: "",
    quoteDefaultFooter: "ההצעה תקפה למשך 30 ימים מהיום. חתימה על ההצעה מהווה אישור לביצוע העבודה.",
    quoteIntroText: "",
    testimonials: [] as { customer_name: string; rating: number; text: string; location?: string }[],
    trustBadges: [] as { icon: string; text: string }[],
    paymentGateway: "none" as "none" | "meshulam" | "cardcom" | "tranzila" | "payplus",
    paymentGatewayUserId: "",
    paymentGatewayPageCode: "",
    paymentGatewayApiKey: "",
  });
  const [logoUploading, setLogoUploading] = useState(false);

  // Notification prefs (saved to Supabase)
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [savingEmail, setSavingEmail] = useState(false);

  // Push notification state
  const [pushStatus, setPushStatus] = useState<PushStatus>("idle");
  const [pushLoading, setPushLoading] = useState(false);

  // ── Load on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Check push support
    if (!("Notification" in window) || !("PushManager" in window) || !("serviceWorker" in navigator)) {
      setPushStatus("unsupported");
    } else if (Notification.permission === "granted") {
      setPushStatus("enabled");
    } else if (Notification.permission === "denied") {
      setPushStatus("denied");
    }

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const uid = data.user.id;
      setUserId(uid);
      setUserEmail(data.user.email ?? "");

      // Load business profile from Supabase
      const { data: profile } = await supabase
        .from("user_profile")
        .select("business_name, owner_name, phone, city, bit_phone, paybox_phone, bank_name, bank_branch, bank_account, business_logo_url, quote_default_validity_days, quote_default_markup, quote_title_label, quote_default_notes, quote_default_footer, quote_intro_text, testimonials, trust_badges, payment_gateway, payment_gateway_user_id, payment_gateway_page_code, payment_gateway_api_key")
        .eq("user_id", uid)
        .single();

      if (profile) {
        setForm({
          businessName: profile.business_name ?? "",
          ownerName: profile.owner_name ?? "",
          phone: profile.phone ?? "",
          city: profile.city ?? "",
          email: data.user.email ?? "",
          bitPhone: profile.bit_phone ?? "",
          payboxPhone: profile.paybox_phone ?? "",
          bankName: profile.bank_name ?? "",
          bankBranch: profile.bank_branch ?? "",
          bankAccount: profile.bank_account ?? "",
          businessLogoUrl: profile.business_logo_url ?? "",
          quoteDefaultValidityDays: Number(profile.quote_default_validity_days ?? 30),
          quoteDefaultMarkup: Number(profile.quote_default_markup ?? 100),
          quoteTitleLabel: profile.quote_title_label ?? "הצעת מחיר",
          quoteDefaultNotes: profile.quote_default_notes ?? "",
          quoteDefaultFooter: profile.quote_default_footer ?? "ההצעה תקפה למשך 30 ימים מהיום. חתימה על ההצעה מהווה אישור לביצוע העבודה.",
          quoteIntroText: profile.quote_intro_text ?? "",
          testimonials: (profile.testimonials as { customer_name: string; rating: number; text: string; location?: string }[]) ?? [],
          trustBadges: (profile.trust_badges as { icon: string; text: string }[]) ?? [],
          paymentGateway: (profile.payment_gateway as "none" | "meshulam" | "cardcom" | "tranzila" | "payplus") ?? "none",
          paymentGatewayUserId: profile.payment_gateway_user_id ?? "",
          paymentGatewayPageCode: profile.payment_gateway_page_code ?? "",
          paymentGatewayApiKey: profile.payment_gateway_api_key ?? "",
        });
      } else {
        // Migrate from localStorage if exists
        const stored = localStorage.getItem(`garden_settings_${uid}`);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setForm({
              businessName: parsed.businessName ?? "",
              ownerName: parsed.ownerName ?? "",
              phone: parsed.phone ?? "",
              city: parsed.city ?? "",
              email: data.user.email ?? "",
              bitPhone: parsed.bitPhone ?? "",
              payboxPhone: parsed.payboxPhone ?? "",
              bankName: parsed.bankName ?? "",
              bankBranch: parsed.bankBranch ?? "",
              bankAccount: parsed.bankAccount ?? "",
              businessLogoUrl: parsed.businessLogoUrl ?? "",
              quoteDefaultValidityDays: 30,
              quoteDefaultMarkup: 100,
              quoteTitleLabel: "הצעת מחיר",
              quoteDefaultNotes: "",
              quoteDefaultFooter: "ההצעה תקפה למשך 30 ימים מהיום. חתימה על ההצעה מהווה אישור לביצוע העבודה.",
              quoteIntroText: "",
              testimonials: [],
              trustBadges: [],
              paymentGateway: "none",
              paymentGatewayUserId: "",
              paymentGatewayPageCode: "",
              paymentGatewayApiKey: "",
            });
          } catch {}
        } else {
          setForm(f => ({ ...f, email: data.user!.email ?? "" }));
        }
      }

      // Load notification prefs from Supabase
      const { data: notifData } = await supabase
        .from("user_notifications")
        .select("email_enabled")
        .eq("user_id", uid)
        .single();
      if (notifData) {
        setEmailEnabled(notifData.email_enabled ?? true);
      }
    });
  }, []);

  // ── Toggle email reminders ─────────────────────────────────────────────────
  async function toggleEmail(val: boolean) {
    setEmailEnabled(val);
    setSavingEmail(true);
    await supabase.from("user_notifications").upsert(
      { user_id: userId, email_enabled: val, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    setSavingEmail(false);
  }

  // ── Enable push ────────────────────────────────────────────────────────────
  async function enablePush() {
    if (pushStatus === "unsupported") return;
    setPushLoading(true);
    try {
      let permission: NotificationPermission = Notification.permission;
      if (permission === "default") {
        permission = await new Promise<NotificationPermission>((resolve) => {
          const result = Notification.requestPermission((p) => resolve(p));
          if (result && typeof (result as Promise<NotificationPermission>).then === "function") {
            (result as Promise<NotificationPermission>).then(resolve);
          }
        });
      }

      if (permission !== "granted") {
        setPushStatus("denied");
        setPushLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const appKey = urlBase64ToUint8Array(vapidKey);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appKey as unknown as BufferSource,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setPushLoading(false); return; }

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), userId: user.id }),
      });

      // Mark push_enabled in user_notifications
      await supabase.from("user_notifications").upsert(
        { user_id: user.id, push_enabled: true, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

      setPushStatus("enabled");
    } catch {
      // keep as idle
    }
    setPushLoading(false);
  }

  // ── Disable push ───────────────────────────────────────────────────────────
  async function disablePush() {
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        // Remove from DB
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
          await supabase.from("user_notifications").upsert(
            { user_id: user.id, push_enabled: false, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
          );
        }
      }
    } catch {}
    setPushStatus("idle");
    setPushLoading(false);
  }

  // ── Save business form to Supabase ────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    await supabase.from("user_profile").upsert({
      user_id: userId,
      business_name: form.businessName,
      owner_name: form.ownerName,
      phone: form.phone,
      city: form.city,
      bit_phone: form.bitPhone,
      paybox_phone: form.payboxPhone,
      bank_name: form.bankName,
      bank_branch: form.bankBranch,
      bank_account: form.bankAccount,
      business_logo_url: form.businessLogoUrl,
      quote_default_validity_days: form.quoteDefaultValidityDays,
      quote_default_markup: form.quoteDefaultMarkup,
      quote_title_label: form.quoteTitleLabel,
      quote_default_notes: form.quoteDefaultNotes,
      quote_default_footer: form.quoteDefaultFooter,
      quote_intro_text: form.quoteIntroText,
      testimonials: form.testimonials,
      trust_badges: form.trustBadges,
      payment_gateway: form.paymentGateway,
      payment_gateway_user_id: form.paymentGatewayUserId,
      payment_gateway_page_code: form.paymentGatewayPageCode,
      payment_gateway_api_key: form.paymentGatewayApiKey,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  // ── Logo upload ──────────────────────────────────────────────────────────
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("הקובץ גדול מדי. מקסימום 2MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("חובה להעלות קובץ תמונה (PNG, JPG, SVG).");
      return;
    }

    setLogoUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${userId}/logo-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("business-assets")
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    if (upErr) {
      toast.error(`שגיאה בהעלאה: ${upErr.message}`);
      setLogoUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("business-assets")
      .getPublicUrl(path);

    const url = urlData.publicUrl;
    setForm(f => ({ ...f, businessLogoUrl: url }));

    // Auto-save to DB
    await supabase.from("user_profile").upsert({
      user_id: userId,
      business_logo_url: url,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    setLogoUploading(false);
  }

  async function handleLogoRemove() {
    if (!await confirmDialog({ title: "להסיר את הלוגו?", confirmLabel: "הסר", destructive: true })) return;
    setForm(f => ({ ...f, businessLogoUrl: "" }));
    await supabase.from("user_profile").upsert({
      user_id: userId,
      business_logo_url: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  }

  return (
    <div dir="rtl" className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-100 active:bg-gray-200 active:scale-95 transition-all duration-100"
        >
          <ChevronRight className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">הגדרות</h1>
          <p className="text-sm text-gray-500 mt-0.5">ניהול פרטי עסק והעדפות מערכת</p>
        </div>
      </div>

      {/* Business Info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <Building className="w-4 h-4 text-green-600" />
          </div>
          <h2 className="font-bold text-gray-900">פרטי העסק</h2>
        </div>
        <div className="p-6 space-y-4">
          {/* Logo upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">לוגו העסק</label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
                {form.businessLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.businessLogoUrl} alt="לוגו" className="w-full h-full object-contain" />
                ) : (
                  <Building className="w-8 h-8 text-gray-300" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${logoUploading ? "bg-gray-200 text-gray-400" : "bg-green-600 hover:bg-green-700 text-white"}`}>
                  {logoUploading ? <Loader2 size={14} className="animate-spin" /> : null}
                  {logoUploading ? "מעלה..." : (form.businessLogoUrl ? "החלף לוגו" : "העלה לוגו")}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={logoUploading} className="hidden" />
                </label>
                {form.businessLogoUrl && (
                  <button type="button" onClick={handleLogoRemove}
                    className="block text-xs font-medium text-red-500 hover:text-red-700">
                    הסר לוגו
                  </button>
                )}
                <p className="text-xs text-gray-400">PNG, JPG או SVG. מקסימום 2MB. הלוגו יופיע בהצעות מחיר ובמסמכים.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם העסק</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                value={form.businessName}
                onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם הבעלים</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                value={form.ownerName}
                onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
              <input
                type="tel"
                placeholder="054-1234567"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">עיר</label>
              <input
                type="text"
                placeholder="תל אביב"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Payment Details */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Building className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">פרטי תשלום</h2>
            <p className="text-xs text-gray-500">יסונכרנו אוטומטית עם תזכורות WhatsApp</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bit (טלפון)</label>
              <input
                type="tel"
                placeholder="054-1234567"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                value={form.bitPhone}
                onChange={e => setForm(f => ({ ...f, bitPhone: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PayBox (טלפון)</label>
              <input
                type="tel"
                placeholder="054-1234567"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                value={form.payboxPhone}
                onChange={e => setForm(f => ({ ...f, payboxPhone: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">בנק</label>
              <input
                type="text"
                placeholder="הפועלים"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                value={form.bankName}
                onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סניף</label>
              <input
                type="text"
                placeholder="123"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                value={form.bankBranch}
                onChange={e => setForm(f => ({ ...f, bankBranch: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">מספר חשבון</label>
              <input
                type="text"
                placeholder="456789"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                value={form.bankAccount}
                onChange={e => setForm(f => ({ ...f, bankAccount: e.target.value }))}
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">
            ⓘ פרטים אלו יתווספו אוטומטית להודעת תזכורת WhatsApp ללקוחות עם חוב פתוח. ריקים — לא יוצגו.
          </p>
        </div>
      </div>

      {/* VAT default */}
      <VatDefaultCard userId={userId} />

      {/* Quote Template */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">תבנית הצעת מחיר</h2>
            <p className="text-xs text-gray-500">ברירות מחדל שיופיעו בכל הצעת מחיר חדשה</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">כותרת המסמך</label>
              <input
                type="text"
                placeholder="הצעת מחיר"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                value={form.quoteTitleLabel}
                onChange={e => setForm(f => ({ ...f, quoteTitleLabel: e.target.value }))}
              />
              <p className="text-[11px] text-gray-400 mt-1">לדוגמה: &quot;הצעת מחיר ושירותים&quot;</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תוקף ברירת מחדל (ימים)</label>
              <input
                type="number"
                min={1}
                max={365}
                placeholder="30"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                value={form.quoteDefaultValidityDays}
                onChange={e => setForm(f => ({ ...f, quoteDefaultValidityDays: parseInt(e.target.value) || 30 }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אחוז ייקור ברירת מחדל (%)</label>
            <input
              type="number"
              min={0}
              max={500}
              step={5}
              placeholder="100"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              value={form.quoteDefaultMarkup}
              onChange={e => setForm(f => ({ ...f, quoteDefaultMarkup: parseFloat(e.target.value) || 0 }))}
            />
            <p className="text-[11px] text-gray-400 mt-1">יוחל אוטומטית בכל הצעה חדשה. ניתן לשנות לכל הצעה בנפרד.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">טקסט פתיחה (אופציונלי)</label>
            <textarea
              rows={2}
              placeholder="לדוגמה: 'תודה שפנית אלינו! להלן הצעת המחיר המבוקשת...'"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
              value={form.quoteIntroText}
              onChange={e => setForm(f => ({ ...f, quoteIntroText: e.target.value }))}
            />
            <p className="text-[11px] text-gray-400 mt-1">מופיע בתחילת ההצעה (אם הוזן)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">הערות סטנדרטיות (אופציונלי)</label>
            <textarea
              rows={3}
              placeholder="לדוגמה: 'התשלום בסיום העבודה. זמני אספקה: 7 ימי עסקים...'"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
              value={form.quoteDefaultNotes}
              onChange={e => setForm(f => ({ ...f, quoteDefaultNotes: e.target.value }))}
            />
            <p className="text-[11px] text-gray-400 mt-1">יופיע אוטומטית בשדה ההערות של כל הצעה חדשה</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">טקסט תחתית</label>
            <textarea
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
              value={form.quoteDefaultFooter}
              onChange={e => setForm(f => ({ ...f, quoteDefaultFooter: e.target.value }))}
            />
            <p className="text-[11px] text-gray-400 mt-1">מופיע בתחתית כל הצעת מחיר. לדוגמה תנאי שימוש, אחריות וכו&apos;.</p>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">🛡️ תווי אמון</h2>
            <p className="text-xs text-gray-500">יוצגו ללקוחות בהצעות המחיר (אחריות, חינם משלוח וכו&apos;)</p>
          </div>
        </div>
        <div className="p-6 space-y-3">
          {form.trustBadges.map((badge, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input value={badge.icon} onChange={e => {
                const next = [...form.trustBadges];
                next[idx] = { ...next[idx], icon: e.target.value };
                setForm(f => ({ ...f, trustBadges: next }));
              }} placeholder="🛡️" maxLength={3}
                className="w-14 text-center text-xl border border-gray-200 rounded-xl px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              <input value={badge.text} onChange={e => {
                const next = [...form.trustBadges];
                next[idx] = { ...next[idx], text: e.target.value };
                setForm(f => ({ ...f, trustBadges: next }));
              }} placeholder="לדוגמה: אחריות 30 יום, ביטוח עבודה, חינם משלוח..."
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              <button type="button" onClick={() => setForm(f => ({ ...f, trustBadges: f.trustBadges.filter((_, i) => i !== idx) }))}
                aria-label="הסר תו אמון"
                className="text-gray-300 hover:text-red-500"><X size={16} /></button>
            </div>
          ))}
          <button type="button" onClick={() => setForm(f => ({ ...f, trustBadges: [...f.trustBadges, { icon: "🛡️", text: "" }] }))}
            className="w-full py-2 border-2 border-dashed border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl text-sm font-semibold">
            + הוסף תו אמון
          </button>
          {form.trustBadges.length === 0 && (
            <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
              <p className="font-semibold mb-1">💡 דוגמאות לתווי אמון נפוצים:</p>
              <p>🛡️ אחריות 30 יום · 🚚 חינם משלוח · ✅ ביטוח עבודה מלא · 🌟 שירות 24/7 · 🌿 תקן ירוק</p>
            </div>
          )}
        </div>
      </div>

      {/* Testimonials */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">⭐ עדויות לקוחות</h2>
            <p className="text-xs text-gray-500">יוצגו בתחתית הצעות המחיר (מעלה אמון ב-30%+)</p>
          </div>
        </div>
        <div className="p-6 space-y-3">
          {form.testimonials.map((t, idx) => (
            <div key={idx} className="bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex gap-2 items-center flex-1">
                  <input value={t.customer_name} onChange={e => {
                    const next = [...form.testimonials];
                    next[idx] = { ...next[idx], customer_name: e.target.value };
                    setForm(f => ({ ...f, testimonials: next }));
                  }} placeholder="שם הלקוח" className="flex-1 border border-amber-200 bg-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                  <input value={t.location ?? ""} onChange={e => {
                    const next = [...form.testimonials];
                    next[idx] = { ...next[idx], location: e.target.value };
                    setForm(f => ({ ...f, testimonials: next }));
                  }} placeholder="עיר (אופציונלי)" className="w-32 border border-amber-200 bg-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                </div>
                <button type="button" onClick={() => setForm(f => ({ ...f, testimonials: f.testimonials.filter((_, i) => i !== idx) }))}
                  aria-label="הסר עדות"
                  className="text-gray-300 hover:text-red-500 mr-2"><X size={16} /></button>
              </div>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => {
                    const next = [...form.testimonials];
                    next[idx] = { ...next[idx], rating: n };
                    setForm(f => ({ ...f, testimonials: next }));
                  }} className={`text-xl ${n <= t.rating ? "text-amber-400" : "text-gray-300"}`}>★</button>
                ))}
              </div>
              <textarea value={t.text} onChange={e => {
                const next = [...form.testimonials];
                next[idx] = { ...next[idx], text: e.target.value };
                setForm(f => ({ ...f, testimonials: next }));
              }} rows={2} placeholder="ציטוט מהלקוח..."
                className="w-full border border-amber-200 bg-white rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300" />
            </div>
          ))}
          <button type="button" onClick={() => setForm(f => ({ ...f, testimonials: [...f.testimonials, { customer_name: "", rating: 5, text: "", location: "" }] }))}
            className="w-full py-2 border-2 border-dashed border-amber-200 text-amber-700 hover:bg-amber-50 rounded-xl text-sm font-semibold">
            + הוסף עדות לקוח
          </button>
        </div>
      </div>

      {/* Payment Gateway */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">💳 סליקה אוטומטית (אופציונלי)</h2>
            <p className="text-xs text-gray-500">חבר ספק סליקה לתשלום בכרטיס אשראי בעמוד ההצעה</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ספק סליקה</label>
            <select
              value={form.paymentGateway}
              onChange={e => setForm(f => ({ ...f, paymentGateway: e.target.value as "none" | "meshulam" | "cardcom" | "tranzila" | "payplus" }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
              <option value="none">לא מחובר — שימוש ב-Bit/PayBox/בנק בלבד</option>
              <option value="meshulam">משולם</option>
              <option value="cardcom">Cardcom (יתחבר בעתיד)</option>
              <option value="tranzila">Tranzila (יתחבר בעתיד)</option>
              <option value="payplus">PayPlus (יתחבר בעתיד)</option>
            </select>
          </div>

          {form.paymentGateway === "meshulam" && (
            <>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800 leading-relaxed space-y-1">
                <p className="font-semibold">📋 איך לקבל את ה-credentials של משולם:</p>
                <p>1. כנס ל-meshulam.co.il → התחבר</p>
                <p>2. תפריט → API → צור מפתח API</p>
                <p>3. העתק את User ID, Page Code ו-API Key</p>
                <p>4. הדבק אותם פה</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                <input
                  type="text"
                  placeholder="לדוגמה: 1234"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  value={form.paymentGatewayUserId}
                  onChange={e => setForm(f => ({ ...f, paymentGatewayUserId: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Page Code</label>
                <input
                  type="text"
                  placeholder="לדוגמה: abc123def"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  value={form.paymentGatewayPageCode}
                  onChange={e => setForm(f => ({ ...f, paymentGatewayPageCode: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  value={form.paymentGatewayApiKey}
                  onChange={e => setForm(f => ({ ...f, paymentGatewayApiKey: e.target.value }))}
                />
              </div>
            </>
          )}

          <p className="text-xs text-gray-400">
            ⓘ ללא חיבור סליקה — לקוחות יוכלו לשלם רק דרך Bit / PayBox / העברה בנקאית. החיבור הוא תוספת שמאפשרת תשלום בכרטיס אשראי ישירות בעמוד ההצעה.
          </p>
        </div>
      </div>

      {/* Account */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <h2 className="font-bold text-gray-900">חשבון</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
            <input
              type="email"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              value={userEmail}
              disabled
            />
            <p className="text-xs text-gray-400 mt-1">לא ניתן לשינוי</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">איפוס סיסמה</label>
            <button
              onClick={async () => {
                if (!userEmail) return;
                await supabase.auth.resetPasswordForEmail(userEmail);
                toast.success("נשלח קישור לאיפוס סיסמה לאימייל שלך");
              }}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 px-4 py-2 rounded-xl transition-colors"
            >
              <Lock className="w-4 h-4" />
              שלח קישור לאיפוס סיסמה
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <Bell className="w-4 h-4 text-orange-600" />
          </div>
          <h2 className="font-bold text-gray-900">התראות ותזכורות</h2>
        </div>
        <div className="p-6 space-y-5">

          {/* Email reminders toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">תזכורות במייל</p>
              <p className="text-xs text-gray-500 mt-0.5">
                יום לפני בשעה 20:00 + שעה לפני כל עבודה
              </p>
            </div>
            <button
              onClick={() => toggleEmail(!emailEnabled)}
              disabled={savingEmail || !userId}
              className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-60 ${
                emailEnabled ? "bg-green-500" : "bg-gray-200"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  emailEnabled ? "translate-x-0.5" : "translate-x-5"
                }`}
              />
            </button>
          </div>

          <div className="border-t border-gray-100" />

          {/* Push notifications */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">התראות דפדפן (Push)</p>
              <p className="text-xs text-gray-500 mt-0.5">
                התראה ישירה לדפדפן — גם כשהאפליקציה סגורה
              </p>
              {pushStatus === "denied" && (
                <p className="text-xs text-orange-600 mt-1 font-medium">
                  ⚠️ חסום בדפדפן — פתח הגדרות דפדפן ואפשר התראות עבור האתר
                </p>
              )}
              {pushStatus === "unsupported" && (
                <p className="text-xs text-gray-400 mt-1">
                  הדפדפן שלך אינו תומך בהתראות — תזכורות המייל פעילות במקום
                </p>
              )}
            </div>

            {/* Push action button */}
            <div className="flex-shrink-0">
              {pushStatus === "enabled" && (
                <div className="flex flex-col items-end gap-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1.5 font-medium">
                    <Check size={12} /> פעיל
                  </span>
                  <button
                    onClick={disablePush}
                    disabled={pushLoading}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors underline underline-offset-2"
                  >
                    {pushLoading ? "..." : "בטל"}
                  </button>
                </div>
              )}

              {(pushStatus === "idle") && (
                <button
                  onClick={enablePush}
                  disabled={pushLoading}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 active:scale-95 rounded-xl px-4 py-2 transition-all disabled:opacity-60"
                >
                  {pushLoading ? (
                    <><Loader2 size={14} className="animate-spin" /> מאשר...</>
                  ) : (
                    <><Bell size={14} /> הפעל</>
                  )}
                </button>
              )}

              {pushStatus === "denied" && (
                <span className="inline-flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-3 py-1.5">
                  <BellOff size={12} /> חסום
                </span>
              )}

              {pushStatus === "unsupported" && (
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5">
                  <BellOff size={12} /> לא נתמך
                </span>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold px-6 py-3 rounded-xl transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? "שומר..." : saved ? "נשמר!" : "שמור הגדרות"}
        </button>
      </div>
    </div>
  );
}

// ── VAT default card ────────────────────────────────────────────────────────
// Sets a per-device preference for whether prices entered already include
// VAT. Every form that creates jobs / customers / quotes will pre-select
// this mode. Saves immediately on click — no need to hit "save settings".

function VatDefaultCard({ userId }: { userId: string }) {
  // Lazy initialiser reads localStorage on the client; SSR safely defaults
  // to "include" via getDefaultVatMode's window guard. Avoids a setState-
  // in-effect cascade that the eslint rule would otherwise flag.
  const [mode, setMode] = useState<VatMode>(() => getDefaultVatMode(userId));

  function pick(next: VatMode) {
    setMode(next);
    setDefaultVatMode(userId, next);
    toast.success(next === "include" ? "המחירים שלך כוללים מע״מ" : "המחירים שלך לפני מע״מ");
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
        <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
          <Receipt className="w-4 h-4 text-violet-600" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900">מע״מ — ברירת מחדל</h2>
          <p className="text-xs text-gray-500">איך המחירים שלך מוזנים בכל מקום באפליקציה</p>
        </div>
      </div>
      <div className="p-6 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => pick("include")}
            className={`text-right rounded-2xl border-2 px-4 py-3.5 transition-colors ${
              mode === "include"
                ? "border-green-500 bg-green-50"
                : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                mode === "include" ? "border-green-500 bg-green-500" : "border-gray-300"
              }`}>
                {mode === "include" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
              <span className="text-sm font-bold text-gray-900">כולל מע״מ</span>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed pr-6">
              המחירים שאני מקליד הם מה שהלקוח משלם בפועל
            </p>
          </button>
          <button
            type="button"
            onClick={() => pick("before")}
            className={`text-right rounded-2xl border-2 px-4 py-3.5 transition-colors ${
              mode === "before"
                ? "border-green-500 bg-green-50"
                : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                mode === "before" ? "border-green-500 bg-green-500" : "border-gray-300"
              }`}>
                {mode === "before" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
              <span className="text-sm font-bold text-gray-900">לפני מע״מ</span>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed pr-6">
              אני עובד עם מחירים נטו, האפליקציה תוסיף 18%
            </p>
          </button>
        </div>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          תוכל תמיד לשנות את ההתנהגות בעבודה ספציפית. ההגדרה רק קובעת איך הטופס נפתח כברירת מחדל.
        </p>
      </div>
    </div>
  );
}
