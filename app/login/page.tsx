"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Leaf, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("אימייל או סיסמה שגויים");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-700 shadow-lg mb-4">
            <Leaf size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">גנן Pro</h1>
          <p className="text-gray-500 mt-1">ניהול עסק גינון חכם</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">כניסה לחשבון</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">אימייל</label>
              <div className="relative">
                <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">סיסמה</label>
              <div className="relative">
                <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPass ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full pr-10 pl-10 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2">
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? "מתחבר..." : "כניסה"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              אין לך חשבון?{" "}
              <Link href="/register" className="text-green-600 font-semibold hover:underline">
                הרשמה חינם
              </Link>
            </p>
          </div>
        </div>

        {/* Trial badge */}
        <div className="text-center mt-4">
          <span className="text-xs text-gray-400">ניסיון חינם 14 יום · אין צורך בכרטיס אשראי</span>
        </div>
      </div>
    </div>
  );
}
