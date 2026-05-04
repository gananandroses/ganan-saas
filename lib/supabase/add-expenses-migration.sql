-- ===========================
-- Migration: Add expenses field to jobs + backfill transactions
-- Run this in Supabase SQL Editor
-- ===========================

-- 1) Add expenses column to jobs (cost of materials, fuel, etc. for the job)
alter table jobs add column if not exists expenses numeric(10,2) default 0;

-- 2) Backfill: create income transactions for already-completed jobs
--    that don't already have a matching transaction
insert into transactions (user_id, customer_name, type, amount, vat_amount, description, method, status, transaction_date)
select
  j.user_id,
  j.customer_name,
  'income',
  case when j.price_before_vat then round(j.price * 1.18) else j.price end as amount,
  case when j.price_before_vat then round(j.price * 0.18) else round(j.price - j.price / 1.18) end as vat_amount,
  coalesce(j.type, 'עבודת גינון') || case when j.address is not null then ' · ' || j.address else '' end,
  'cash',
  'pending',
  j.job_date
from jobs j
where j.status = 'completed'
  and not exists (
    select 1 from transactions t
    where t.user_id = j.user_id
      and t.customer_name = j.customer_name
      and t.transaction_date = j.job_date
      and t.type = 'income'
      and abs(t.amount - (case when j.price_before_vat then round(j.price * 1.18) else j.price end)) < 1
  );

-- 3) Backfill expense transactions for jobs that have expenses > 0
insert into transactions (user_id, customer_name, type, amount, vat_amount, description, method, status, transaction_date)
select
  j.user_id,
  j.customer_name,
  'expense',
  j.expenses,
  0,
  'הוצאות עבודה: ' || coalesce(j.type, 'עבודת גינון'),
  'cash',
  'paid',
  j.job_date
from jobs j
where j.status = 'completed'
  and j.expenses > 0
  and not exists (
    select 1 from transactions t
    where t.user_id = j.user_id
      and t.customer_name = j.customer_name
      and t.transaction_date = j.job_date
      and t.type = 'expense'
      and abs(t.amount - j.expenses) < 1
  );
