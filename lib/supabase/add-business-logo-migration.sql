-- ============================================================
-- Migration: Add business_logo_url to user_profile + create storage bucket
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add column to user_profile
alter table user_profile add column if not exists business_logo_url text;

-- 2. Create public storage bucket for business assets
insert into storage.buckets (id, name, public)
values ('business-assets', 'business-assets', true)
on conflict (id) do nothing;

-- 3. RLS policies for the bucket
-- Allow users to upload their own logo
drop policy if exists "Users can upload their own business assets" on storage.objects;
create policy "Users can upload their own business assets"
  on storage.objects for insert
  with check (
    bucket_id = 'business-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to update their own logo
drop policy if exists "Users can update their own business assets" on storage.objects;
create policy "Users can update their own business assets"
  on storage.objects for update
  using (
    bucket_id = 'business-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own logo
drop policy if exists "Users can delete their own business assets" on storage.objects;
create policy "Users can delete their own business assets"
  on storage.objects for delete
  using (
    bucket_id = 'business-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow anyone to read logos (public bucket)
drop policy if exists "Anyone can view business assets" on storage.objects;
create policy "Anyone can view business assets"
  on storage.objects for select
  using (bucket_id = 'business-assets');
