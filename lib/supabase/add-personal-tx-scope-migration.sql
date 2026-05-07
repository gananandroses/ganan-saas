-- ============================================================================
-- Personal Cash Flow — add `scope` column
-- ============================================================================
-- Purpose: tag each personal-cash-flow transaction as either purely personal
--          or business-related (paid from my personal pocket but for the
--          gardening business). Lets the page report "out of my expenses,
--          ₪X went to the business".
--
-- Run in Supabase SQL Editor. Safe to re-run.

alter table personal_transactions
  add column if not exists scope text not null default 'personal'
    check (scope in ('personal', 'business'));

-- Backfill existing rows (already covered by `default 'personal'` above for
-- new INSERTs, but be explicit for any prior NULLs that may have slipped in).
update personal_transactions
  set scope = 'personal'
  where scope is null;

create index if not exists personal_transactions_user_scope_idx
  on personal_transactions (user_id, scope);
