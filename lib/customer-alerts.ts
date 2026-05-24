// Shared customer-alert + status calculators.
//
// Three consumers share these:
//   • Dashboard hero / bell dropdown → "מי שצריך תיאום" (getUnbookedCustomers)
//   • Inactive-customer flag         → "מי שקט 30+ ימים"   (getInactiveCustomers)
//   • Customer status overview page  → תמונה מלאה לכל active/VIP (getCustomerStatusList)
//
// Keeping all of this in one file means the "who's covered / who isn't"
// definition doesn't drift between the alert and the status view.

export interface JobRow {
  id: string;
  customer_id: string | null;
  customer_name: string;
  job_date: string | null;
  status: string;
}

export interface CustomerRow {
  id: string;
  name: string | null;
  city?: string | null;
  phone?: string | null;
  last_visit: string | null;
  frequency: string | null;
  status: string | null;
}

export interface UnbookedCustomer {
  id: string;
  name: string;
  daysOverdue: number;
  futureCount: number;       // how many future visits ARE booked (may be 0)
  // Enriched fields for the bell-dropdown sub-grouped renderer.
  // All optional — older callers that don't need them ignore the fields.
  city?: string | null;
  phone?: string | null;
  frequency?: string | null;
  nextExpectedISO?: string | null;  // calculated; null when no last_visit
}

export interface InactiveCustomer {
  id: string;
  name: string;
  daysSinceVisit: number;
}

const INACTIVE_DAYS = 30;

