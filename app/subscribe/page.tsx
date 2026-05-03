"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Leaf, CheckCircle, Clock, CreditCard, Shield,
  Loader2, LogOut, Star, Zap, Users, TrendingUp,
} from "lucide-react";

interface Subscription {
  status: string;
  trial_ends_at: string;
  current_period_end: string | null;
}

export default function SubscribePage() {
  const [loading, setLoading] = useState(false);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email || "");

      const { data } = await supabase
        .from("subscriptions")
        .select("status, trial_ends_at, current_period_end")
        .eq("user_id", user.id)
        .single();
      setSub(data);
    }
    load();
  }, []);

  async function handleSubscribe() {
    setLoading(true);
    try {
      const res = await fetch("/api/create-payment", { method: "POST" });
      const { url, error } = await res.json();
      if (error || !url) throw new Error(error || "שגיאה ביצירת תשלום");
      window.location.href = url;
    } catch {
      setLoading(false);
      alert("אירעה שגיאה, אנא נסה שוב");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const trialDaysLeft = sub?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0;

  const isTrialExpired = sub?.status === "trial" && trialDaysLeft === 0;
  const isExpiredOrCancelled = sub?.status === "expired" || sub?.status === "cancelled";
  const showExpiredBanner = isTrialExpired || isExpiredOrCancelled;

  const features = [
    { icon: <Users size={16} />, text: "ניהול לקוחות ועובדים ללא הגבלה" },
    { icon: <TrendingUp size={16} />, text: "דוחות כספיים ואנליטיקה מתקדמת" },
    { icon: <Zap size={16} />, text: "מעקב פרויקטים ולוח זמנים" },
    { icon: <Star size={16} />, text: "ניהול מלאי וציוד" },
    { icon: <Shield size={16} />, text: "גיבוי אוטומטי ואבטחה מלאה" },
    { icon: <CreditCard size={16} />, text: "ניהול חשבוניות וחובות" },
  ];

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-700 shadow-lg mb-4">
            <Leaf size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">גנן Pro</h1>
          <p className="text-gray-500 mt-1 text-sm">{userEmail}</p>
        </div>

        {/* Expired banner */}
        {showExpiredBanner && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
            <Clock size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-700 text-sm">
                {isTrialExpired ? "תקופת הניסיון שלך הסתיימה" : "המנוי שלך אינו פעיל"}
              </p>
              <p className="text-red-600 text-xs mt-0.5">
                כדי להמשיך להשתמש בגנן Pro, אנא הירשם למנוי חודשי.
              </p>
            </div>
          </div>
        )}

        {/* Plan card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-br from-green-600 to-green-700 px-8 py-6 text-white text-center">
            <p className="text-green-200 text-sm font-medium mb-1">מנוי חודשי</p>
            <div className="flex items-end justify-center gap-1">
              <span className="text-5xl font-black">₪99</span>
              <span className="text-green-200 text-sm mb-2">לחודש</span>
            </div>
            <p className="text-green-200 text-xs mt-2">+ 14 יום ניסיון חינם לחשבונות חדשים</p>
          </div>

          {/* Features */}
          <div className="px-8 py-6">
            <p className="text-sm font-bold text-gray-700 mb-4">מה כלול במנוי:</p>
            <ul className="space-y-3">
              {features.map((f, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                    {f.icon}
                  </span>
                  <span className="text-sm text-gray-700">{f.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div className="px-8 pb-8 space-y-3">
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 text-base shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  מעביר לדף תשלום...
                </>
              ) : (
                <>
                  <CreditCard size={20} />
                  הירשם עכשיו — ₪99/חודש
                </>
              )}
            </button>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 pt-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Shield size={13} className="text-green-500" />
                <span>תשלום מאובטח</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <CheckCircle size={13} className="text-green-500" />
                <span>ביטול בכל עת</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Leaf size={13} className="text-green-500" />
                <span>משולם ישראל</span>
              </div>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="text-center mt-6">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-400 hover:text-gray-600 text-sm transition-colors mx-auto"
          >
            <LogOut size={15} />
            התנתקות
          </button>
        </div>
      </div>
    </div>
  );
}
