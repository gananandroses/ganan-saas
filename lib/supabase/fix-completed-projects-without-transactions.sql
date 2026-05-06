-- ============================================================
-- One-shot recovery: create missing transactions for projects
-- that were already marked "completed" before the auto-create
-- logic was added (or before the schedule→project sync fix).
--
-- For each project with status='completed':
--   1. Compute totalCost = sum(materials.quantity * materials.price) + labor_hours * hourly_rate
--   2. Compute budgetBeforeVat: if vat_included = true → budget / 1.18, else → budget
--   3. Income tx (status='pending') with description "פרויקט: <name>"
--      — only inserted if no income tx with that exact description already exists.
--   4. Expense tx (status='paid') with description "חומרים: <name>"
--      — only inserted if no expense tx with that exact description already exists.
--
-- Idempotent: safe to run multiple times.
-- Run in Supabase SQL Editor (logged in, RLS uses auth.uid()).
-- ============================================================

with proj as (
  select
    p.id,
    p.user_id,
    p.name,
    p.customer_name,
    p.start_date,
    p.budget,
    p.vat_included,
    p.labor_hours,
    p.hourly_rate,
    -- materials cost from jsonb array
    coalesce((
      select sum( (coalesce((m->>'quantity')::numeric, 0)) * (coalesce((m->>'price')::numeric, 0)) )
      from jsonb_array_elements(coalesce(p.materials, '[]'::jsonb)) m
    ), 0) as materials_cost
  from projects p
  where p.status = 'completed'
),
calc as (
  select
    *,
    (materials_cost + (coalesce(labor_hours, 0) * coalesce(hourly_rate, 0))) as total_cost,
    case
      when coalesce(vat_included, false) = true then round(coalesce(budget, 0) / 1.18)
      else coalesce(budget, 0)
    end as budget_before_vat
  from proj
)
-- ── Income transactions (status = 'pending')
insert into transactions (user_id, customer_name, type, amount, vat_amount, description, method, status, transaction_date)
select
  c.user_id,
  coalesce(c.customer_name, 'פרויקט'),
  'income',
  round(c.budget_before_vat * 1.18),
  round(c.budget_before_vat * 1.18) - round(c.budget_before_vat),
  'פרויקט: ' || c.name,
  'cash',
  'pending',
  coalesce(c.start_date, current_date)
from calc c
where c.budget > 0
  and not exists (
    select 1 from transactions t
    where t.user_id = c.user_id
      and t.type = 'income'
      and t.description = ('פרויקט: ' || c.name)
  );

-- ── Expense transactions (status = 'paid')
with proj as (
  select
    p.id,
    p.user_id,
    p.name,
    p.customer_name,
    p.start_date,
    p.budget,
    p.vat_included,
    p.labor_hours,
    p.hourly_rate,
    coalesce((
      select sum( (coalesce((m->>'quantity')::numeric, 0)) * (coalesce((m->>'price')::numeric, 0)) )
      from jsonb_array_elements(coalesce(p.materials, '[]'::jsonb)) m
    ), 0) as materials_cost
  from projects p
  where p.status = 'completed'
),
calc as (
  select
    *,
    (materials_cost + (coalesce(labor_hours, 0) * coalesce(hourly_rate, 0))) as total_cost
  from proj
)
insert into transactions (user_id, customer_name, type, amount, vat_amount, description, method, status, transaction_date)
select
  c.user_id,
  coalesce(c.customer_name, 'פרויקט'),
  'expense',
  round(c.total_cost),
  0,
  'חומרים: ' || c.name,
  'cash',
  'paid',
  coalesce(c.start_date, current_date)
from calc c
where c.total_cost > 0
  and not exists (
    select 1 from transactions t
    where t.user_id = c.user_id
      and t.type = 'expense'
      and t.description = ('חומרים: ' || c.name)
  );

