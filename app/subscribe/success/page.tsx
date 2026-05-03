"use client";
import { useEffect, useState } from "react";
import { CheckCircle, Leaf, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function SubscribeSuccessPage() {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          window.location.href = "/dashboard";
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="w-full max-w-md text-center">

        {/* Icon */}
        <div className="relative inline-block mb-6">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle size={48} className="text-green-600" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-md">
            <Leaf size={18} className="text-white" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-black text-gray-900 mb-2">ברוך הבא לגנן Pro!</h1>
        <p className="text-gray-500 text-base mb-8 leading-relaxed">
          המנוי שלך הופעל בהצלחה.<br />
          כל הכלים פתוחים עבורך מעכשיו.
        </p>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 mb-6 text-right space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">סטטוס מנוי</span>
            <span className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-xs">פעיל ✓</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">עלות</span>
            <span className="font-bold text-gray-800">₪99 / חודש</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">ניתן לביטול</span>
            <span className="text-gray-700">בכל עת</span>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3.5 rounded-2xl transition-colors shadow-md text-base"
        >
          <ArrowLeft size={18} />
          עבור לדשבורד
        </Link>

        {/* Countdown */}
        <p className="text-gray-400 text-sm mt-4 flex items-center justify-center gap-1.5">
          <Loader2 size={13} className="animate-spin" />
          מועבר אוטומטית בעוד {countdown} שניות...
        </p>

      </div>
    </div>
  );
}
