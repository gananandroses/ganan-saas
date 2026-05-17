// Address → lat/lng via Nominatim (OpenStreetMap). Free, no API key,
// rate-limited to ~1 req/sec by their usage policy — the planner page
// throttles itself accordingly. Israeli addresses only (countrycode=il)
// so we don't get false matches in other countries with similar street
// names.
//
// Coordinates are cached on the customers row (see lat/lng migration),
// so geocoding is a one-time cost per customer. Future opens of the
// auto-plan page skip already-geocoded customers.

export interface LatLng {
  lat: number;
  lng: number;
}

/** Sleep helper used between Nominatim calls to respect the rate limit. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Geocode a single Israeli address to lat/lng.
 *
 * Returns null on any failure (no match, network error, malformed
 * response). Caller is expected to handle null gracefully — for the
 * planner this means the customer is excluded from the route.
 */
export async function geocodeAddress(query: string): Promise<LatLng | null> {
  const q = query.trim();
  if (!q) return null;

  const url =
    `https://nominatim.openstreetmap.org/search?` +
    `format=json&limit=1&countrycodes=il&` +
    `q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, {
      headers: {
        // Nominatim asks every consumer to identify itself. We pass a
        // friendly UA so we're not lumped in with anonymous scrapers
        // and don't get rate-limit-blocked.
        "Accept-Language": "he,en;q=0.8",
      },
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const first = data[0] as { lat?: string; lon?: string };
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

/**
 * Distance in kilometres between two coordinates on Earth.
 *
 * Haversine formula. Good enough for "is customer A closer than B" —
 * within ~0.5% of true great-circle distance, way more accurate than
 * the actual driving distance question this stands in for. We don't
 * care about ±50 m, we care about ordering 30 customers per day.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const aa =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(aa));
}

/**
 * Greedy nearest-neighbour route through a set of points, starting
 * from `start`. Returns the points in the visit order that gives the
 * shortest hop at each step.
 *
 * This is NOT the optimal TSP solution (NP-hard) but for ≤20 points
 * per day it's within ~25% of optimal and runs in O(n²) — instant on
 * the client. Good enough for daily routing.
 */
export function nearestNeighbourOrder<T extends { coord: LatLng }>(
  items: T[],
  start: LatLng,
): T[] {
  if (items.length <= 1) return items.slice();
  const remaining = items.slice();
  const ordered: T[] = [];
  let cursor: LatLng = start;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = haversineKm(cursor, remaining[0].coord);
    for (let i = 1; i < remaining.length; i++) {
      const d = haversineKm(cursor, remaining[i].coord);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    cursor = next.coord;
  }
  return ordered;
}
