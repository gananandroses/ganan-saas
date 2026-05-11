// Shared "complete a job" flow.
//
// Marking a job as completed used to be in two places (the JobDetailModal
// in /schedule, and the inline quick-complete on the new JobListCard).
// They drifted: the modal created the pending-income transaction so the
// customer would show up under "open debt", but the inline button only
// updated the status. Result: gardener taps "סיים" on the card, the job
// turns gray, but no transaction is born → customer never appears in
// finance, never appears in the "חובות פתוחים" hot-action.
//
// One helper, one flow, two callers. Anyone who marks a job as completed
// in the future should go through this function.

import type { SupabaseClient } from "@supabase/supabase-js";

export type CompleteJobInput = {
  id: string;
  customerId: string | null;
  customerName: string;
  type: string;
  address: string;
  date: string;          // ISO YYYY-MM-DD
  price: number;
  priceBeforeVat: boolean;
  expenses?: number;
  notes?: string;
};

export type CompleteJobResult = {
  ok: boolean;
  /** True when this job was a standalone (non-project) job and we created
   *  a pending-income transaction. The caller can use this to know whether
   *  to mention "תשלום ממתין" in the success toast. */
  createdIncomeTransaction: boolean;
  /** True when this job's completion also closed the parent project and
   *  created the project's income/expense transactions. */
  closedProject: boolean;
  error?: string;
};

const VAT_RATE = 1.18;

/**
 * Mark a job as completed AND create any downstream financial entries.
 *
 * Two flavours of job:
 *   1. Standalone (no `notes: "פרויקט: …"`) — we create a pending-income
 *      transaction immediately so the customer appears in "חובות פתוחים".
 *   2. Project job (`notes` starts with `פרויקט:`) — we defer transaction
 *      creation until ALL sibling jobs of that project are done, at which
 *      point we close the project and create one consolidated
 *      income + expense pair.
 */
export async function completeJobAndCreateTransactions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  job: CompleteJobInput,
  userId: string,
): Promise<CompleteJobResult> {
  // 1) Update the job status.
  const { error: updateErr } = await supabase
    .from("jobs")
    .update({ status: "completed" })
    .eq("id", job.id)
    .eq("user_id", userId);

  if (updateErr) {
    return { ok: false, createdIncomeTransaction: false, closedProject: false, error: updateErr.message };
  }

  const isProjectJob = job.notes?.startsWith("פרויקט:") ?? false;
  let createdIncomeTransaction = false;
  let closedProject = false;

  if (!isProjectJob) {
    // 2a) Standalone job — pending income transaction.
    const priceBefore = job.priceBeforeVat ? job.price : Math.round(job.price / VAT_RATE);
    const totalWithVat = Math.round(priceBefore * VAT_RATE);
    const vatAmount = totalWithVat - priceBefore;
    const txDate = job.date || new Date().toISOString().split("T")[0];

    await supabase.from("transactions").insert({
      user_id: userId,
      customer_id: job.customerId,
      customer_name: job.customerName,
      type: "income",
      amount: totalWithVat,
      vat_amount: vatAmount,
      description: `${job.type || "עבודת גינון"}${job.address ? " · " + job.address : ""}`,
      method: "cash",
      status: "pending",
      transaction_date: txDate,
    });
    createdIncomeTransaction = true;

    // Optional expense — if the gardener recorded out-of-pocket costs.
    if (job.expenses && job.expenses > 0) {
      await supabase.from("transactions").insert({
        user_id: userId,
        customer_id: job.customerId,
        customer_name: job.customerName,
        type: "expense",
        amount: job.expenses,
        vat_amount: 0,
        description: `הוצאות עבודה: ${job.type || "עבודת גינון"}`,
        method: "cash",
        status: "paid",
        transaction_date: txDate,
      });
    }
  } else if (job.notes) {
    // 2b) Project job — close the project once all siblings are done.
    const projectName = job.notes
      .replace(/^פרויקט:\s*/, "")
      .replace(/\s*·\s*\d+\s*ימי עבודה.*$/, "")
      .trim();

    if (projectName) {
      const { data: projects } = await supabase
        .from("projects")
        .select("id, status, start_date, name, customer_name, budget, materials, labor_hours, hourly_rate, vat_included")
        .eq("user_id", userId)
        .eq("name", projectName)
        .neq("status", "completed")
        .limit(1);

      const project = projects?.[0];
      if (project) {
        const { data: siblings } = await supabase
          .from("jobs")
          .select("id, status")
          .eq("user_id", userId)
          .like("notes", `פרויקט: ${projectName}%`);

        const stillOpen = (siblings ?? []).some(
          (j: { id: string; status: string }) =>
            j.id !== job.id && j.status !== "completed" && j.status !== "cancelled",
        );

        if (!stillOpen) {
          await supabase
            .from("projects")
            .update({ status: "completed", progress: 100 })
            .eq("id", project.id)
            .eq("user_id", userId);

          // Project financials — mirrors calcFinancials() in /projects.
          type RawMaterial = { quantity?: number; price?: number };
          const materials = Array.isArray(project.materials) ? (project.materials as RawMaterial[]) : [];
          const materialsCost = materials.reduce(
            (sum, m) => sum + ((Number(m.quantity) || 0) * (Number(m.price) || 0)),
            0,
          );
          const laborCost = (Number(project.labor_hours) || 0) * (Number(project.hourly_rate) || 0);
          const totalCost = materialsCost + laborCost;
          const budget = Number(project.budget) || 0;
          const budgetBeforeVat = project.vat_included ? Math.round(budget / VAT_RATE) : budget;
          const txDate = project.start_date || new Date().toISOString().split("T")[0];

          // Pending income (deduped by description, so a re-run is safe).
          if (budget > 0) {
            const totalWithVat = Math.round(budgetBeforeVat * VAT_RATE);
            const vatAmount = totalWithVat - Math.round(budgetBeforeVat);
            const incomeDesc = `פרויקט: ${project.name}`;
            const { data: existingIncome } = await supabase
              .from("transactions")
              .select("id")
              .eq("user_id", userId)
              .eq("type", "income")
              .eq("description", incomeDesc)
              .limit(1);
            if (!existingIncome || existingIncome.length === 0) {
              await supabase.from("transactions").insert({
                user_id: userId,
                customer_name: project.customer_name || "פרויקט",
                type: "income",
                amount: totalWithVat,
                vat_amount: vatAmount,
                description: incomeDesc,
                method: "cash",
                status: "pending",
                transaction_date: txDate,
              });
              createdIncomeTransaction = true;
            }
          }

          // Paid expense (materials + labor).
          if (totalCost > 0) {
            const expenseDesc = `חומרים: ${project.name}`;
            const { data: existingExpense } = await supabase
              .from("transactions")
              .select("id")
              .eq("user_id", userId)
              .eq("type", "expense")
              .eq("description", expenseDesc)
              .limit(1);
            if (!existingExpense || existingExpense.length === 0) {
              await supabase.from("transactions").insert({
                user_id: userId,
                customer_name: project.customer_name || "פרויקט",
                type: "expense",
                amount: Math.round(totalCost),
                vat_amount: 0,
                description: expenseDesc,
                method: "cash",
                status: "paid",
                transaction_date: txDate,
              });
            }
          }

          closedProject = true;
        }
      }
    }
  }

  return { ok: true, createdIncomeTransaction, closedProject };
}

