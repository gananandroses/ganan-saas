-- ============================================================
-- Migration: Quote payment system (deposit + payment tracking)
-- Run in Supabase SQL Editor
-- ============================================================

-- Quote payment fields
alter table quotes add column if not exists deposit_percent numeric(5,2) default 50;
alter table quotes add column if not exists deposit_amount numeric(10,2) default 0;
alter table quotes add column if not exists payment_status text default 'unpaid' check (payment_status in ('unpaid', 'pending_verification', 'deposit_paid', 'fully_paid'));
alter table quotes add column if not exists payment_method text;
alter table quotes add column if not exists payment_reference text;
alter table quotes add column if not exists payment_marked_at timestamp with time zone;
alter table quotes add column if not exists payment_verified_at timestamp with time zone;

-- Gateway credentials per user (Meshulam / Cardcom / etc.)
alter table user_profile add column if not exists payment_gateway text default 'none' check (payment_gateway in ('none', 'meshulam', 'cardcom', 'tranzila', 'payplus'));
alter table user_profile add column if not exists payment_gateway_user_id text;
alter table user_profile add column if not exists payment_gateway_page_code text;
alter table user_profile add column if not exists payment_gateway_api_key text;
