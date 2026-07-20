import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale } from "@/lib/locale";

// No URL-based locale routing (no /en/, /ar/ prefixes) — the app's 39
// route folders + middleware auth/subscription logic stay untouched.
// Locale is resolved from the `NEXT_LOCALE` cookie, synced from
// `user_profile.preferred_language` by components/LocaleSync.tsx and
// updated immediately by the Settings language picker.
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
