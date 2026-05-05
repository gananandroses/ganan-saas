-- ============================================================
-- Migration: Add quote template defaults to user_profile
-- Run in Supabase SQL Editor
-- ============================================================

alter table user_profile add column if not exists quote_default_validity_days integer default 30;
alter table user_profile add column if not exists quote_default_markup numeric(5,2) default 100;
alter table user_profile add column if not exists quote_title_label text default 'הצעת מחיר';
alter table user_profile add column if not exists quote_default_notes text;
alter table user_profile add column if not exists quote_default_footer text default 'ההצעה תקפה למשך 30 ימים מהיום. חתימה על ההצעה מהווה אישור לביצוע העבודה.';
alter table user_profile add column if not exists quote_intro_text text;
