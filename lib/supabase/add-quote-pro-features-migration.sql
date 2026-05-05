-- ============================================================
-- Migration: Pro features for quotes (numbering, public link, signature, tracking)
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Sequential numbering
alter table quotes add column if not exists quote_number text;
alter table quotes add column if not exists quote_year integer;
alter table quotes add column if not exists quote_seq integer;

-- 2. Public shareable link
alter table quotes add column if not exists public_token text;
create unique index if not exists quotes_public_token_uq on quotes(public_token) where public_token is not null;

-- 3. View tracking
alter table quotes add column if not exists viewed_at timestamp with time zone;
alter table quotes add column if not exists view_count integer default 0;

-- 4. Digital signature
alter table quotes add column if not exists signed_at timestamp with time zone;
alter table quotes add column if not exists signature_data text;          -- base64 image of signature
alter table quotes add column if not exists signed_by_name text;           -- name typed by signer
alter table quotes add column if not exists signed_ip text;                -- IP of signer (audit)

-- 5. Project linkage (when accepted → project)
alter table quotes add column if not exists project_id uuid references projects(id) on delete set null;

-- 6. Public read policy — anyone with token can read (for public view)
drop policy if exists quotes_public_read_by_token on quotes;
create policy quotes_public_read_by_token on quotes for select
  using (public_token is not null);

-- 7. Public update policy — allow anonymous to update view_count, signature
drop policy if exists quotes_public_update_by_token on quotes;
create policy quotes_public_update_by_token on quotes for update
  using (public_token is not null)
  with check (public_token is not null);
