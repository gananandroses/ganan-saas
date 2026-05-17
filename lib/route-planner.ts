// Month-ahead schedule planner — v2: city-first clustering, time budget.
//
// v1 walked days sequentially and picked the closest unbooked customer
// at each step. Symptom: customers from the same city got scattered
// (one alone on day 3, three more on day 14). v2 reverses the order —
// it groups unbooked customers BY CITY first, then assigns each city
// to a sequence of working days, packing each day to a HOURS budget
// (8h by default) rather than a revenue cap.
//
// Pipeline:
//   1) Recurring customers get placed on their cadence dates, with a
//      ±3 day slide if the natural date has no time left or is a
//      non-working day.
//   2) Unbooked customers are grouped by city. Largest city first,
//      we pack consecutive working days until the city is exhausted.
//      A small city (≤2 customers) can share a day with another small
//      city in the SAME region.
//   3) Anything that didn't fit is reported as unplaceable.
//   4) Within each day, jobs are re-ordered by nearest-neighbour from
//      homeBase, then times assigned sequentially from startHour.

import { haversineKm, nearestNeighbourOrder, type LatLng } from "./geocoding";
import { regionForCity, type Region } from "./israel-regions";

// ── Cadence helpers (kept local — same numbers used elsewhere) ──────────────

export function cadenceDays(freq: string | null | undefined): number {
  if (freq === "פעם בשבוע")       return 7;
  if (freq === "פעמיים בשבוע")    return 3.5;
  if (freq === "פעמיים בחודש")    return 15;
  if (freq === "פעם בחודש")       return 30;
  if (freq === "פעם בחודשיים")    return 60;
  if (freq === "פעם ב-3 חודשים") return 90;
  return 30;
}

export function visitsPerMonth(freq: string | null | undefined): number {
  if (freq === "פעם בשבוע")       return 4;
  if (freq === "פעמיים בשבוע")    return 8;
  if (freq === "פעמיים בחודש")    return 2;
  if (freq === "פעם בחודש")       return 1;
  if (freq === "פעם בחודשיים")    return 0.5;
  if (freq === "פעם ב-3 חודשים") return 1 / 3;
  return 1;
}

/** Price for a single visit. Mirrors the math used on /customers. */
export function pricePerVisit(
  price: number,
  freq: string | null | undefined,
  mode: "monthly" | "per_visit",
): number {
  if (mode === "per_visit") return price;
  const visits = visitsPerMonth(freq);
  return visits > 0 ? Math.round(price / visits) : price;
}

// ── ISO date helpers ────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return isoDate(d);
}
function dayOfWeekISO(iso: string): number {
  return new Date(iso + "T00:00:00").getDay();
}

const normCity = (s: string | null | undefined) =>
  (s ?? "").trim().toLowerCase().replace(/\s+/g, " ") || "לא ידוע";

// ── Types ───────────────────────────────────────────────────────────────────

export interface PlannerCustomer {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  monthlyPrice: number;
  priceMode: "monthly" | "per_visit";
  frequency: string | null;
  status: string | null;
  lastVisit: string | null;     // effective: max(completed job_date) || customers.last_visit
  lat: number | null;
  lng: number | null;
  durationHours: number;        // resolved from default_duration_hours or fallback
}

export interface ExistingFutureJob {
  customerId: string | null;
  customerName: string;
  jobDate: string;
}

export interface PlannedJob {
  customerId: string;
  customerName: string;
  city: string;
  address: string;
  date: string;            // ISO yyyy-mm-dd
  time: string;            // HH:MM
  durationHours: number;
  price: number;           // before VAT
  source: "recurring" | "unbooked";
  lat: number | null;
  lng: number | null;
}

export interface PlannedDay {
  date: string;
  jobs: PlannedJob[];
  totalPrice: number;       // sum of before-VAT prices
  totalHours: number;
}

export interface PlanInput {
  customers: PlannerCustomer[];
  existingFutureJobs: ExistingFutureJob[];
  today: string;                  // ISO
  daysAhead: number;              // e.g. 30
  dailyHoursBudget: number;       // e.g. 8
  workDays: number[];             // 0 = Sun … 6 = Sat. Default [0,1,2,3,4]
  startHour: number;              // hour of first job, e.g. 9
  homeBase: LatLng | null;        // user's start point for each day's route
  recurringFlexDays: number;      // how far we can slide a recurring date to fit
}

export interface PlanResult {
  days: PlannedDay[];
  unplaceable: { customerId: string; name: string; reason: string }[];
}

// ── The planner ─────────────────────────────────────────────────────────────

