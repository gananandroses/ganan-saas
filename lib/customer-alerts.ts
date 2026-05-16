// Shared customer-alert calculators.
//
// Both the dashboard hero and the global bell-dropdown need to know:
//   • which customers need rebooking soon based on their frequency
//   • which customers have been silent for 30+ days
// Keeping the logic in one place avoids the two views drifting apart.

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
  last_visit: string | null;
  frequency: string | null;
  status: string | null;
}

export interface UnbookedCustomer {
  id: string;
  name: string;
  daysOverdue: number;
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

function cadenceDays(freq: string | null): number {
  if (freq === "פעם בשבוע")       return 7;
  if (freq === "פעמיים בשבוע")    return 3.5;
  if (freq === "פעמיים בחודש")    return 15;
  if (freq === "פעם בחודש")       return 30;
  if (freq === "פעם בחודשיים")    return 60;
  if (freq === "פעם ב-3 חודשים") return 90;
  return 30;
}

/**
 * Customers whose next visit is due (or already overdue) and who have
 * no future non-cancelled job booked. Sorted most-overdue first.
 *
 * Lead-time logic: surface a customer 7 days before their next visit
 * for short cadences (weekly/twice-weekly), 14 days for monthly+.
 *
 * @param today  ISO date string (YYYY-MM-DD) for "now" — caller controls
 *               this so the same calc is stable in tests.
 */
export function getUnbookedCustomers(
  jobs: JobRow[],
  customers: CustomerRow[],
  today: string,
): UnbookedCustomer[] {
  const lastDoneById = new Map<string, string>();
  const lastDoneByName = new Map<string, string>();
  const hasFutureById = new Set<string>();
  const hasFutureByName = new Set<string>();

  for (const j of jobs) {
    if (j.status === "completed" && j.job_date) {
      if (j.customer_id) {
        const cur = lastDoneById.get(String(j.customer_id));
        if (!cur || j.job_date > cur) lastDoneById.set(String(j.customer_id), j.job_date);
      }
      const n = norm(j.customer_name);
      if (n) {
        const cur = lastDoneByName.get(n);
        if (!cur || j.job_date > cur) lastDoneByName.set(n, j.job_date);
      }
    }
    if (j.status !== "completed" && j.status !== "cancelled" && j.job_date && j.job_date >= today) {
      if (j.customer_id) hasFutureById.add(String(j.customer_id));
      const n = norm(j.customer_name);
      if (n) hasFutureByName.add(n);
    }
  }

  const todayDate = new Date(today + "T00:00:00").getTime();
  const out: UnbookedCustomer[] = [];

  for (const c of customers) {
    if (c.status !== "active" && c.status !== "vip") continue;
    const cid = String(c.id);
    const nName = norm(c.name);
    if (hasFutureById.has(cid) || (nName && hasFutureByName.has(nName))) continue;

    const lastFromJobs = lastDoneById.get(cid) ?? (nName ? lastDoneByName.get(nName) : null);
    const effectiveLast = lastFromJobs ?? c.last_visit ?? null;

    if (!effectiveLast) {
      out.push({ id: cid, name: c.name ?? "", daysOverdue: 9999 });
      continue;
    }

    const cadence = cadenceDays(c.frequency);
    const expected = new Date(effectiveLast + "T00:00:00");
    expected.setDate(expected.getDate() + Math.round(cadence));
    const daysOverdue = Math.floor((todayDate - expected.getTime()) / (1000 * 60 * 60 * 24));
    const leadDays = cadence >= 30 ? 14 : 7;
    if (daysOverdue >= -leadDays) {
      out.push({ id: cid, name: c.name ?? "", daysOverdue });
    }
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
