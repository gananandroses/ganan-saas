import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pageCode = process.env.MESHULAM_PAGE_CODE;
  if (!pageCode) {
    return NextResponse.json({ error: "Payment not configured" }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://mygananpro.com";

  // Build Meshulam payment page URL with subscription parameters
  // Meshulam "דפי תשלום" API — recurring monthly charge
  const params = new URLSearchParams({
    sum: "99",
    description: "מנוי גנן Pro — ₪99 לחודש",
    successUrl: `${baseUrl}/subscribe/success`,
    cancelUrl: `${baseUrl}/subscribe`,
    webhookUrl: `${baseUrl}/api/meshulam-webhook`,
    clientEmail: user.email || "",
    clientName: user.user_metadata?.full_name || user.email || "",
    clientPhone: user.user_metadata?.phone || "",
    // Pass user_id as custom param so the webhook can identify the user
    custom1: user.id,
  });

  const paymentUrl = `https://secure.meshulam.co.il/paymentPages/page/${pageCode}?${params.toString()}`;

  return NextResponse.json({ url: paymentUrl });
}
