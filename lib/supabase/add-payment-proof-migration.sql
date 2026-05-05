-- ============================================================
-- Migration: Payment proof (reference + screenshot upload)
--
-- Customer must provide payment reference (asmachta) and optionally
-- upload screenshot of payment confirmation BEFORE signing.
-- Only after seller verifies in bank → quote becomes fully approved.
--
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add proof URL column to quotes
alter table quotes add column if not exists payment_proof_url text;

-- 2. Create public storage bucket for payment proofs
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do nothing;

-- 3. RLS policies for payment proofs
-- Anyone can upload (anonymous public users uploading their proof)
drop policy if exists "Anyone can upload payment proofs" on storage.objects;
create policy "Anyone can upload payment proofs"
  on storage.objects for insert
  with check (bucket_id = 'payment-proofs');

-- Anyone can view payment proofs (they're identified by random filename)
drop policy if exists "Anyone can view payment proofs" on storage.objects;
create policy "Anyone can view payment proofs"
  on storage.objects for select
  using (bucket_id = 'payment-proofs');