-- ============================================================
-- ALSO: auto-complete projects whose schedule jobs are all done
-- (covers the case where the user marked the calendar job as
--  "completed" but the project itself is still "in_progress").
-- ============================================================

with project_jobs as (
  select
    j.user_id,
    -- Extract project name from notes: "פרויקט: <name>" or "פרויקט: <name> · X ימי עבודה"
    trim(
      regexp_replace(
        regexp_replace(j.notes, '^פרויקט:\s*', ''),
        '\s*·\s*\d+\s*ימי עבודה.*$', ''
      )
    ) as project_name,
    j.status
  from jobs j
  where j.notes like 'פרויקט:%'
),
project_summary as (
  select
    user_id,
    project_name,
    count(*) as total_jobs,
    sum(case when status in ('completed','cancelled') then 1 else 0 end) as closed_jobs
  from project_jobs
  where project_name <> ''
  group by user_id, project_name
)
update projects p
set status = 'completed', progress = 100
from project_summary s
where p.user_id = s.user_id
  and p.name = s.project_name
  and p.status <> 'completed'
  and s.total_jobs > 0
  and s.total_jobs = s.closed_jobs;

-- ============================================================
-- Re-run the income/expense inserts above (now that more projects
-- may have flipped to "completed"). Safe due to NOT EXISTS guards.
-- ============================================================

with proj as (
  select
    p.id, p.user_id, p.name, p.customer_name, p.start_date,
    p.budget, p.vat_included, p.labor_hours, p.hourly_rate,
    coalesce((
      select sum( (coalesce((m->>'quantity')::numeric, 0)) * (coalesce((m->>'price')::numeric, 0)) )
      from jsonb_array_elements(coalesce(p.materials, '[]'::jsonb)) m
    ), 0) as materials_cost
  from projects p where p.status = 'completed'
),
calc as (
  select *,
    (materials_cost + (coalesce(labor_hours, 0) * coalesce(hourly_rate, 0))) as total_cost,
    case when coalesce(vat_included, false) = true then round(coalesce(budget, 0) / 1.18) else coalesce(budget, 0) end as budget_before_vat
  from proj
)
insert into transactions (user_id, customer_name, type, amount, vat_amount, description, method, status, transaction_date)
select
  c.user_id, coalesce(c.customer_name, 'פרויקט'), 'income',
  round(c.budget_before_vat * 1.18),
  round(c.budget_before_vat * 1.18) - round(c.budget_before_vat),
  'פרויקט: ' || c.name, 'cash', 'pending',
  coalesce(c.start_date, current_date)
from calc c
where c.budget > 0
  and not exists (
    select 1 from transactions t
    where t.user_id = c.user_id and t.type = 'income' and t.description = ('פרויקט: ' || c.name)
  );

with proj as (
  select
    p.id, p.user_id, p.name, p.customer_name, p.start_date,
    p.budget, p.labor_hours, p.hourly_rate,
    coalesce((
      select sum( (coalesce((m->>'quantity')::numeric, 0)) * (coalesce((m->>'price')::numeric, 0)) )
      from jsonb_array_elements(coalesce(p.materials, '[]'::jsonb)) m
    ), 0) as materials_cost
  from projects p where p.status = 'completed'
),
calc as (
  select *, (materials_cost + (coalesce(labor_hours, 0) * coalesce(hourly_rate, 0))) as total_cost from proj
)
insert into transactions (user_id, customer_name, type, amount, vat_amount, description, method, status, transaction_date)
select
  c.user_id, coalesce(c.customer_name, 'פרויקט'), 'expense',
  round(c.total_cost), 0,
  'חומרים: ' || c.name, 'cash', 'paid',
  coalesce(c.start_date, current_date)
from calc c
where c.total_cost > 0
  and not exists (
    select 1 from transactions t
    where t.user_id = c.user_id and t.type = 'expense' and t.description = ('חומרים: ' || c.name)
  );

-- ✅ Done. Refresh /finance, /dashboard and notifications — Sharon (and any
--    other affected projects) will now show up.
