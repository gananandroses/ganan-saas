-- ============================================================
-- Migration: Quote Wave 1 — discount, item descriptions/categories
-- Run in Supabase SQL Editor
-- ============================================================

alter table quotes add column if not exists discount_amount numeric(10,2) default 0;
alter table quotes add column if not exists discount_type text default 'amount' check (discount_type in ('amount', 'percent'));
-- Note: items already JSONB so we store description/category inside each item — no schema change needed