function daysSince(iso: string | null | undefined): number {
  if (!iso) return Infinity;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function cadenceDays(freq: string | null | undefined): number {
  if (freq === "פעם בשבוע")       return 7;
  if (freq === "פעמיים בשבוע")    return 3.5;
  if (freq === "פעמיים בחודש")    return 15;
  if (freq === "פעם בחודש")       return 30;
  if (freq === "פעם בחודשיים")    return 60;
  if (freq === "פעם ב-3 חודשים") return 90;
  return 30;
}

/**
 * How many future visits SHOULD be on the calendar for a customer to
 * feel "covered". Tight cadences need more in the queue so the user
 * doesn't have to plan one visit at a time. Loose cadences (monthly+)
 * are fine with just one upcoming visit booked.
 */
function minFutureNeeded(freq: string | null | undefined): number {
  return cadenceDays(freq) < 30 ? 2 : 1;
}

// ── Internal: index all jobs into per-customer maps ────────────────────────
// Single pass over jobs that produces:
//   - lastDoneById/lastDoneByName → max(completed.job_date)
//   - futureCountById/futureCountByName → number of future non-cancelled jobs
//   - futureDatesById/futureDatesByName → list of those future dates (sorted)

interface JobIndex {
  lastDoneById: Map<string, string>;
  lastDoneByName: Map<string, string>;
  futureCountById: Map<string, number>;
  futureCountByName: Map<string, number>;
  futureDatesById: Map<string, string[]>;
  futureDatesByName: Map<string, string[]>;
}

function indexJobs(jobs: JobRow[], today: string): JobIndex {
  const idx: JobIndex = {
    lastDoneById: new Map(),
    lastDoneByName: new Map(),
    futureCountById: new Map(),
    futureCountByName: new Map(),
    futureDatesById: new Map(),
    futureDatesByName: new Map(),
  };
  for (const j of jobs) {
    if (j.status === "completed" && j.job_date) {
      if (j.customer_id) {
        const cur = idx.lastDoneById.get(String(j.customer_id));
        if (!cur || j.job_date > cur) idx.lastDoneById.set(String(j.customer_id), j.job_date);
      }
      const n = norm(j.customer_name);
      if (n) {
        const cur = idx.lastDoneByName.get(n);
        if (!cur || j.job_date > cur) idx.lastDoneByName.set(n, j.job_date);
      }
    }
    if (j.status !== "completed" && j.status !== "cancelled" && j.job_date && j.job_date >= today) {
      if (j.customer_id) {
        const cid = String(j.customer_id);
        idx.futureCountById.set(cid, (idx.futureCountById.get(cid) ?? 0) + 1);
        const arr = idx.futureDatesById.get(cid) ?? [];
        arr.push(j.job_date);
        idx.futureDatesById.set(cid, arr);
      }
      const n = norm(j.customer_name);
      if (n) {
        idx.futureCountByName.set(n, (idx.futureCountByName.get(n) ?? 0) + 1);
        const arr = idx.futureDatesByName.get(n) ?? [];
        arr.push(j.job_date);
        idx.futureDatesByName.set(n, arr);
      }
    }
  }
  // Sort future dates ascending so the "next scheduled" is at [0].
  for (const arr of idx.futureDatesById.values()) arr.sort();
  for (const arr of idx.futureDatesByName.values()) arr.sort();
  return idx;
}

/**
 * Customers who need their next visit booked.
 *
 * v2 behaviour (the v1 behaviour was: skip if ANY future visit booked):
 * we now require a MINIMUM number of future visits per cadence. Weekly
 * customers need 2 ahead — anything less surfaces an alert. Monthly+
 * customers need 1 ahead. This way the user isn't always one visit
 * away from "no plan" and gets nudged to think 2 visits forward.
 *
 * Lead-time gate still applies: a customer whose next expected visit
 * is more than 7 days (or 14 for monthly+) in the future doesn't
 * surface yet.
 */
export function getUnbookedCustomers(
  jobs: JobRow[],
  customers: CustomerRow[],
  today: string,
): UnbookedCustomer[] {
  const idx = indexJobs(jobs, today);
  const todayDate = new Date(today + "T00:00:00").getTime();
  const out: UnbookedCustomer[] = [];

  for (const c of customers) {
    if (c.status !== "active" && c.status !== "vip") continue;
    const cid = String(c.id);
    const nName = norm(c.name);

    const futureCount =
      (idx.futureCountById.get(cid) ?? 0) || (nName ? idx.futureCountByName.get(nName) ?? 0 : 0);
    const minNeeded = minFutureNeeded(c.frequency);
    if (futureCount >= minNeeded) continue;     // sufficient pipeline — skip alert

    const lastFromJobs = idx.lastDoneById.get(cid) ?? (nName ? idx.lastDoneByName.get(nName) : null);
    const effectiveLast = lastFromJobs ?? c.last_visit ?? null;

    if (!effectiveLast) {
      out.push({
        id: cid,
        name: c.name ?? "",
        daysOverdue: 9999,
        futureCount,
        city: c.city ?? null,
        phone: c.phone ?? null,
        frequency: c.frequency,
        nextExpectedISO: null,
      });
      continue;
    }

    const cadence = cadenceDays(c.frequency);
    // Reference date for "next expected visit" — if there's already a
    // future booking, the NEXT expected one is one cadence after THAT,
    // not after the last completed. Without this offset a weekly
    // customer with one future visit booked would still look "overdue"
    // just because today > lastVisit + 7.
    const futureDates = idx.futureDatesById.get(cid) ?? (nName ? idx.futureDatesByName.get(nName) ?? [] : []);
    const referenceISO = futureDates.length > 0 ? futureDates[futureDates.length - 1] : effectiveLast;
    const expected = new Date(referenceISO + "T00:00:00");
    expected.setDate(expected.getDate() + Math.round(cadence));
    const expectedISO = `${expected.getFullYear()}-${String(expected.getMonth() + 1).padStart(2, "0")}-${String(expected.getDate()).padStart(2, "0")}`;
    const daysOverdue = Math.floor((todayDate - expected.getTime()) / (1000 * 60 * 60 * 24));
    // No lead-time gate. The user explicitly asked for the bell to
    // match the status page 1:1 — if /customers/status shows the row
    // as yellow (needs booking but still has time), it should also
    // surface in the bell. Previously a 7/14-day lead window hid
    // distant customers, creating a "the two views disagree" bug
    // where עצמון due in 8 days was yellow on the status page but
    // absent from the bell.
    out.push({
      id: cid,
      name: c.name ?? "",
      daysOverdue,
      futureCount,
      city: c.city ?? null,
      phone: c.phone ?? null,
      frequency: c.frequency,
      nextExpectedISO: expectedISO,
    });
  }

  out.sort((a, b) => b.daysOverdue - a.daysOverdue);
  return out;
}

/** Active/VIP customers silent for 30+ days. Sorted most-silent first. */
export function getInactiveCustomers(customers: CustomerRow[]): InactiveCustomer[] {
  return customers
    .filter(c => (c.status === "active" || c.status === "vip") && c.last_visit && daysSince(c.last_visit) >= INACTIVE_DAYS)
    .map(c => ({
      id: String(c.id),
      name: c.name ?? "",
      daysSinceVisit: daysSince(c.last_visit),
    }))
    .sort((a, b) => b.daysSinceVisit - a.daysSinceVisit);
}

// ─────────────────────────────────────────────────────────────────────────
// Customer status overview — comprehensive list for /customers/status.
// One entry per active/VIP customer, regardless of whether anything is
// "wrong". Each row carries enough info to render a colour-coded card.
// ─────────────────────────────────────────────────────────────────────────

export type CustomerStatusColor = "green" | "yellow" | "red" | "gray";

export interface CustomerStatusEntry {
  id: string;
  name: string;
  city: string | null;
  frequency: string | null;
  status: string | null;
  lastVisit: string | null;       // effective: max(completed.job_date) || customers.last_visit
  futureCount: number;            // total future non-cancelled jobs
  nextScheduled: string | null;   // earliest future job_date
  nextExpected: string | null;    // calculated: lastVisit + cadence (regardless of bookings)
  daysToNextExpected: number | null;  // signed: negative = overdue
  colour: CustomerStatusColor;
  /** Human-readable reason for the colour. Used as the row's subtitle. */
  subtitle: string;
}

function isoOffset(fromISO: string, days: number): string {
  const d = new Date(fromISO + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getCustomerStatusList(
  jobs: JobRow[],
  customers: CustomerRow[],
  today: string,
): CustomerStatusEntry[] {
  const idx = indexJobs(jobs, today);
  const todayDate = new Date(today + "T00:00:00").getTime();

  const out: CustomerStatusEntry[] = [];

  for (const c of customers) {
    if (c.status !== "active" && c.status !== "vip") continue;

    const cid = String(c.id);
    const nName = norm(c.name);

    const futureDates =
      idx.futureDatesById.get(cid) ?? (nName ? idx.futureDatesByName.get(nName) ?? [] : []);
    const futureCount = futureDates.length;
    const nextScheduled = futureCount > 0 ? futureDates[0] : null;

    const lastFromJobs = idx.lastDoneById.get(cid) ?? (nName ? idx.lastDoneByName.get(nName) : null);
    const lastVisit = lastFromJobs ?? c.last_visit ?? null;

    const hasFrequency = !!c.frequency;
    const cadence = hasFrequency ? cadenceDays(c.frequency) : 0;
    const minNeeded = minFutureNeeded(c.frequency);

    // nextExpected = lastVisit + cadence (or based on latest future booking
    // if there's already one queued — so the "next one after that").
    let nextExpected: string | null = null;
    let daysToNextExpected: number | null = null;
    if (hasFrequency) {
      const reference = futureCount > 0 ? futureDates[futureCount - 1] : lastVisit;
      if (reference) {
        nextExpected = isoOffset(reference, Math.round(cadence));
        const expDate = new Date(nextExpected + "T00:00:00").getTime();
        daysToNextExpected = Math.floor((expDate - todayDate) / (1000 * 60 * 60 * 24));
      }
    }

    // Colour decision:
    //   gray   → missing frequency OR missing lastVisit (can't compute)
    //   green  → enough future bookings on the calendar
    //   red    → not enough AND we're past / within 3 days of the next expected
    //   yellow → not enough but there's still time
    let colour: CustomerStatusColor;
    let subtitle: string;
    if (!hasFrequency) {
      colour = "gray";
      subtitle = "לא הוגדרה תדירות";
    } else if (!lastVisit) {
      colour = "gray";
      subtitle = "אין ביקור קודם רשום";
    } else if (futureCount >= minNeeded) {
      colour = "green";
      const nextStr = nextScheduled ? fmtDate(nextScheduled) : "—";
      subtitle = futureCount === 1
        ? `הבא: ${nextStr} ✓ משוריין`
        : `${futureCount} ביקורים מתוזמנים · הבא ${nextStr}`;
    } else if (daysToNextExpected !== null && daysToNextExpected <= 3) {
      colour = "red";
      const overdue = daysToNextExpected < 0;
      subtitle = overdue
        ? `באיחור ${Math.abs(daysToNextExpected)} ימים — צריך לשריין מיד`
        : daysToNextExpected === 0
          ? "צריך לשריין היום"
          : `צריך לשריין תוך ${daysToNextExpected} ימים`;
    } else {
      colour = "yellow";
      const exp = nextExpected ? fmtDate(nextExpected) : "—";
      const cnt = futureCount > 0 ? ` (יש ${futureCount} משוריין)` : "";
      subtitle = `הבא צפוי: ${exp} — בעוד ${daysToNextExpected} ימים${cnt}`;
    }

    out.push({
      id: cid,
      name: c.name ?? "",
      city: c.city ?? null,
      frequency: c.frequency,
      status: c.status,
      lastVisit,
      futureCount,
      nextScheduled,
      nextExpected,
      daysToNextExpected,
      colour,
      subtitle,
    });
  }

  // Sort by urgency: red → yellow → gray → green. Within colour by
  // daysToNextExpected ascending (most urgent first).
  const order: Record<CustomerStatusColor, number> = { red: 0, yellow: 1, gray: 2, green: 3 };
  out.sort((a, b) => {
    if (a.colour !== b.colour) return order[a.colour] - order[b.colour];
    const ad = a.daysToNextExpected ?? 999999;
    const bd = b.daysToNextExpected ?? 999999;
    return ad - bd;
  });
  return out;
}

function fmtDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)}/${Number(m)}`;
}
