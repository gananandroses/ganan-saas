-- Migration: Add cancellation_reason to jobs table
-- Run in Supabase SQL Editor

alter table jobs add column if not exists cancellation_reason text;

-- Possible values: 'no_show' (לקוח לא הופיע), 'force_majeure' (בלת"מ)
-- NULL = job wasn't cancelled / cancelled without reason
