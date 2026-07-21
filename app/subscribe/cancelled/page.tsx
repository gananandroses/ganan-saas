"use client";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

// Bridge page: Grow's payment page navigates here (cancelUrl) when the
// customer backs out of checkout. Since /subscribe now shows the payment
// page inside an iframe, and Grow's iframe/postMessage protocol isn't
// publicly documented, we don't rely on it at all — this page is under our
// own control, so it simply promotes itself to the top-level window (if it
// finds itself running inside the iframe) and lands back on /subscribe
// with the iframe closed.
export default function SubscribeCancelledPage() {
  useEffect(() => {
    const top = window.top ?? window.self;
    top.location.href = "/subscribe";
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl">
      <Loader2 size={28} className="animate-spin text-green-600" />
    </div>
  );
}
