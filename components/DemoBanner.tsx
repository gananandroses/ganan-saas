"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles, X, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const DEMO_EMAIL = "demo@mygananpro.com";

// Renders a sticky banner across the top of every authenticated page when
// the user is logged into the shared demo account. Hides itself otherwise.
export default function DemoBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      const isDemo = user?.email === DEMO_EMAIL;
      setVisible(isDemo);
      // Sync the localStorage flag in case the user landed here via a saved
      // session rather than through /demo.
      try {
        if (isDemo) localStorage.setItem("is_demo_session", "1");
        else localStorage.removeItem("is_demo_session");
      } catch {}
    }
    check();

    // Re-check on auth changes (logout, switch account, etc.)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const isDemo = session?.user?.email === DEMO_EMAIL;
      setVisible(isDemo);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  async function exitDemo() {
    try { localStorage.removeItem("is_demo_session"); } catch {}
    await supabase.auth.signOut();
    window.location.href = "/register";
  }

  if (!visible || dismissed) return null;

  return (
    <div
      dir="rtl"
      className="sticky top-0 z-[60] bg-gradient-to-l from-amber-500 via-amber-400 to-yellow-400 text-amber-950 shadow-md"
    >
      <div className="max-w-screen-xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={15} className="text-amber-700 flex-shrink-0" />
          <p className="truncate font-semibold">
            <span className="hidden sm:inline">אתה במצב דמו · </span>
            <span>הנתונים שתוסיף יתאפסו הלילה</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={exitDemo}
            className="hidden sm:flex items-center gap-1 bg-amber-950 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-900 transition"
          >
            התחל את שלי
            <ArrowLeft size={12} />
          </button>
          <Link
            href="/register"
            className="sm:hidden bg-amber-950 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
          >
            הירשם
          </Link>
          <button
            onClick={() => setDismissed(true)}
            aria-label="הסתר באנר"
            className="text-amber-900 hover:text-amber-950 p-1"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
