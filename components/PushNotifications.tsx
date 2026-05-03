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
  const [status, setStatus] = useState<"loading" | "unsupported" | "idle" | "enabled" | "denied">("loading");

  useEffect(() => {
    // Register service worker regardless
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }

    if (Notification.permission === "granted") setStatus("enabled");
    else if (Notification.permission === "denied") setStatus("denied");
    else setStatus("idle");
  }, []);

  async function enable() {
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

  if (status === "loading") return null;

  if (status === "unsupported") return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl text-xs text-gray-400">
      <BellOff size={13} />
      התקן את האפליקציה לתזכורות
    </div>
  );

  if (status === "enabled") return (
    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-xl text-xs text-green-700 font-medium">
      <Bell size={13} />
      תזכורות פעילות ✓
    </div>
  );

  if (status === "denied") return (
    <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-xl text-xs text-orange-600">
      <BellOff size={13} />
      התראות חסומות — אפשר בהגדרות הדפדפן
    </div>
  );

  return (
    <button
      onClick={enable}
      className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold transition-colors"
    >
      <Bell size={13} />
      🔔 הפעל תזכורות
    </button>
  );
}
