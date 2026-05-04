-- Migration: Add payment details to user_profile
-- Run this in Supabase SQL Editor

alter table user_profile add column if not exists bit_phone text;
alter table user_profile add column if not exists paybox_phone text;
alter table user_profile add column if not exists bank_name text;
alter table user_profile add column if not exists bank_branch text;
alter table user_profile add column if not exists bank_account text;
