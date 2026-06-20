"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Leaf, Lock, Loader2, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  // null = still checking, true/false = whether a recovery session exists.
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // The user arrives here AFTER /auth/callback established a recovery
  // session. If there's no session (link expired / opened directly), we
  // show a clear message instead of a broken form.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("הסיסמה חייבת להיות לפחות 6 תווים");
      return;
    }
    if (password !== confirm) {
      setError("הסיסמאות אינן תואמות");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError("אירעה שגיאה בעדכון הסיסמה. ייתכן שהלינק פג תוקף — נסה לאפס שוב.");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/dashboard"), 1600);
  }

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-700 shadow-lg mb-4">
            <Leaf size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">גנן Pro</h1>
          <p className="text-gray-500 mt-1">הגדרת סיסמה חדשה</p>
        </div>
        {children}
      </div>
    </div>
  );

  if (done) {
    return shell(
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
        <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 mb-1">הסיסמה עודכנה!</h2>
        <p className="text-sm text-gray-500">מעביר אותך לדשבורד...</p>
      </div>
    );
  }

  if (hasSession === false) {
    return shell(
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
        <AlertCircle size={40} className="text-amber-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">הלינק אינו תקף</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          ייתכן שהלינק לאיפוס פג תוקף או שכבר נעשה בו שימוש. נסה לאפס את הסיסמה שוב.
        </p>
        <Link href="/forgot-password"
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
          אפס סיסמה מחדש
        </Link>
      </div>
    );
  }

  return shell(
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
      <h2 className="text-xl font-bold text-gray-900 mb-6">בחר סיסמה חדשה</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1.5">סיסמה חדשה</label>
          <div className="relative">
            <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="new-password"
              type={showPass ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full pr-10 pl-10 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              placeholder="לפחות 6 תווים"
            />
            <button type="button" onClick={() => setShowPass(!showPass)}
              aria-label={showPass ? "הסתר סיסמה" : "הצג סיסמה"}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1.5">אימות סיסמה</label>
          <div className="relative">
            <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="confirm-password"
              type={showPass ? "text" : "password"} required value={confirm} onChange={e => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              placeholder="חזור על הסיסמה"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        <button type="submit" disabled={loading || hasSession === null}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2">
          {loading ? <Loader2 size={18} className="animate-spin" /> : null}
          {loading ? "מעדכן..." : "עדכן סיסמה"}
        </button>
      </form>
    </div>
  );
}
