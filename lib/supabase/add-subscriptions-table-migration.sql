-- Migration: Create the subscriptions table (paid-status source of truth)
-- Run in Supabase SQL Editor.
--
-- WHY THIS EXISTS
-- The app gates access after the 7-day trial. The trial itself is derived
-- from the account's created_at (in middleware.ts) and needs NO row here.
-- This table only records who has PAID: the Grow (Meshulam) Light-API
-- webhook (/api/meshulam-webhook) upserts a row on every successful charge,
-- and both the middleware and the /subscribe page READ it to decide access.
--
-- Safe to run more than once (IF NOT EXISTS / idempotent policies).

create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references auth.users(id) on delete cascade,

  -- 'trial' | 'active' | 'past_due' | 'expired' | 'cancelled'
  status text not null default 'trial',

  -- When set true, this user is NEVER gated (e.g. the business owner,
  -- comped accounts). Checked first in the middleware.
  is_exempt boolean not null default false,

  -- Access is granted while current_period_end is in the future.
  trial_ends_at timestamptz,
  current_period_end timestamptz,

  -- Grow / Meshulam identifiers:
  --   meshulam_transaction_id  – asmachta / transactionCode of the last charge
  --   meshulam_direct_debit_id – the standing-order id (directDebitId). The
  --       recurring monthly webhooks (2nd charge onward) carry ONLY this, not
  --       our cField1, so we store it on the first payment to match later ones.
  --   payer_email              – fallback key for matching recurring charges
  --       when the direct-debit id isn't yet known.
  meshulam_transaction_id text,
  meshulam_direct_debit_id text,
  payer_email text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep one row per user (the webhook upserts on this).
create unique index if not exists subscriptions_user_id_key on subscriptions(user_id);
-- Lookups used by the recurring webhook to find the owner of a charge.
create index if not exists subscriptions_direct_debit_idx on subscriptions(meshulam_direct_debit_id);
create index if not exists subscriptions_payer_email_idx on subscriptions(payer_email);

-- Add the new columns to any table that already exists from an earlier run.
alter table subscriptions add column if not exists meshulam_direct_debit_id text;
alter table subscriptions add column if not exists payer_email text;

-- Row-level security: a logged-in user may READ only their own row.
-- Writes happen exclusively via the webhook using the service-role key,
-- which bypasses RLS — so no insert/update policy is needed for clients.
alter table subscriptions enable row level security;

drop policy if exists "owner_reads_own_subscription" on subscriptions;
create policy "owner_reads_own_subscription" on subscriptions
  for select using (auth.uid() = user_id);
