"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const PUBLIC_PATHS = ["/login", "/register", "/", "/landing", "/demo", "/auth/callback", "/terms", "/privacy"];

  useEffect(() => {
    if (PUBLIC_PATHS.includes(pathname)) return;
    // /tour and any sub-route are public (read-only marketing tour)
    if (pathname === "/tour" || pathname.startsWith("/tour/")) return;
    // Public quote share links — no auth required
    if (pathname.startsWith("/q/")) return;

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
