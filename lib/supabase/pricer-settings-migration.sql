-- Pricer settings table — one row per user, synced across all devices
create table if not exists pricer_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  custom_items jsonb default '[]'::jsonb,
  custom_categories jsonb default '[]'::jsonb,
  override_prices jsonb default '{}'::jsonb,
  override_units jsonb default '{}'::jsonb,
  override_names jsonb default '{}'::jsonb,
  override_cat_names jsonb default '{}'::jsonb,
  override_item_cats jsonb default '{}'::jsonb,
  vat_items jsonb default '{}'::jsonb,
  hidden_items jsonb default '[]'::jsonb,
  hidden_categories jsonb default '[]'::jsonb,
  drafts jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- RLS
alter table pricer_settings enable row level security;

create policy "Users can read own pricer settings"
  on pricer_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own pricer settings"
  on pricer_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own pricer settings"
  on pricer_settings for update
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger pricer_settings_updated_at
  before update on pricer_settings
  for each row execute function update_updated_at();
