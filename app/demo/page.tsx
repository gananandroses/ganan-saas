"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Leaf } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

// Public demo credentials. By design — anyone visiting /demo signs in to
// the same shared demo account so they can click around without registering.
// The data is reset nightly via /api/cron/reset-demo.
const DEMO_EMAIL = "demo@mygananpro.com";
const DEMO_PASSWORD = "GananDemo2026!";

export default function DemoPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState("מתחברים לחשבון הדגמה...");

  useEffect(() => {
    let cancelled = false;
    async function go() {
      // 1. If we're already signed in as someone else, sign out first so
      //    they don't accidentally land in their own data with the demo banner.
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email && session.user.email !== DEMO_EMAIL) {
        await supabase.auth.signOut();
      }

      if (cancelled) return;
      setStep("מאמתים גישה...");

      // 2. Sign in to the shared demo account
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });

      if (cancelled) return;

      if (signInError) {
        setError(
          "המצב דמו לא זמין כרגע. נסה שוב בעוד רגע, או הירשם לחשבון אישי כדי להתחיל מיד."
        );
        return;
      }

      setStep("מעלים נתונים לדוגמה...");

      // Mark this client as a demo session so the banner shows everywhere
      try { localStorage.setItem("is_demo_session", "1"); } catch {}

      // Brief pause so the user notices what's happening
      await new Promise(r => setTimeout(r, 600));
      if (cancelled) return;

      router.replace("/dashboard");
    }
    go();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-6">
      <div className="bg-white border border-gray-100 rounded-3xl shadow-xl p-8 sm:p-10 w-full max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-md">
          <Leaf size={28} className="text-white" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">דמו של גנן Pro</h1>

        {error ? (
          <>
            <p className="text-sm text-red-600 leading-relaxed mb-5">{error}</p>
            <button
              onClick={() => router.push("/register")}
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold w-full transition"
            >
              הירשם לחשבון אישי
            </button>
            <button
              onClick={() => router.push("/landing")}
              className="mt-2 text-gray-500 hover:text-gray-700 text-sm w-full py-2"
            >
              חזרה לדף הבית
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              אתה נכנס למצב הדגמה. אפשר ללחוץ הכל, להוסיף ולמחוק — הנתונים מתאפסים בלילה.
            </p>
            <div className="flex items-center justify-center gap-2 text-gray-700">
              <Loader2 className="animate-spin text-green-600" size={18} />
              <span className="text-sm font-medium">{step}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
