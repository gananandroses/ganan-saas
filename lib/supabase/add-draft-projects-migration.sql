-- Migration: Add 'draft' status to projects
-- Run in Supabase SQL Editor

-- Drop existing constraint and add new one with 'draft'
alter table projects drop constraint if exists projects_status_check;
alter table projects add constraint projects_status_check
  check (status in ('draft', 'planning', 'active', 'completed', 'on_hold'));
