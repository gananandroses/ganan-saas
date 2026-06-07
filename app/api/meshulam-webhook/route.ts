import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Grow (Meshulam) server-to-server webhook. Fires on every successful charge
// of the ₪99/mo standing order, and on recurring-charge failures.
//
// Docs: https://grow-il.readme.io/docs/overview-7
//
// Three cases we handle:
//   1. FIRST payment      — carries cField1 (our user id). Activate + store
//                           the standing-order id + payer email for matching
//                           the recurring charges that follow.
//   2. RECURRING charge   — 2nd month onward. Carries directDebitId /
//                           paymentSource="ריצת הוראת קבע" but NO cField1.
//                           Match by directDebitId, fall back to payer email,
//                           and extend the period.
//   3. FAILED recurring   — carries error_message / regular_payment_id.
//                           Mark the subscription past_due.
//
// We always return 200 quickly so Grow doesn't retry-storm; failures are
// logged. Webhooks must be enabled for the account by Grow support.

function periodEndFromNow(days = 31): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // Some Grow events arrive as form-encoded; parse that too.
    try {
      const text = await req.text();
      body = Object.fromEntries(new URLSearchParams(text));
    } catch {
      return NextResponse.json({ ok: false }, { status: 200 });
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const directDebitId =
    (body.directDebitId ?? body.regular_payment_id) as string | undefined;
  const payerEmail =
    (body.payerEmail ?? body.email) as string | undefined;
  const transactionId =
    (body.asmachta ?? body.transactionCode ?? body.transactionId) as string | undefined;
  const cField1 = body.cField1 as string | undefined;

  try {
    // ── Case 3: failed recurring charge ──────────────────────────────────
    if (body.error_message || (body.charges_attempts && !body.paymentSum)) {
      if (directDebitId) {
        await supabase
          .from("subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("meshulam_direct_debit_id", directDebitId);
      } else if (payerEmail) {
        await supabase
          .from("subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("payer_email", payerEmail.toLowerCase());
      }
      console.warn("[meshulam-webhook] recurring charge failed:", { directDebitId, payerEmail });
      return NextResponse.json({ ok: true });
    }

    // ── Case 1: first payment (has our user id) ──────────────────────────
    if (cField1) {
      const { error } = await supabase
        .from("subscriptions")
        .upsert({
          user_id: cField1,
          status: "active",
          current_period_end: periodEndFromNow(),
          meshulam_transaction_id: transactionId ?? null,
          meshulam_direct_debit_id: directDebitId ?? null,
          payer_email: payerEmail ? payerEmail.toLowerCase() : null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      if (error) {
        console.error("[meshulam-webhook] activate error:", error);
        return NextResponse.json({ ok: false }, { status: 500 });
      }
      console.log("[meshulam-webhook] activated user:", cField1);
      return NextResponse.json({ ok: true });
    }

    // ── Case 2: recurring success (no cField1) ───────────────────────────
    if (directDebitId || payerEmail) {
      const match = directDebitId
        ? { col: "meshulam_direct_debit_id", val: directDebitId }
        : { col: "payer_email", val: (payerEmail as string).toLowerCase() };
      const { data, error } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          current_period_end: periodEndFromNow(),
          meshulam_transaction_id: transactionId ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq(match.col, match.val)
        .select("user_id");
      if (error) {
        console.error("[meshulam-webhook] renew error:", error);
        return NextResponse.json({ ok: false }, { status: 500 });
      }
      if (!data || data.length === 0) {
        console.warn("[meshulam-webhook] recurring charge with no matching subscription:", match);
      } else {
        console.log("[meshulam-webhook] renewed:", data[0].user_id);
      }
      return NextResponse.json({ ok: true });
    }

    console.warn("[meshulam-webhook] unrecognized payload (no cField1/directDebitId/email)");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[meshulam-webhook] Error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
