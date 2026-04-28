import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const latin = request.nextUrl.searchParams.get("latin") || "";
  const queryOverride = request.nextUrl.searchParams.get("q") || "";
  if (!latin && !queryOverride) return NextResponse.json({ url: null });

  // Use override query if provided, otherwise use Latin name
  const clean = (queryOverride || latin).replace(/ × /g, " ").replace(/'/g, "").trim();

  try {
    // 1. Try iNaturalist — shows full plant photos
    const q = encodeURIComponent(clean);
    const inatRes = await fetch(
      `https://api.inaturalist.org/v1/taxa?q=${q}&per_page=1&rank=species,genus`,
      { next: { revalidate: 86400 } } // cache 24h
    );
    if (inatRes.ok) {
      const inatData = await inatRes.json();
      const url = inatData?.results?.[0]?.default_photo?.medium_url;
      if (url) return NextResponse.json({ url });
    }
  } catch { /* fall through */ }

  try {
    // 2. Fallback: Wikipedia
    const title = encodeURIComponent(clean.replace(/ /g, "_"));
    const wRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`,
      { next: { revalidate: 86400 } }
    );
    if (wRes.ok) {
      const wData = await wRes.json();
      const url = wData?.thumbnail?.source;
      if (url) return NextResponse.json({ url });
    }
  } catch { /* fall through */ }

  return NextResponse.json({ url: null });
}
