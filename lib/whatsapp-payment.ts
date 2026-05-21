// Shared helper for opening a WhatsApp window pre-filled with payment
// details. Triggered after a job is marked complete so the gardener
// can send the customer the bill in one tap.
//
// The browser can't actually send WhatsApp on the user's behalf —
// the best we can do is open https://api.whatsapp.com/send with the
// message pre-filled, and the user clicks "send" in their WhatsApp.
// On mobile this is one extra tap; on desktop it opens WhatsApp Web.
//
// Silent failure modes (we don't throw — the job completion already
// succeeded by the time this runs, and we don't want to scare the
// user with a dialog):
//   - Customer has no phone on file → skip
//   - Job price was 0 or negative → skip (nothing to charge for)
//   - User_profile fetch failed → still send, just without payment
//                                  details block

import type { SupabaseClient } from "@supabase/supabase-js";

const VAT_RATE = 1.18;

export interface PaymentReminderInput {
  userId: string;
  customerId: string | null;
  customerName: string;
  /** The price stored on the job row. */
  price: number;
  /** True when `price` is BEFORE VAT (needs to be grossed up for the
   *  total) or false when it already includes VAT. */
  priceBeforeVat: boolean;
  /** Short description for the message — usually the job type or
   *  "עבודת גינון" + address. */
  jobDescription: string;
}

/** Build the message that goes into WhatsApp. Exported so tests
 *  (and the upcoming settings preview) can render it without
 *  triggering the window.open side-effect. */
export function buildPaymentReminderMessage(opts: {
  customerName: string;
  amountNet: number;
  amountGross: number;
  jobDescription: string;
  paymentDetailsBlock: string;
}): string {
  const netStr = Math.round(opts.amountNet).toLocaleString();
  const grossStr = Math.round(opts.amountGross).toLocaleString();
  const same = opts.amountNet === opts.amountGross;
  // If price was already with-VAT (no separate VAT to show), keep
  // the message short — just "₪X". Otherwise spell out "₪net + מע"מ"
  // so the customer sees both numbers and the total in parens.
  const amountLine = same
    ? `₪${netStr}`
    : `₪${netStr} + מע"מ (סה״כ ₪${grossStr})`;
  return [
    `שלום ${opts.customerName}, סיימתי את העבודה (${opts.jobDescription}).`,
    `סכום לתשלום: ${amountLine}.`,
    `אשמח לסידור התשלום 🌿${opts.paymentDetailsBlock}`,
  ].join("\n");
}

/** Build the "אמצעי תשלום: ..." block from a user_profile row.
 *  Returns "" when there's nothing configured — so an empty profile
 *  produces a message that simply asks for payment without listing
 *  methods. */
export function buildPaymentDetailsBlockFromProfile(p: {
  bit_phone?: string | null;
  paybox_phone?: string | null;
  bank_name?: string | null;
  bank_branch?: string | null;
  bank_account?: string | null;
} | null | undefined): string {
  if (!p) return "";
  const lines: string[] = [];
  if (p.bit_phone) lines.push(`• Bit: ${p.bit_phone}`);
  if (p.paybox_phone) lines.push(`• PayBox: ${p.paybox_phone}`);
  if (p.bank_name || p.bank_account) {
    const bankLine = `• העברה בנקאית: ${p.bank_name ?? ""}${p.bank_branch ? ` סניף ${p.bank_branch}` : ""}${p.bank_account ? ` חשבון ${p.bank_account}` : ""}`.trim();
    lines.push(bankLine);
  }
  if (lines.length === 0) return "";
  return "\n\nאמצעי תשלום:\n" + lines.join("\n");
}

/** Normalise a stored Israeli phone string to E.164 (972...). Returns
 *  empty string if the input has no usable digits. */
function normalisePhoneIL(raw: string | null | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  if (digits.length === 9) return "972" + digits;
  return digits;
}

/**
 * Build the message and open WhatsApp. No-ops on the server (no
 * window). Returns true if the WA window was actually opened, false
 * otherwise — caller can show a "no phone on file" toast off of that.
 */
export async function openPaymentReminderForCompletedJob(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  input: PaymentReminderInput,
): Promise<{ opened: boolean; reason?: string }> {
  if (typeof window === "undefined") return { opened: false, reason: "ssr" };
  if (!Number.isFinite(input.price) || input.price <= 0) {
    return { opened: false, reason: "no_price" };
  }
  if (!input.customerId) return { opened: false, reason: "no_customer_id" };

  // Fetch customer phone + user payment settings in parallel.
  const [custRes, profRes] = await Promise.all([
    supabase
      .from("customers")
      .select("phone")
      .eq("id", input.customerId)
      .eq("user_id", input.userId)
      .maybeSingle(),
    supabase
      .from("user_profile")
      .select("bit_phone, paybox_phone, bank_name, bank_branch, bank_account")
      .eq("user_id", input.userId)
      .maybeSingle(),
  ]);
  const phone = normalisePhoneIL(custRes.data?.phone);
  if (!phone) return { opened: false, reason: "no_phone" };

  const amountNet = input.priceBeforeVat
    ? Math.round(input.price)
    : Math.round(input.price / VAT_RATE);
  const amountGross = input.priceBeforeVat
    ? Math.round(input.price * VAT_RATE)
    : Math.round(input.price);

  const message = buildPaymentReminderMessage({
    customerName: input.customerName,
    amountNet,
    amountGross,
    jobDescription: input.jobDescription,
    paymentDetailsBlock: buildPaymentDetailsBlockFromProfile(profRes.data),
  });

  const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
  return { opened: true };
}
