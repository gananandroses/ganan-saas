"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2, Check } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function PushNotifications() {
  const [status, setStatus] = useState<"idle" | "loading" | "enabled" | "denied" | "unsupported">("idle");

  useEffect(() => {
    // Register SW
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    // Check current permission
    if (!("Notification" in window) || !("PushManager" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "granted") setStatus("enabled");
    else if (Notification.permission === "denied") setStatus("denied");
  }, []);

  async function enable() {
    setStatus("loading");
    try {
      // Safari compatibility: requestPermission can be callback-based
      let permission: NotificationPermission;
      if (typeof Notification.requestPermission === "function") {
        permission = await new Promise((resolve) => {
          const result = Notification.requestPermission((p) => resolve(p));
          if (result && typeof result.then === "function") result.then(resolve);
        });
      } else {
        setStatus("unsupported"); return;
      }

      if (permission !== "granted") { setStatus("denied"); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus("idle"); return; }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), userId: user.id }),
      });

      if (res.ok) setStatus("enabled");
      else setStatus("idle");
    } catch {
      setStatus("idle");
    }
  }

  if (status === "enabled") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1.5 font-medium">
        <Check size={12} /> התראות פעילות
      </span>
    );
  }

  if (status === "denied") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-3 py-1.5">
        <BellOff size={12} /> אפשר התראות בהגדרות הדפדפן
      </span>
    );
  }

  if (status === "unsupported") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5">
        <Bell size={12} /> תזכורות במייל פעילות ✓
      </span>
    );
  }

  // idle or loading — show button
  return (
    <button
      onClick={enable}
      disabled={status === "loading"}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-full px-3 py-1.5 transition-colors disabled:opacity-70"
    >
      {status === "loading"
        ? <><Loader2 size={12} className="animate-spin" /> מאשר...</>
        : <><Bell size={12} /> 🔔 הפעל התראות דפדפן</>
      }
    </button>
  );
}
