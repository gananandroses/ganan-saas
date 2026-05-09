// Single source of truth for the gardener's "do my prices already include
// VAT?" preference. Stored in localStorage (keyed by user id) — no DB
// migration needed, persists across sessions, syncs via the supabase
// auth-state listener.
//
// Two values:
//   "include"  — prices entered ALREADY include VAT (toggle prefilled to "כולל מע״מ")
//   "before"   — prices entered are pre-VAT (toggle prefilled to "+ מע״מ")
//
// Default: "include" — matches how most Israeli small businesses think.
//
// Usage:
//   import { getDefaultVatMode, setDefaultVatMode } from "@/lib/vat-settings";
//   const mode = getDefaultVatMode(userId);  // "include" | "before"

export type VatMode = "include" | "before";

const KEY = "vat_default_mode";
const DEFAULT: VatMode = "include";

function storageKey(userId: string | null | undefined): string {
  return userId ? `${KEY}_${userId}` : KEY;
}

export function getDefaultVatMode(userId?: string | null): VatMode {
  if (typeof window === "undefined") return DEFAULT;
  const v = localStorage.getItem(storageKey(userId));
  return v === "before" || v === "include" ? v : DEFAULT;
}

export function setDefaultVatMode(userId: string | null | undefined, mode: VatMode): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(userId), mode);
}

// Convenience for legacy code that asks the boolean form.
// `priceBeforeVat = true` means the displayed price is pre-VAT (we'll add 18%).
export function getDefaultPriceBeforeVat(userId?: string | null): boolean {
  return getDefaultVatMode(userId) === "before";
}
