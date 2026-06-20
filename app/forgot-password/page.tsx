"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Leaf, Mail, Loader2, CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    // Send the recovery email. The link routes through /auth/callback,
    // which we tell (via ?next) to land the user on the update-password
    // page once the recovery session is established.
    const redirectTo = `${window.location.origin}/auth/callback?next=/auth/update-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setLoading(false);
    if (error) {
      setError("אירעה שגיאה. בדוק שהאימייל נכון ונסה שוב.");
      return;
    }
    // Always show success — we don't reveal whether the email exists
    // (avoids leaking which addresses are registered).
    setSent(true);
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-100 mb-6">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">בדוק את האימייל שלך</h1>
          <p className="text-gray-500 mb-2">אם קיים חשבון עם הכתובת:</p>
          <p className="font-semibold text-gray-800 mb-6">{email}</p>
          <p className="text-sm text-gray-400 mb-8 leading-relaxed">
            שלחנו אליך לינק לאיפוס הסיסמה. לחץ עליו כדי להגדיר סיסמה חדשה.
            <br />לא רואה את המייל? בדוק בתיקיית הספאם.
          </p>
          <Link href="/login"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
            <ArrowRight size={16} />
            חזרה לכניסה
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-700 shadow-lg mb-4">
            <Leaf size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">גנן Pro</h1>
          <p className="text-gray-500 mt-1">איפוס סיסמה</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">שכחת את הסיסמה?</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            אין בעיה. הזן את האימייל שלך ונשלח לך לינק להגדרת סיסמה חדשה.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-1.5">אימייל</label>
              <div className="relative">
                <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="forgot-email"
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  autoComplete="email" inputMode="email"
                  className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2">
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? "שולח..." : "שלח לינק לאיפוס"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-green-600 font-semibold hover:underline">
              חזרה לכניסה
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
