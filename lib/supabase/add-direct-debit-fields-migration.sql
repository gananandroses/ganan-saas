-- Migration: Add Grow (Meshulam) direct-debit management fields to subscriptions
-- Run this in Supabase SQL Editor.
--
-- WHY THIS EXISTS
-- To let a customer cancel/pause their standing order (הוראת קבע) via
-- Grow's updateDirectDebit API, we need to store the exact identifiers
-- Grow returns on the FIRST payment webhook: transactionId, asmachta, and
-- transactionToken. (meshulam_direct_debit_id was already stored, but the
-- update/cancel call needs these three additional fields too.)
--
-- Safe to run more than once.

alter table subscriptions add column if not exists meshulam_dd_transaction_id text;
alter table subscriptions add column if not exists meshulam_asmachta text;
alter table subscriptions add column if not exists meshulam_transaction_token text;
