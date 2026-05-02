"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const PUBLIC_PATHS = ["/login", "/register", "/", "/landing", "/auth/callback"];

  useEffect(() => {
    if (PUBLIC_PATHS.includes(pathname)) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
        router.replace("/login");
      }
    });

    // Also check immediately on mount
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error || !session) {
        router.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router, pathname]);

  return <>{children}</>;
}
