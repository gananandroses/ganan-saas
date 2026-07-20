import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isLocale } from "@/lib/locale";

export async function POST(request: Request) {
  const { locale } = await request.json();
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "Unsupported locale" }, { status: 400 });
  }
  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return NextResponse.json({ ok: true });
}
