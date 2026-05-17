-- /schedule/plan/auto needs each customer's geographic coordinates so it
-- can build an optimal daily route (nearest-neighbour). These two columns
-- store the result of one-time geocoding (Nominatim / OpenStreetMap) and
-- are populated lazily — the planner geocodes any customer whose lat/lng
-- is NULL the first time the user opens the auto-plan page.
--
-- Coordinates are stored as DOUBLE PRECISION (numeric works too but
-- distance math is faster on float). NULL means "not geocoded yet".
--
-- Run once in the Supabase SQL editor:

alter table public.customers
  add column if not exists lat double precision,
  add column if not exists lng double precision;

-- Optional index — only useful if you start running geo queries server-side.
-- Skip if you're not sure; the planner does distance math client-side.
-- create index if not exists customers_lat_lng_idx on public.customers (lat, lng);
