-- ============================================
-- Articles (Knowledge Base) — Migration
-- ============================================
-- Run this in Supabase SQL Editor.
-- Creates the `articles` table + RLS policies + storage bucket
-- for cover images, plus the user-favorites join table.

-- 1) Main articles table
create table if not exists articles (
  id              uuid primary key default gen_random_uuid(),
  category        text not null,
  title           text not null,
  subtitle        text,
  content         text not null,                -- full markdown / plain text
  ai_summary      jsonb not null default '{}',  -- { key_points, action_steps, money_angle }
  practical_steps text[],                       -- step-by-step list
  pro_tip         text,
  profit_tip      text,
  tags            text[],
  cover_image_url text,
  read_minutes    int default 4,
  is_published    boolean default true,
  is_featured     boolean default false,        -- show on top of list / weekly highlights
  published_at    timestamptz default now(),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_articles_category on articles(category);
create index if not exists idx_articles_published on articles(is_published, published_at desc);
create index if not exists idx_articles_featured on articles(is_featured) where is_featured = true;
create index if not exists idx_articles_tags on articles using gin(tags);

-- 2) Per-user favorites / saved-for-later
create table if not exists article_favorites (
  user_id    uuid references auth.users(id) on delete cascade,
  article_id uuid references articles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, article_id)
);

create index if not exists idx_article_favorites_user on article_favorites(user_id, created_at desc);

-- 3) View tracking (anonymous count, not per user)
create table if not exists article_views (
  id         uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  viewed_at  timestamptz default now()
);

create index if not exists idx_article_views_article on article_views(article_id);

-- 4) RLS — articles are public-read for any signed-in user
alter table articles enable row level security;
alter table article_favorites enable row level security;
alter table article_views enable row level security;

drop policy if exists "Anyone signed-in can read published articles" on articles;
create policy "Anyone signed-in can read published articles"
  on articles for select
  using (is_published = true);

drop policy if exists "Users manage own favorites" on article_favorites;
create policy "Users manage own favorites"
  on article_favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users insert own views" on article_views;
create policy "Users insert own views"
  on article_views for insert
  with check (auth.uid() = user_id or user_id is null);

drop policy if exists "Users read own views" on article_views;
create policy "Users read own views"
  on article_views for select
  using (auth.uid() = user_id);

-- 5) Storage bucket for cover images (public read)
insert into storage.buckets (id, name, public)
values ('article-covers', 'article-covers', true)
on conflict (id) do nothing;

drop policy if exists "Public read article covers" on storage.objects;
create policy "Public read article covers"
  on storage.objects for select
  using (bucket_id = 'article-covers');

-- ============================================
-- Helper: weekly featured rotation
-- ============================================
-- Toggle weekly featured manually via update statement, e.g.:
--   update articles set is_featured = (id in ('a', 'b', 'c'));

-- Notify Supabase Realtime listeners (optional)
-- alter publication supabase_realtime add table articles;

-- ✅ Done. Run the seed script next: add-articles-seed-batch-1.sql
