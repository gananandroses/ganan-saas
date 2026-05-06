-- =====================================================================
-- 🔐 CRITICAL SECURITY FIX — multi-tenant RLS hardening
-- =====================================================================
--
-- The original schema.sql ended with these policies (lines 205-210):
--
--   create policy "allow_all_customers"   on customers   for all using (true);
--   create policy "allow_all_jobs"        on jobs        for all using (true);
--   create policy "allow_all_transactions" on transactions for all using (true);
--   create policy "allow_all_projects"    on projects    for all using (true);
--   create policy "allow_all_employees"   on employees   for all using (true);
--   create policy "allow_all_inventory"   on inventory   for all using (true);
--
-- "using (true)" = anyone can read/write everyone's data.
-- That meant: when User B logs in, they could see (and edit/delete!)
-- User A's customers, transactions, jobs, etc.
--
-- This script:
--   1. Pre-flight check: how many rows have user_id = NULL? (these would become
--      invisible after the fix — see backfill block below if needed).
--   2. Drops the dangerous "allow_all_*" policies.
--   3. Creates proper user-scoped policies (auth.uid() = user_id) for SELECT,
--      INSERT, UPDATE, DELETE on all six tables.
--
-- Idempotent: safe to re-run.
-- =====================================================================

-- ── PRE-FLIGHT: orphaned-row count ──────────────────────────────────
-- (Output is informational. If any number > 0, those rows currently have
--  no owner and will be hidden after the fix. Run the OPTIONAL BACKFILL
--  block at the bottom only if you want to assign them to your account.)
do $$
declare
  c1 int; c2 int; c3 int; c4 int; c5 int; c6 int;
begin
  select count(*) into c1 from customers    where user_id is null;
  select count(*) into c2 from employees    where user_id is null;
  select count(*) into c3 from jobs         where user_id is null;
  select count(*) into c4 from inventory    where user_id is null;
  select count(*) into c5 from transactions where user_id is null;
  select count(*) into c6 from projects     where user_id is null;
  raise notice 'Orphaned rows (user_id IS NULL):';
  raise notice '  customers=%, employees=%, jobs=%, inventory=%, transactions=%, projects=%',
               c1, c2, c3, c4, c5, c6;
end $$;

-- ── DROP the dangerous open policies ────────────────────────────────
drop policy if exists "allow_all_customers"    on customers;
drop policy if exists "allow_all_employees"    on employees;
drop policy if exists "allow_all_jobs"         on jobs;
drop policy if exists "allow_all_inventory"    on inventory;
drop policy if exists "allow_all_transactions" on transactions;
drop policy if exists "allow_all_projects"     on projects;

-- Also drop any other potentially-named legacy policies just in case
drop policy if exists "Enable read access for all users"   on customers;
drop policy if exists "Enable read access for all users"   on employees;
drop policy if exists "Enable read access for all users"   on jobs;
drop policy if exists "Enable read access for all users"   on inventory;
drop policy if exists "Enable read access for all users"   on transactions;
drop policy if exists "Enable read access for all users"   on projects;

-- ── ENSURE RLS is enabled (no-op if already enabled) ────────────────
alter table customers    enable row level security;
alter table employees    enable row level security;
alter table jobs         enable row level security;
alter table inventory    enable row level security;
alter table transactions enable row level security;
alter table projects     enable row level security;

-- ── CREATE proper user-scoped policies ──────────────────────────────

-- customers
drop policy if exists customers_user_select on customers;
drop policy if exists customers_user_insert on customers;
drop policy if exists customers_user_update on customers;
drop policy if exists customers_user_delete on customers;
create policy customers_user_select on customers for select using (auth.uid() = user_id);
create policy customers_user_insert on customers for insert with check (auth.uid() = user_id);
create policy customers_user_update on customers for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy customers_user_delete on customers for delete using (auth.uid() = user_id);

-- employees
drop policy if exists employees_user_select on employees;
drop policy if exists employees_user_insert on employees;
drop policy if exists employees_user_update on employees;
drop policy if exists employees_user_delete on employees;
create policy employees_user_select on employees for select using (auth.uid() = user_id);
create policy employees_user_insert on employees for insert with check (auth.uid() = user_id);
create policy employees_user_update on employees for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy employees_user_delete on employees for delete using (auth.uid() = user_id);

-- jobs
drop policy if exists jobs_user_select on jobs;
drop policy if exists jobs_user_insert on jobs;
drop policy if exists jobs_user_update on jobs;
drop policy if exists jobs_user_delete on jobs;
create policy jobs_user_select on jobs for select using (auth.uid() = user_id);
create policy jobs_user_insert on jobs for insert with check (auth.uid() = user_id);
create policy jobs_user_update on jobs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy jobs_user_delete on jobs for delete using (auth.uid() = user_id);

-- inventory
drop policy if exists inventory_user_select on inventory;
drop policy if exists inventory_user_insert on inventory;
drop policy if exists inventory_user_update on inventory;
drop policy if exists inventory_user_delete on inventory;
create policy inventory_user_select on inventory for select using (auth.uid() = user_id);
create policy inventory_user_insert on inventory for insert with check (auth.uid() = user_id);
create policy inventory_user_update on inventory for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy inventory_user_delete on inventory for delete using (auth.uid() = user_id);

-- transactions
drop policy if exists transactions_user_select on transactions;
drop policy if exists transactions_user_insert on transactions;
drop policy if exists transactions_user_update on transactions;
drop policy if exists transactions_user_delete on transactions;
create policy transactions_user_select on transactions for select using (auth.uid() = user_id);
create policy transactions_user_insert on transactions for insert with check (auth.uid() = user_id);
create policy transactions_user_update on transactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy transactions_user_delete on transactions for delete using (auth.uid() = user_id);

-- projects
drop policy if exists projects_user_select on projects;
drop policy if exists projects_user_insert on projects;
drop policy if exists projects_user_update on projects;
drop policy if exists projects_user_delete on projects;
create policy projects_user_select on projects for select using (auth.uid() = user_id);
create policy projects_user_insert on projects for insert with check (auth.uid() = user_id);
create policy projects_user_update on projects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy projects_user_delete on projects for delete using (auth.uid() = user_id);

-- =====================================================================
-- ✅ Done. After this runs, every signed-in user will only be able to
-- see/modify rows where user_id = their own auth.uid().
--
-- The Vercel cron job (api/cron/reminders) and the Meshulam webhook use
-- the SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS — so background jobs
-- keep working as before.
-- =====================================================================


-- =====================================================================
-- OPTIONAL BACKFILL — only uncomment if the pre-flight check above
-- showed orphaned rows (user_id IS NULL) that you want to claim as
-- yours. Replace 'YOUR_AUTH_UID_HERE' with your actual auth.uid()
-- (find it under Authentication → Users in the Supabase Dashboard).
-- =====================================================================
--
-- update customers    set user_id = 'YOUR_AUTH_UID_HERE' where user_id is null;
-- update employees    set user_id = 'YOUR_AUTH_UID_HERE' where user_id is null;
-- update jobs         set user_id = 'YOUR_AUTH_UID_HERE' where user_id is null;
-- update inventory    set user_id = 'YOUR_AUTH_UID_HERE' where user_id is null;
-- update transactions set user_id = 'YOUR_AUTH_UID_HERE' where user_id is null;
-- update projects     set user_id = 'YOUR_AUTH_UID_HERE' where user_id is null;
