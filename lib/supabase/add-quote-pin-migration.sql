-- ============================================================
-- Migration: Add PIN security to quotes
-- Run in Supabase SQL Editor
-- ============================================================

alter table quotes add column if not exists pin_code text;
alter table quotes add column if not exists pin_attempts integer default 0;
alter table quotes add column if not exists pin_locked_until timestamp with time zone;
