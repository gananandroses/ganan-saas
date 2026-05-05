-- ============================================================
-- Migration: Add quotes (price quotes) table
-- Run in Supabase SQL Editor
-- ============================================================

create table if not exists quotes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  customer_id uuid references customers(id) on delete set null,
  customer_name text,
  customer_phone text,
  customer_address text,

  title text not null,
  description text,

  items jsonb default '[]'::jsonb,
  markup_percent numeric(5,2) default 0,
  labor_cost numeric(10,2) default 0,

  subtotal_before_vat numeric(10,2) default 0,
  vat_amount numeric(10,2) default 0,
  total_with_vat numeric(10,2) default 0,

  status text default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected')),
  valid_until date,
  notes text
);

create index if not exists quotes_user_id_idx on quotes(user_id);
create index if not exists quotes_status_idx on quotes(status);
create index if not exists quotes_created_at_idx on quotes(created_at desc);

-- RLS
alter table quotes enable row level security;

drop policy if exists quotes_user_select on quotes;
drop policy if exists quotes_user_insert on quotes;
drop policy if exists quotes_user_update on quotes;
drop policy if exists quotes_user_delete on quotes;

create policy quotes_user_select on quotes for select using (auth.uid() = user_id);
create policy quotes_user_insert on quotes for insert with check (auth.uid() = user_id);
create policy quotes_user_update on quotes for update using (auth.uid() = user_id);
create policy quotes_user_delete on quotes for delete using (auth.uid() = user_id);
