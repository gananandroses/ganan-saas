// Shared logic for "needs rescheduling" detection.
//
// A cancelled job (no_show / force_majeure) used to live forever in the
// urgent queue. The auto-clear rule: drop it as soon as the same customer
// has any other non-cancelled job on/after the cancelled date. Match by
// customer_id when present, fall back to a normalised name compare so
// legacy jobs without an FK still get cleared.
//
// This helper is the single source of truth — used by /automations,
// the bell dropdown in <Header>, and the dashboard "hot actions" card.

export type JobLite = {
  id: string;
  customer_id: string | null;
  customer_name: string;
  job_date: string | null;
  status: string;
  cancellation_reason?: string | null;
};

export type MissedReason = "no_show" | "force_majeure";

const norm = (s: string | null | undefined) => (s || "").trim().toLowerCase();

export function isRescheduled(cancelled: JobLite, allJobs: JobLite[]): boolean {
  const cancelledDate = cancelled.job_date || "";
  // Without a date we can't tell whether a later booking exists — keep the
  // missed visit in the queue rather than clearing it on an empty-string match.
  if (!cancelledDate) return false;
  return allJobs.some((other) => {
    if (other.id === cancelled.id) return false;
    if (other.status === "cancelled") return false;
    const otherDate = other.job_date || "";
    if (!otherDate) return false;
    const sameCustomer = cancelled.customer_id
      ? other.customer_id === cancelled.customer_id
      : norm(other.customer_name) === norm(cancelled.customer_name);
    if (!sameCustomer) return false;
    return otherDate >= cancelledDate;
  });
}

/**
 * Returns the cancelled jobs that genuinely still need rescheduling —
 * i.e. cancelled with a recoverable reason AND the customer hasn't
 * been rebooked since.
 */
export function pendingMissedVisits(allJobs: JobLite[]): JobLite[] {
  return allJobs
    .filter(
      (j) =>
        j.status === "cancelled" &&
        (j.cancellation_reason === "no_show" ||
          j.cancellation_reason === "force_majeure"),
    )
    .filter((j) => !isRescheduled(j, allJobs));
}
