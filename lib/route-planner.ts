// Month-ahead schedule planner.
//
// Produces a draft plan (NOT inserted into the DB — the user reviews
// and approves) covering the next N days. The plan has two layers:
//
//   1) RECURRING — for each active/VIP customer with a frequency, drop
//      visits on the dates their cadence says they're due
//      (last_visit + cadence, last_visit + 2·cadence, …) up to the
//      horizon. Customers who already have a future job for a given
//      date are skipped on that date.
//
//   2) UNBOOKED — every customer who is active/VIP but has no frequency
//      and no future job, OR whose frequency-derived dates didn't fill
//      a working day to the user's daily revenue target. These are
//      packed onto the same days, ordered by nearest-neighbour from
//      the previous customer's location, until the per-day total
//      crosses the target. Surplus customers spill over to subsequent
//      working days.
//
// The output is a list of PlannedDay objects. Each day's jobs are in
// route order. The caller turns approved plan days into `jobs` rows.

import { haversineKm, nearestNeighbourOrder, type LatLng } from "./geocoding";

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
}

export interface PlanInput {
  customers: PlannerCustomer[];
  existingFutureJobs: ExistingFutureJob[];
  today: string;                  // ISO
  daysAhead: number;              // e.g. 30
  dailyTargetBeforeVat: number;   // e.g. 2500
  workDays: number[];             // 0 = Sun … 6 = Sat. Default [0,1,2,3,4]
  startHour: number;              // hour of first job, e.g. 9
  defaultDurationHours: number;   // e.g. 1.5
  homeBase: LatLng | null;        // user's start point for each day's route
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
    dailyTargetBeforeVat,
    workDays,
    startHour,
    defaultDurationHours,
    homeBase,
  } = input;

  // 1) Build the list of candidate working dates.
  const dates: string[] = [];
  for (let i = 0; i < daysAhead; i++) {
    const iso = addDaysISO(today, i);
    if (workDays.includes(dayOfWeekISO(iso))) dates.push(iso);
  }

  // 2) Index existing future jobs so we never schedule a customer on a
  //    date they already have a job booked. Match by customer_id when
  //    present, otherwise fall back to a normalised name.
  const norm = (s: string | null | undefined) =>
    (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const bookedById = new Map<string, Set<string>>();   // customerId → set of ISO dates
  const bookedByName = new Map<string, Set<string>>(); // norm(name) → set of ISO dates
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

  // 3) PHASE 1 — recurring layer. For each customer with a frequency,
  //    drop visits on every cadence step that lands inside the window.
  const days = new Map<string, PlannedDay>();
  for (const d of dates) days.set(d, { date: d, jobs: [], totalPrice: 0 });

  const unplaceable: PlanResult["unplaceable"] = [];
  const placedRecurringCustomerIds = new Set<string>();

  for (const c of customers) {
    if (c.status !== "active" && c.status !== "vip") continue;
    if (!c.frequency) continue;
    const cadence = cadenceDays(c.frequency);
    if (!cadence || cadence > daysAhead * 2) continue; // unrealistic cadence

    // Seed: next visit after lastVisit. If lastVisit is null, start at
    // today (treat as "due now"). Round to a working day.
    let next: string;
    if (c.lastVisit) {
      next = addDaysISO(c.lastVisit, Math.round(cadence));
      if (next < today) next = today;
    } else {
      next = today;
    }

    while (next < addDaysISO(today, daysAhead)) {
      // Roll forward to a working day.
      let probe = next;
      let safety = 0;
      while (!workDays.includes(dayOfWeekISO(probe)) && safety < 14) {
        probe = addDaysISO(probe, 1);
        safety++;
      }
      if (!days.has(probe)) break;
      if (!isBooked(c, probe)) {
        const day = days.get(probe)!;
        const price = pricePerVisit(c.monthlyPrice, c.frequency, c.priceMode);
        day.jobs.push({
          customerId: c.id,
          customerName: c.name,
          city: c.city ?? "",
          address: c.address ?? "",
          date: probe,
          time: "",   // filled in after ordering
          durationHours: defaultDurationHours,
          price,
          source: "recurring",
          lat: c.lat,
          lng: c.lng,
        });
        day.totalPrice += price;
        placedRecurringCustomerIds.add(c.id);
      }
      next = addDaysISO(probe, Math.round(cadence));
    }
  }

  // 4) PHASE 2 — unbooked layer. Customers without a frequency, or whose
  //    cadence didn't place them in any day (e.g. no last_visit, very
  //    long cadence), get distributed across working days, packed into
  //    days that haven't yet hit the daily target.
  const unbookedPool: PlannerCustomer[] = [];
  for (const c of customers) {
    if (c.status !== "active" && c.status !== "vip") continue;
    if (placedRecurringCustomerIds.has(c.id)) continue;
    // Skip if they already have ANY future job in the window — they're
    // covered.
    const hasFuture =
      (bookedById.get(c.id)?.size ?? 0) > 0 ||
      (bookedByName.get(norm(c.name))?.size ?? 0) > 0;
    if (hasFuture) continue;
    unbookedPool.push(c);
  }

  // Sort the pool so geocoded customers come first; ungeocoded land at
  // the end and use a city-fallback location (not implemented — we just
  // exclude them from NN routing within the day but still place them).
  unbookedPool.sort((a, b) => {
    const ga = a.lat != null && a.lng != null ? 1 : 0;
    const gb = b.lat != null && b.lng != null ? 1 : 0;
    return gb - ga;
  });

  // Greedy: walk days; for each day, keep adding the geographically-
  // closest unbooked customer until the day's totalPrice crosses the
  // target. The "previous location" starts as homeBase (or, if absent,
  // the first customer's own location).
  for (const date of dates) {
    const day = days.get(date)!;
    if (day.totalPrice >= dailyTargetBeforeVat) continue;

    let cursor: LatLng | null = homeBase;
    // If we already placed recurring jobs today, the last one becomes
    // the cursor for nearest-neighbour ordering. We'll re-order the
    // whole day at the end, but we still need a cursor for *picking*
    // the next unbooked candidate.
    const lastWithCoord = [...day.jobs].reverse().find(j => j.lat != null && j.lng != null);
    if (lastWithCoord) cursor = { lat: lastWithCoord.lat!, lng: lastWithCoord.lng! };

    while (day.totalPrice < dailyTargetBeforeVat && unbookedPool.length > 0) {
      // Pick the candidate nearest to the cursor (if cursor available).
      let pickIdx = 0;
      if (cursor) {
        let bestDist = Infinity;
        for (let i = 0; i < unbookedPool.length; i++) {
          const c = unbookedPool[i];
          if (c.lat == null || c.lng == null) continue;
          const d = haversineKm(cursor, { lat: c.lat, lng: c.lng });
          if (d < bestDist) {
            bestDist = d;
            pickIdx = i;
          }
        }
      }
      const c = unbookedPool.splice(pickIdx, 1)[0];
      const price = pricePerVisit(c.monthlyPrice, c.frequency, c.priceMode);
      day.jobs.push({
        customerId: c.id,
        customerName: c.name,
        city: c.city ?? "",
        address: c.address ?? "",
        date,
        time: "",
        durationHours: defaultDurationHours,
        price,
        source: "unbooked",
        lat: c.lat,
        lng: c.lng,
      });
      day.totalPrice += price;
      if (c.lat != null && c.lng != null) cursor = { lat: c.lat, lng: c.lng };
    }
  }

  // 5) Any unbooked customer still in the pool couldn't be placed
  //    (workdays filled, or pool exhausted on the target side). Report
  //    them so the UI can surface a note.
  for (const c of unbookedPool) {
    unplaceable.push({
      customerId: c.id,
      name: c.name,
      reason: "אין מקום בטווח לפי היעד היומי",
    });
  }

  // 6) Within each day, reorder jobs by nearest-neighbour starting from
  //    homeBase, then assign times (startHour, then +duration each).
  const orderedDays: PlannedDay[] = [];
  for (const date of dates) {
    const day = days.get(date)!;
    if (day.jobs.length === 0) continue;

    const withCoord = day.jobs.filter(j => j.lat != null && j.lng != null);
    const withoutCoord = day.jobs.filter(j => j.lat == null || j.lng == null);

    let ordered: PlannedJob[];
    if (withCoord.length > 0 && homeBase) {
      const items = withCoord.map(j => ({ job: j, coord: { lat: j.lat!, lng: j.lng! } }));
      ordered = nearestNeighbourOrder(items, homeBase).map(x => x.job);
    } else {
      ordered = withCoord;
    }
    // Append un-geocoded customers at the end of the day in name order.
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

  return { days: orderedDays, unplaceable };
}
