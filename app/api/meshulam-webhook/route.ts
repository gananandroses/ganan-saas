import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Meshulam sends a POST to this endpoint after a successful payment
// We update the subscription status in Supabase using the service role key

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Meshulam webhook payload fields (adjust field names based on your Meshulam plan type)
    // Common fields: transactionId, status, sum, custom1 (our user_id), paymentToken
    const {
      transactionId,
      status,          // "success" | "failed"
      sum,
      custom1: userId, // we passed user.id as custom1 when creating the payment
      paymentToken,    // Meshulam recurring token (for future charges)
    } = body;

    // Reject failed or unclear payments
    if (!userId || status !== "success") {
      console.warn("[meshulam-webhook] Rejected:", { status, userId });
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Set subscription active for 31 days from now
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 31);

    const { error } = await supabase
      .from("subscriptions")
      .upsert({
        user_id: userId,
        status: "active",
        current_period_end: periodEnd.toISOString(),
        meshulam_transaction_id: transactionId,
        meshulam_token: paymentToken || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (error) {
      console.error("[meshulam-webhook] DB error:", error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    console.log("[meshulam-webhook] Subscription activated for user:", userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[meshulam-webhook] Error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