// ─────────────────────────────────────────────────────────────────────────
// Backfill: find historical completed jobs that never got a transaction.
//
// Before lib/complete-job.ts existed, the inline "סיים" button on the new
// JobListCard just flipped status → no transaction was born. Users like
// אריאל ended up with completed jobs (נטלי, עוזי) that aren't tracked in
// /finance and don't show up under "חובות פתוחים".
//
// This helper takes the gardener's already-loaded jobs + transactions and
// returns the orphans — completed standalone jobs whose customer + date +
// price has no matching income transaction.
// ─────────────────────────────────────────────────────────────────────────

export type CompletedJobLite = {
  id: string;
  customerId: string | null;
  customerName: string;
  date: string;
  type: string;
  address: string;
  price: number;
  priceBeforeVat: boolean;
  notes?: string;
  status: string;
};

export type TxLite = {
  customer_name: string | null;
  type: string;
  description: string | null;
  transaction_date: string | null;
  amount: number | null;
};

/** Find completed standalone jobs that have no matching income transaction. */
export function findOrphanCompletedJobs(
  jobs: CompletedJobLite[],
  transactions: TxLite[],
): CompletedJobLite[] {
  // Project jobs handle their own deferred-transaction lifecycle through
  // the project closure path — don't try to backfill those.
  const standalone = jobs.filter(
    (j) => j.status === "completed" && !(j.notes ?? "").startsWith("פרויקט:"),
  );

  const norm = (s: string | null | undefined) => (s || "").trim().toLowerCase();

  return standalone.filter((j) => {
    // A "match" is any income transaction for the same customer on the same
    // date. We don't require the description to match exactly because the
    // description includes the address which may have been edited.
    const matched = transactions.some(
      (t) =>
        t.type === "income" &&
        norm(t.customer_name) === norm(j.customerName) &&
        t.transaction_date === j.date,
    );
    return !matched;
  });
}

/** Create the missing pending-income transactions for a batch of jobs. */
export async function backfillCompletedJobTransactions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  jobs: CompletedJobLite[],
  userId: string,
): Promise<{ created: number; failed: number }> {
  let created = 0;
  let failed = 0;

  for (const j of jobs) {
    const priceBefore = j.priceBeforeVat ? j.price : Math.round(j.price / VAT_RATE);
    const totalWithVat = Math.round(priceBefore * VAT_RATE);
    const vatAmount = totalWithVat - priceBefore;
    const { error } = await supabase.from("transactions").insert({
      user_id: userId,
      customer_id: j.customerId,
      customer_name: j.customerName,
      type: "income",
      amount: totalWithVat,
      vat_amount: vatAmount,
      description: `${j.type || "עבודת גינון"}${j.address ? " · " + j.address : ""}`,
      method: "cash",
      status: "pending",
      transaction_date: j.date,
    });
    if (error) failed += 1;
    else created += 1;
  }

  return { created, failed };
}
