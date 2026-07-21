import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Cancels the caller's standing order (הוראת קבע) via Grow's
// updateDirectDebit API, then marks the local subscription row cancelled.
//
// Docs: https://developers.grow.business/reference/post_api-light-server-1-0-updatedirectdebit
//
// IMPORTANT: the exact field names below (transactionId / asmachta /
// transactionToken) come from Grow's public docs and have NOT yet been
// verified against a real sandbox payload. Before relying on this in
// production: trigger one sandbox charge, check the Vercel logs for the
// "[meshulam-webhook] raw payload" line, and confirm these three fields
// are present with these exact names — adjust app/api/meshulam-webhook
// if not.
//
// Required env (same as /api/create-payment):
//   MESHULAM_USER_ID, MESHULAM_API_BASE (optional, defaults to live)

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
  if (!userId) {
    return NextResponse.json({ error: "Payment not configured" }, { status: 500 });
  }

  // Service-role client to read/write the subscriptions row (RLS only
  // allows the owner to SELECT, not UPDATE).
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: sub } = await admin
    .from("subscriptions")
    .select("meshulam_dd_transaction_id, meshulam_asmachta, meshulam_transaction_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub?.meshulam_dd_transaction_id || !sub?.meshulam_asmachta || !sub?.meshulam_transaction_token) {
    return NextResponse.json(
      { error: "לא נמצאו פרטי הוראת קבע לביטול. פנה לתמיכה." },
      { status: 400 },
    );
  }

  const apiBase = process.env.MESHULAM_API_BASE || "https://secure.meshulam.co.il";

  const form = new FormData();
  form.append("userId", userId);
  form.append("transactionId", sub.meshulam_dd_transaction_id);
  form.append("asmachta", sub.meshulam_asmachta);
  form.append("transactionToken", sub.meshulam_transaction_token);
  form.append("changeStatus", "2"); // 2 = cancelled

  try {
    const res = await fetch(
      `${apiBase}/api/light/server/1.0/updateDirectDebit`,
      { method: "POST", body: form },
    );
    const json = await res.json().catch(() => null);

    if (json?.status === 1) {
      await admin
        .from("subscriptions")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      return NextResponse.json({ ok: true });
    }

    console.error("[cancel-subscription] Grow rejected:", JSON.stringify(json));
    return NextResponse.json(
      { error: json?.err?.message || "שגיאה בביטול המנוי" },
      { status: 502 },
    );
  } catch (err) {
    console.error("[cancel-subscription] Error:", err);
    return NextResponse.json({ error: "שגיאה בביטול המנוי" }, { status: 500 });
  }
}
