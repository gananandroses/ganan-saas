-- ============================================================================
-- Personal Cash Flow — separate domain from business transactions
-- ============================================================================
-- Run in Supabase SQL Editor.
-- Safe to re-run (uses IF NOT EXISTS).

create table if not exists personal_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,

  -- Direction of money
  type text not null check (type in ('income', 'expense')),

  -- Logical grouping (see lib/personal-finance.ts CATEGORIES for the full list)
  category text not null,

  amount numeric(12, 2) not null check (amount >= 0),
  description text,

  -- One-time vs recurring
  recurrence text not null default 'one_time'
    check (recurrence in ('one_time', 'monthly', 'yearly')),

  -- For one_time: the date it happened.
  -- For monthly/yearly: the first occurrence (anchor).
  start_date date not null default current_date,

  -- Optional end of a recurring stream. NULL = ongoing.
  end_date date,

  notes text,
  created_at timestamp with time zone default now()
);

-- Helpful indexes
create index if not exists personal_transactions_user_idx
  on personal_transactions (user_id);

create index if not exists personal_transactions_user_start_idx
  on personal_transactions (user_id, start_date desc);

create index if not exists personal_transactions_user_recurrence_idx
  on personal_transactions (user_id, recurrence);

-- ============================================================================
-- Row-Level Security: each user only sees their own rows.
-- Mirrors the pattern used by the rest of the app.
-- ============================================================================
alter table personal_transactions enable row level security;

drop policy if exists "personal_transactions_select_own" on personal_transactions;
drop policy if exists "personal_transactions_insert_own" on personal_transactions;
drop policy if exists "personal_transactions_update_own" on personal_transactions;
drop policy if exists "personal_transactions_delete_own" on personal_transactions;

create policy "personal_transactions_select_own"
  on personal_transactions for select
  using (auth.uid() = user_id);

create policy "personal_transactions_insert_own"
  on personal_transactions for insert
  with check (auth.uid() = user_id);

create policy "personal_transactions_update_own"
  on personal_transactions for update
  using (auth.uid() = user_id);

create policy "personal_transactions_delete_own"
  on personal_transactions for delete
  using (auth.uid() = user_id);
