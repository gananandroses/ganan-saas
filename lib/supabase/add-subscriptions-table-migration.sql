-- Migration: Create the subscriptions table (paid-status source of truth)
-- Run in Supabase SQL Editor.
--
-- WHY THIS EXISTS
-- The app gates access after the 7-day trial. The trial itself is derived
-- from the account's created_at (in middleware.ts) and needs NO row here.
-- This table only records who has PAID: the Meshulam/Grow webhook
-- (/api/meshulam-webhook) upserts a row on every successful charge, and
-- both the middleware and the /subscribe page READ it to decide access.
--
-- Safe to run more than once (IF NOT EXISTS / idempotent policies).

create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references auth.users(id) on delete cascade,

  -- 'trial' | 'active' | 'expired' | 'cancelled'
  status text not null default 'trial',

  -- When set true, this user is NEVER gated (e.g. the business owner,
  -- comped accounts). Checked first in the middleware.
  is_exempt boolean not null default false,

  -- Filled by the webhook on a successful charge: access is granted while
  -- current_period_end is in the future.
  trial_ends_at timestamptz,
  current_period_end timestamptz,

  -- Meshulam/Grow identifiers. meshulam_token is the saved-card token used
  -- to auto-charge ₪99 every month (recurring billing).
  meshulam_transaction_id text,
  meshulam_token text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep one row per user (the webhook upserts on this).
create unique index if not exists subscriptions_user_id_key on subscriptions(user_id);

-- Row-level security: a logged-in user may READ only their own row.
-- Writes happen exclusively via the webhook using the service-role key,
-- which bypasses RLS — so no insert/update policy is needed for clients.
alter table subscriptions enable row level security;

drop policy if exists "owner_reads_own_subscription" on subscriptions;
create policy "owner_reads_own_subscription" on subscriptions
  for select using (auth.uid() = user_id);
