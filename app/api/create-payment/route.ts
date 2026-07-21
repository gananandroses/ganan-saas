import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Creates a Grow (Meshulam) payment process via the Light Server API and
// returns the hosted payment-page URL the client should redirect to.
//
// Docs: https://grow-il.readme.io/reference/post_api-light-server-1-0-createpaymentprocess-1
//
// Required env:
//   MESHULAM_USER_ID   – business identifier from Grow onboarding
//   MESHULAM_PAGE_CODE  – payment-page code from Grow (the standing-order page)
//   NEXT_PUBLIC_BASE_URL – e.g. https://mygananpro.com
// Optional:
//   MESHULAM_API_BASE   – override for sandbox testing
//       (https://sandbox.meshulam.co.il). Defaults to live.

const PLAN_SUM = 99;

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
            cookieStore.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = process.env.MESHULAM_USER_ID;
  const pageCode = process.env.MESHULAM_PAGE_CODE;
  if (!userId || !pageCode) {
    return NextResponse.json({ error: "Payment not configured" }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://mygananpro.com";
  const apiBase = process.env.MESHULAM_API_BASE || "https://secure.meshulam.co.il";

  // Best-effort payer details from signup metadata. Grow requires a 2-word
  // full name + a valid IL mobile; the customer can still correct them on
  // the payment page. We fall back to neutral placeholders so the request
  // isn't rejected outright when metadata is missing.
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName = String(meta.full_name || "").trim() || "לקוח גנןPro";
  const safeFullName = fullName.split(/\s+/).length >= 2 ? fullName : `${fullName} —`;
  const phone = String(meta.phone || "").replace(/\D/g, "");

  // multipart/form-data per the Light API spec.
  const form = new FormData();
  form.append("userId", userId);
  form.append("pageCode", pageCode);
  form.append("sum", String(PLAN_SUM));
  form.append("description", "מנוי גנן Pro — מנוי חודשי");
  form.append("chargeType", "1");
  form.append("successUrl", `${baseUrl}/subscribe/success`);
  // Points at a small bridge page (not directly at /subscribe) because the
  // payment page is now shown in an iframe on /subscribe — see
  // app/subscribe/cancelled/page.tsx for why.
  form.append("cancelUrl", `${baseUrl}/subscribe/cancelled`);
  // Server-to-server webhook — fires on every successful charge.
  form.append("notifyUrl", `${baseUrl}/api/meshulam-webhook`);
  // cField1 carries OUR Supabase user id so the first-payment webhook can
  // identify exactly who paid.
  form.append("cField1", user.id);
  form.append("pageField[fullName]", safeFullName);
  if (phone) form.append("pageField[phone]", phone);
  if (user.email) form.append("pageField[email]", user.email);

  try {
    const res = await fetch(
      `${apiBase}/api/light/server/1.0/createPaymentProcess`,
      { method: "POST", body: form },
    );
    const json = await res.json().catch(() => null);

    // Grow returns { status: 1, data: { url, processId, processToken } } on
    // success. Anything else is an error we surface (without leaking internals).
    const url = json?.data?.url as string | undefined;
    if (json?.status === 1 && url) {
      return NextResponse.json({ url });
    }
    console.error("[create-payment] Grow rejected:", JSON.stringify(json));
    return NextResponse.json(
      { error: json?.err?.message || "שגיאה ביצירת תשלום" },
      { status: 502 },
    );
  } catch (err) {
    console.error("[create-payment] Error:", err);
    return NextResponse.json({ error: "שגיאה ביצירת תשלום" }, { status: 500 });
  }
}
