"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Leaf, Mail, Lock, User, Phone, Loader2, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "", businessName: "", phone: "", email: "", password: "", confirmPassword: "",
  });

  function update(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("הסיסמאות אינן תואמות");
      return;
    }
    if (form.password.length < 6) {
      setError("סיסמה חייבת להיות לפחות 6 תווים");
      return;
    }
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName, business_name: form.businessName, phone: form.phone },
      },
    });

    if (error) {
      setError(error.message === "User already registered" ? "אימייל זה כבר רשום במערכת" : error.message);
      setLoading(false);
    } else {
      setStep("verify");
    }
  }

  if (step === "verify") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-100 mb-6">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">בדוק את האימייל שלך</h1>
          <p className="text-gray-500 mb-2">שלחנו לינק אימות לכתובת:</p>
          <p className="font-semibold text-gray-800 mb-6">{form.email}</p>
          <p className="text-sm text-gray-400 mb-8">לחץ על הלינק כדי לאמת את החשבון ולהתחיל את תקופת הניסיון החינמית</p>
          <Link href="/login"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
            חזור לכניסה
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
          <p className="text-gray-500 mt-1">14 יום ניסיון חינם · ללא כרטיס אשראי</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">יצירת חשבון חדש</h2>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">שם מלא *</label>
                <div className="relative">
                  <User size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input required value={form.fullName} onChange={e => update("fullName", e.target.value)}
                    className="w-full pr-9 pl-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="ישראל ישראלי" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">שם העסק *</label>
                <div className="relative">
                  <Leaf size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input required value={form.businessName} onChange={e => update("businessName", e.target.value)}
                    className="w-full pr-9 pl-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="גינות ישראל" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">טלפון</label>
              <div className="relative">
                <Phone size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="tel" value={form.phone} onChange={e => update("phone", e.target.value)}
                  className="w-full pr-9 pl-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="054-0000000" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">אימייל *</label>
              <div className="relative">
                <Mail size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" required value={form.email} onChange={e => update("email", e.target.value)}
                  className="w-full pr-9 pl-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="your@email.com" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">סיסמה *</label>
                <div className="relative">
                  <Lock size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="password" required value={form.password} onChange={e => update("password", e.target.value)}
                    className="w-full pr-9 pl-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="לפחות 6 תווים" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">אימות סיסמה *</label>
                <div className="relative">
                  <Lock size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="password" required value={form.confirmPassword} onChange={e => update("confirmPassword", e.target.value)}
                    className="w-full pr-9 pl-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="חזור על הסיסמה" />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? "יוצר חשבון..." : "התחל ניסיון חינם"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            יש לך כבר חשבון?{" "}
            <Link href="/login" className="text-green-600 font-semibold hover:underline">כניסה</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
