"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function PushNotifications() {
  const [status, setStatus] = useState<"idle" | "loading" | "enabled" | "denied">("idle");

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission === "granted") setStatus("enabled");
    else if (Notification.permission === "denied") setStatus("denied");

    // Register service worker
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  async function enable() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("הדפדפן שלך לא תומך בהתראות. נסה להתקין את האפליקציה על הנייד.");
      return;
    }

    setStatus("loading");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setStatus("denied"); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus("idle"); return; }

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), userId: user.id }),
      });

      setStatus("enabled");
    } catch {
      setStatus("idle");
    }
  }

  if (!("Notification" in window)) return null;

  if (status === "enabled") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-xl text-xs text-green-700 font-medium">
        <Bell size={13} />
        תזכורות פעילות
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl text-xs text-gray-500">
        <BellOff size={13} />
        התראות חסומות
      </div>
    );
  }

  return (
    <button
      onClick={enable}
      disabled={status === "loading"}
      className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-60"
    >
      {status === "loading" ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
      הפעל תזכורות
    </button>
  );
}
