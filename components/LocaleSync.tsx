"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { supabase } from "@/lib/supabase/client";
import { isLocale } from "@/lib/locale";

// Runs once per authenticated session. `user_profile.preferred_language`
// is the source of truth (syncs across devices); the NEXT_LOCALE cookie
// is just a fast server-side read for app/layout.tsx. If they disagree
// (e.g. user logged in on a new device that still has the default
// cookie), push the DB value into the cookie and reload once.
export default function LocaleSync() {
  const currentLocale = useLocale();

  useEffect(() => {
    const RELOAD_GUARD_KEY = "locale_sync_reloaded";

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profile")
        .select("preferred_language")
        .eq("user_id", user.id)
        .maybeSingle();

      const preferred = profile?.preferred_language;
      if (!isLocale(preferred) || preferred === currentLocale) return;

      // Avoid a reload loop if the cookie write doesn't stick for some reason.
      if (sessionStorage.getItem(RELOAD_GUARD_KEY) === preferred) return;

      await fetch("/api/set-locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: preferred }),
      });
      sessionStorage.setItem(RELOAD_GUARD_KEY, preferred);
      window.location.reload();
    })();
  }, [currentLocale]);

  return null;
}
