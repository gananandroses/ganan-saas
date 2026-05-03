"use client";

import { useState, useEffect } from "react";
import { User, Bell, BellOff, Lock, Building, Save, Loader2, CheckCircle, ChevronRight, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

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
  });

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

      // Load business settings from localStorage
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
          });
        } catch {}
      } else {
        setForm(f => ({ ...f, email: data.user!.email ?? "" }));
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

  // ── Save business form ─────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    localStorage.setItem(`garden_settings_${userId}`, JSON.stringify(form));
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
                alert("נשלח קישור לאיפוס סיסמה לאימייל שלך");
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
