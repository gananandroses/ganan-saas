// ── Single source of truth for the VAT RATE and money conversions ──────────
//
// Every VAT calculation in the app must go through here so the rate is
// defined ONCE. Previously 0.18 / 1.18 were hard-coded in dozens of places
// and one screen (the pricer) even used 0.17 — producing quotes ~0.85% too
// low. Centralizing prevents that class of bug and makes a future rate
// change a one-line edit.
//
// Israel standard VAT is 18% (since 1/2025).

export const VAT_RATE = 0.18;
export const VAT_MULTIPLIER = 1 + VAT_RATE; // 1.18

/** Add VAT to a net (pre-VAT) amount. Not rounded — caller rounds once at the end. */
export function toGross(net: number): number {
  return net * VAT_MULTIPLIER;
}

/** Strip VAT from a gross (VAT-inclusive) amount. */
export function toNet(gross: number): number {
  return gross / VAT_MULTIPLIER;
}

/** The VAT portion contained inside a gross amount. */
export function vatOfGross(gross: number): number {
  return gross - gross / VAT_MULTIPLIER;
}

/** The VAT that would be added to a net amount. */
export function vatOfNet(net: number): number {
  return net * VAT_RATE;
}

// ── Job price helpers ──────────────────────────────────────────────────────
// A job stores `price` plus a `price_before_vat` flag. Canonical meaning
// (matches lib/vat-settings.ts): price_before_vat === true  → `price` is NET
// (pre-VAT); false → `price` is GROSS (VAT-inclusive).

/** Gross (VAT-inclusive) value of a job — what the customer actually pays. */
export function jobGross(price: number, beforeVat: boolean): number {
  if (!Number.isFinite(price)) return 0;
  return Math.round(beforeVat ? price * VAT_MULTIPLIER : price);
}

/** Net (pre-VAT) value of a job. */
export function jobNet(price: number, beforeVat: boolean): number {
  if (!Number.isFinite(price)) return 0;
  return Math.round(beforeVat ? price : price / VAT_MULTIPLIER);
}
