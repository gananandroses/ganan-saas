-- ============================================================
-- Migration: Quote Wave 2 — testimonials, trust badges, hero
-- Run in Supabase SQL Editor
-- ============================================================

alter table user_profile add column if not exists testimonials jsonb default '[]'::jsonb;
-- testimonials: array of {customer_name, rating (1-5), text, location?}

alter table user_profile add column if not exists trust_badges jsonb default '[]'::jsonb;
-- trust_badges: array of {icon, text}

alter table user_profile add column if not exists hero_image_url text;

-- Item images: stored in items JSON, no migration needed (just add field).
