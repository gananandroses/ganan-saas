-- Monthly revenue goals on the user_profile. The schedule page shows a
-- progress card against these (min + stretch target). NULL = no goal
-- set yet, the UI falls back to a sensible default (30k / 52.5k) and
-- prompts the user to configure in /settings.
--
-- Run once in the Supabase SQL editor:

alter table public.user_profile
  add column if not exists monthly_goal_min numeric,
  add column if not exists monthly_goal_target numeric,
  -- Day-of-week numbers (0 = Sun … 6 = Sat) that the user works.
  -- NULL = use the app default (Sun-Fri). Used by the monthly goal
  -- card's "free work days" calc + the auto-planner setup default.
  add column if not exists work_days integer[];
