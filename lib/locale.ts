// Single source of truth for supported locales — used by i18n/request.ts,
// app/layout.tsx, the /api/set-locale route, and the Settings language
// picker. Keep this list in sync with messages/*.json and the
// `preferred_language` CHECK constraint in Supabase.

export const SUPPORTED_LOCALES = ["he", "en", "ar", "ru"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "he";

export const RTL_LOCALES: readonly Locale[] = ["he", "ar"];

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function getDirection(locale: Locale): "rtl" | "ltr" {
  return RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
}

export const LOCALE_LABELS: Record<Locale, string> = {
  he: "עברית",
  en: "English",
  ar: "العربية",
  ru: "Русский",
};

// Matches next-intl's default formatting fallback + existing
// toLocaleString("he-IL") usage across the app.
export const LOCALE_TAGS: Record<Locale, string> = {
  he: "he-IL",
  en: "en-US",
  ar: "ar",
  ru: "ru-RU",
};
