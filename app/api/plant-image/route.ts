import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const latin = request.nextUrl.searchParams.get("latin") || "";
  const queryOverride = request.nextUrl.searchParams.get("q") || "";
  if (!latin && !queryOverride) return NextResponse.json({ url: null });

  // Strip cultivar name (e.g. 'Hass') → get just Genus species for iNaturalist
  const speciesName = latin
    .replace(/\s*'[^']*'/g, "")   // remove 'CultivarName'
    .replace(/ × /g, " ")
    .replace(/'/g, "")
    .trim()
    .split(/\s+/).slice(0, 2).join(" ");   // keep only first two words

  // Wikipedia short title: first 2 words of imageQuery, or species name
  // e.g. "Hass avocado dark purple..." → "Hass_avocado"
  //      "Medjool date palm fruit..." → "Medjool_date"
  const wikiShortTitle = queryOverride
    ? queryOverride.split(/\s+/).slice(0, 2).join("_")
    : speciesName.replace(/ /g, "_");

  // ── 1. Wikipedia with short variety title (best for named cultivars) ─────────
  if (queryOverride) {
    try {
      const wRes = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiShortTitle)}`,
        { next: { revalidate: 86400 } }
      );
      if (wRes.ok) {
        const wData = await wRes.json();
        const url = wData?.thumbnail?.source;
        if (url) return NextResponse.json({ url });
      }
    } catch { /* fall through */ }
  }

  // ── 2. iNaturalist with species name (no cultivar) ───────────────────────────
  try {
    const q = encodeURIComponent(speciesName || latin);
    const inatRes = await fetch(
      `https://api.inaturalist.org/v1/taxa?q=${q}&per_page=1&rank=species,genus`,
      { next: { revalidate: 86400 } }
    );
    if (inatRes.ok) {
      const inatData = await inatRes.json();
      const url = inatData?.results?.[0]?.default_photo?.medium_url;
      if (url) return NextResponse.json({ url });
    }
  } catch { /* fall through */ }

  // ── 3. Wikipedia fallback with full species name ─────────────────────────────
  try {
    const title = encodeURIComponent(speciesName.replace(/ /g, "_") || latin);
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
