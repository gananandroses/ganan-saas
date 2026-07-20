-- Migration: Add preferred_language to user_profile
-- Run this in Supabase SQL Editor

alter table user_profile
  add column if not exists preferred_language text
  default 'he'
  check (preferred_language in ('he', 'en', 'ar', 'ru'));
