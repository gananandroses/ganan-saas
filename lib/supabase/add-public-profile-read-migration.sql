-- ============================================================
-- Migration: Allow public read of user_profile for public quote pages
--
-- The public quote page (/q/[token]) needs to read business info,
-- payment methods, testimonials, etc. of the quote owner.
--
-- Without this policy, anonymous visitors can't see payment options
-- or business branding on shared quote links.
--
-- Run in Supabase SQL Editor
-- ============================================================

drop policy if exists "Public can read user_profile" on user_profile;
create policy "Public can read user_profile" on user_profile for select
using (true);

-- Note: user_profile contains business display info (name, phone, city,
-- payment phones, bank account, testimonials, badges, branding) — all
-- intended to be visible to customers viewing quotes. No sensitive auth
-- data is in this table.