export function planMonth(input: PlanInput): PlanResult {
  const {
    customers,
    existingFutureJobs,
    today,
    daysAhead,
    dailyHoursBudget,
    workDays,
    startHour,
    homeBase,
    recurringFlexDays,
  } = input;

  // 1) Build the list of candidate working dates and a day map.
  const dates: string[] = [];
  for (let i = 0; i < daysAhead; i++) {
    const iso = addDaysISO(today, i);
    if (workDays.includes(dayOfWeekISO(iso))) dates.push(iso);
  }
  const days = new Map<string, PlannedDay>();
  for (const d of dates) days.set(d, { date: d, jobs: [], totalPrice: 0, totalHours: 0 });

  function dayHasCapacity(day: PlannedDay, addHours: number): boolean {
    return day.totalHours + addHours <= dailyHoursBudget + 0.001;
  }
  function placeOn(day: PlannedDay, j: PlannedJob) {
    day.jobs.push(j);
    day.totalHours += j.durationHours;
    day.totalPrice += j.price;
  }

  // 2) Index existing future jobs so we never schedule a customer on
  //    a date they already have a job booked.
  const norm = (s: string | null | undefined) =>
    (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const bookedById = new Map<string, Set<string>>();
  const bookedByName = new Map<string, Set<string>>();
  for (const j of existingFutureJobs) {
    if (j.customerId) {
      const s = bookedById.get(String(j.customerId)) ?? new Set<string>();
      s.add(j.jobDate);
      bookedById.set(String(j.customerId), s);
    }
    const n = norm(j.customerName);
    if (n) {
      const s = bookedByName.get(n) ?? new Set<string>();
      s.add(j.jobDate);
      bookedByName.set(n, s);
    }
  }
  function isBooked(cust: PlannerCustomer, date: string): boolean {
    if (bookedById.get(cust.id)?.has(date)) return true;
    const n = norm(cust.name);
    if (n && bookedByName.get(n)?.has(date)) return true;
    return false;
  }

  const unplaceable: PlanResult["unplaceable"] = [];
  const placedRecurringCustomerIds = new Set<string>();

  // 3) PHASE 1 — recurring layer.
  for (const c of customers) {
    if (c.status !== "active" && c.status !== "vip") continue;
    if (!c.frequency) continue;
    const cadence = cadenceDays(c.frequency);
    if (!cadence || cadence > daysAhead * 2) continue;

    let next: string;
    if (c.lastVisit) {
      next = addDaysISO(c.lastVisit, Math.round(cadence));
      if (next < today) next = today;
    } else {
      next = today;
    }
    const horizon = addDaysISO(today, daysAhead);

    while (next < horizon) {
      // Roll forward to a working day.
      let probe = next;
      let safety = 0;
      while (!workDays.includes(dayOfWeekISO(probe)) && safety < 14) {
        probe = addDaysISO(probe, 1);
        safety++;
      }
      if (probe >= horizon || !days.has(probe)) break;

      // Find a placement candidate within ±recurringFlexDays.
      let placed = false;
      const candidates = [probe];
      for (let d = 1; d <= recurringFlexDays; d++) {
        const fwd = addDaysISO(probe, d);
        const bwd = addDaysISO(probe, -d);
        if (days.has(fwd) && fwd >= today) candidates.push(fwd);
        if (days.has(bwd) && bwd >= today) candidates.push(bwd);
      }
      for (const date of candidates) {
        const day = days.get(date);
        if (!day) continue;
        if (isBooked(c, date)) continue;
        if (!dayHasCapacity(day, c.durationHours)) continue;
        const price = pricePerVisit(c.monthlyPrice, c.frequency, c.priceMode);
        placeOn(day, {
          customerId: c.id,
          customerName: c.name,
          city: c.city ?? "",
          address: c.address ?? "",
          date,
          time: "",
          durationHours: c.durationHours,
          price,
          source: "recurring",
          lat: c.lat,
          lng: c.lng,
        });
        placedRecurringCustomerIds.add(c.id);
        placed = true;
        break;
      }
      if (!placed) {
        // Couldn't fit this cadence step — skip it silently. Don't push
        // them onto unplaceable; later cadence steps may still fit.
      }
      next = addDaysISO(probe, Math.round(cadence));
    }
  }

  // 4) PHASE 2 — unbooked customers, grouped by city.
  const unbookedPool: PlannerCustomer[] = [];
  for (const c of customers) {
    if (c.status !== "active" && c.status !== "vip") continue;
    if (placedRecurringCustomerIds.has(c.id)) continue;
    const hasFuture =
      (bookedById.get(c.id)?.size ?? 0) > 0 ||
      (bookedByName.get(norm(c.name))?.size ?? 0) > 0;
    if (hasFuture) continue;
    unbookedPool.push(c);
  }

  // Group by normalized city; track each group's region for fallback
  // matching when a city has only 1-2 customers.
  const cityGroups = new Map<string, { city: string; region: Region; customers: PlannerCustomer[] }>();
  for (const c of unbookedPool) {
    const key = normCity(c.city);
    const reg = regionForCity(c.city ?? "");
    let g = cityGroups.get(key);
    if (!g) {
      g = { city: c.city ?? "לא ידוע", region: reg, customers: [] };
      cityGroups.set(key, g);
    }
    g.customers.push(c);
  }
  // Sort cities by size descending — largest first gets first pick of days.
  const cityList = Array.from(cityGroups.values()).sort(
    (a, b) => b.customers.length - a.customers.length,
  );

  // Helper: find a day that already has jobs in this city (preferred),
  // else any day in the same region, else any day, with capacity.
  function pickDayFor(cust: PlannerCustomer, fromIdx: number): { idx: number; day: PlannedDay } | null {
    // Tier 1: day with same-city neighbour
    for (let i = fromIdx; i < dates.length; i++) {
      const d = days.get(dates[i])!;
      if (!dayHasCapacity(d, cust.durationHours)) continue;
      const hasSameCity = d.jobs.some(j => normCity(j.city) === normCity(cust.city));
      if (hasSameCity) return { idx: i, day: d };
    }
    // Tier 2: day with same-region neighbour
    const reg = regionForCity(cust.city ?? "");
    for (let i = fromIdx; i < dates.length; i++) {
      const d = days.get(dates[i])!;
      if (!dayHasCapacity(d, cust.durationHours)) continue;
      const hasSameRegion = d.jobs.some(j => regionForCity(j.city) === reg);
      if (hasSameRegion) return { idx: i, day: d };
    }
    // Tier 3: any day with capacity (prefer emptier)
    let bestIdx = -1;
    let bestHours = Infinity;
    for (let i = fromIdx; i < dates.length; i++) {
      const d = days.get(dates[i])!;
      if (!dayHasCapacity(d, cust.durationHours)) continue;
      if (d.totalHours < bestHours) {
        bestIdx = i;
        bestHours = d.totalHours;
      }
    }
    if (bestIdx >= 0) return { idx: bestIdx, day: days.get(dates[bestIdx])! };
    return null;
  }

  // For each city group (largest first), place its customers. We walk
  // days from a moving cursor; small groups can spill into the same
  // day as another group from the same region thanks to pickDayFor.
  let cursorIdx = 0;
  for (const group of cityList) {
    for (const c of group.customers) {
      const pick = pickDayFor(c, cursorIdx);
      if (!pick) {
        unplaceable.push({ customerId: c.id, name: c.name, reason: "אין מקום בטווח (תקציב 8 שעות ביום)" });
        continue;
      }
      const price = pricePerVisit(c.monthlyPrice, c.frequency, c.priceMode);
      placeOn(pick.day, {
        customerId: c.id,
        customerName: c.name,
        city: c.city ?? "",
        address: c.address ?? "",
        date: pick.day.date,
        time: "",
        durationHours: c.durationHours,
        price,
        source: "unbooked",
        lat: c.lat,
        lng: c.lng,
      });
      // Don't bump cursorIdx aggressively — we want to revisit earlier
      // days that still have capacity. Only advance once the cursor's
      // own day is full enough to refuse a 1.5h slot.
      const cursorDay = days.get(dates[cursorIdx]);
      if (cursorDay && !dayHasCapacity(cursorDay, 1.5)) {
        cursorIdx++;
      }
    }
  }

  // 5) PHASE 3 — within each day, reorder by nearest-neighbour and
  //    assign times.
  const orderedDays: PlannedDay[] = [];
  for (const date of dates) {
    const day = days.get(date)!;
    if (day.jobs.length === 0) continue;

    const withCoord = day.jobs.filter(j => j.lat != null && j.lng != null);
    const withoutCoord = day.jobs.filter(j => j.lat == null || j.lng == null);

    // Anchor the NN walk: prefer homeBase, else fall back to the
    // geographic centroid of the day so the first stop is the most
    // central customer.
    let anchor: LatLng | null = homeBase;
    if (!anchor && withCoord.length > 0) {
      const sumLat = withCoord.reduce((s, j) => s + (j.lat as number), 0);
      const sumLng = withCoord.reduce((s, j) => s + (j.lng as number), 0);
      anchor = { lat: sumLat / withCoord.length, lng: sumLng / withCoord.length };
    }

    let ordered: PlannedJob[];
    if (withCoord.length > 0 && anchor) {
      const items = withCoord.map(j => ({ job: j, coord: { lat: j.lat!, lng: j.lng! } }));
      ordered = nearestNeighbourOrder(items, anchor).map(x => x.job);
    } else {
      ordered = withCoord;
    }
    withoutCoord.sort((a, b) => a.customerName.localeCompare(b.customerName, "he"));
    ordered = ordered.concat(withoutCoord);

    // Assign times sequentially from startHour.
    let hour = startHour;
    let minute = 0;
    for (const j of ordered) {
      j.time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      const stepMinutes = Math.round(j.durationHours * 60);
      minute += stepMinutes;
      while (minute >= 60) {
        hour += 1;
        minute -= 60;
      }
    }

    day.jobs = ordered;
    orderedDays.push(day);
  }
  // Silence the eslint "unused" warning while we keep haversineKm in
  // the import (used inside nearestNeighbourOrder; explicit re-use here
  // documents the intent if someone reads top-down).
  void haversineKm;

  return { days: orderedDays, unplaceable };
}
