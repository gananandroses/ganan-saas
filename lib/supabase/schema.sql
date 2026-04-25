-- ===========================
-- גנן Pro — Database Schema
-- ===========================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ===========================
-- CUSTOMERS (לקוחות)
-- ===========================
create table if not exists customers (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  name text not null,
  city text,
  address text,
  phone text,
  email text,
  lat double precision,
  lng double precision,

  monthly_price numeric(10,2) default 0,
  frequency text,
  status text default 'active' check (status in ('active', 'inactive', 'new', 'vip')),

  notes text,
  tags text[] default '{}',
  total_paid numeric(10,2) default 0,
  balance numeric(10,2) default 0,

  join_date date default current_date,
  last_visit date,
  next_visit date
);

-- ===========================
-- EMPLOYEES (עובדים)
-- ===========================
create table if not exists employees (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default now(),

  name text not null,
  role text,
  phone text,
  email text,
  status text default 'active' check (status in ('active', 'on_job', 'break', 'offline')),

  hourly_rate numeric(10,2) default 0,
  hours_this_month numeric(10,2) default 0,
  performance integer default 100,

  lat double precision,
  lng double precision,
  current_job text,

  join_date date default current_date,
  avatar text
);

-- ===========================
-- JOBS (עבודות)
-- ===========================
create table if not exists jobs (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  customer_id uuid references customers(id) on delete cascade,
  customer_name text,
  address text,

  job_date date not null,
  job_time time,
  duration numeric(5,2),

  type text,
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),

  assigned_to uuid[],
  price numeric(10,2) default 0,
  notes text
);

-- ===========================
-- INVENTORY (מלאי)
-- ===========================
create table if not exists inventory (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  name text not null,
  category text,
  quantity numeric(10,2) default 0,
  unit text,
  min_stock numeric(10,2) default 0,
  price_per_unit numeric(10,2) default 0,
  supplier text,
  last_used date
);

-- ===========================
-- TRANSACTIONS (עסקאות)
-- ===========================
create table if not exists transactions (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default now(),

  customer_id uuid references customers(id) on delete set null,
  customer_name text,

  type text check (type in ('income', 'expense')),
  amount numeric(10,2) not null,
  description text,
  status text default 'pending' check (status in ('paid', 'pending', 'overdue')),
  method text check (method in ('cash', 'credit', 'bit', 'transfer')),

  transaction_date date default current_date
);

-- ===========================
-- PROJECTS (פרויקטים)
-- ===========================
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  name text not null,
  customer_id uuid references customers(id) on delete set null,
  customer_name text,
  description text,

  start_date date,
  end_date date,
  budget numeric(10,2) default 0,
  spent numeric(10,2) default 0,
  progress integer default 0,

  status text default 'planning' check (status in ('planning', 'active', 'completed', 'on_hold')),
  tasks text[] default '{}'
);

-- ===========================
-- SEED DATA (נתוני דוגמה)
-- ===========================

-- Insert sample customers
insert into customers (name, city, address, phone, email, monthly_price, frequency, status, notes, tags, total_paid, balance, lat, lng, last_visit, next_visit)
values
  ('משפחת כהן', 'רעננה', 'רחוב הורד 12, רעננה', '054-1234567', 'cohen@example.com', 450, 'פעמיים בחודש', 'vip', 'להיזהר מהכלב בכניסה', ARRAY['VIP','גינה גדולה','השקיה אוטומטית'], 8100, 0, 32.185, 34.871, '2026-04-15', '2026-04-29'),
  ('דוד לוי', 'הרצליה', 'שד׳ בן גוריון 34, הרצליה', '052-9876543', null, 300, 'פעם בחודש', 'active', 'מעדיף עבודה בשעות הבוקר', ARRAY['גינה קטנה','עצי פרי'], 3900, 300, 32.165, 34.845, '2026-04-10', '2026-05-10'),
  ('שרה אברהם', 'כפר סבא', 'רחוב הגפן 8, כפר סבא', '050-5551234', 'sarah@example.com', 600, 'שבועי', 'active', 'ערוגת ורדים מיוחדת — לא לגעת ללא אישור', ARRAY['גינה גדולה','ורדים','תאורה'], 18600, 0, 32.175, 34.906, '2026-04-22', '2026-04-29'),
  ('מלון פלאזה', 'נתניה', 'רחוב הרצל 1, נתניה', '09-8765432', 'plaza@hotel.com', 3500, 'שבועי x2', 'vip', 'לקוח עסקי, חשבוניות חודשיות', ARRAY['עסקי','VIP','גינה גדולה מאוד'], 147000, 0, 32.332, 34.856, '2026-04-24', '2026-04-27'),
  ('נועה שפירא', 'רמת גן', 'שד׳ ירושלים 22, רמת גן', '054-3334445', null, 350, 'פעמיים בחודש', 'new', 'לקוחה חדשה, הופנתה ע"י משפחת כהן', ARRAY['חדש','גינת גג'], 700, 0, 32.082, 34.819, '2026-04-05', '2026-04-30')
on conflict do nothing;

-- Insert sample employees
insert into employees (name, role, phone, status, hourly_rate, hours_this_month, performance, lat, lng, join_date, avatar)
values
  ('יוסי ביטון', 'גנן ראשי', '054-1112223', 'active', 65, 142, 96, 32.185, 34.871, '2019-04-01', 'יב'),
  ('אמיר חסן', 'גנן', '052-4445556', 'active', 55, 128, 88, 32.332, 34.856, '2021-02-15', 'אח'),
  ('מיכל גרין', 'מומחית צמחים', '050-7778889', 'active', 70, 96, 99, 32.082, 34.819, '2022-09-01', 'מג'),
  ('דני אלון', 'גנן', '053-0001112', 'active', 50, 110, 82, 32.175, 34.906, '2023-03-10', 'דא'),
  ('רחל מוסה', 'עוזרת גנן', '054-2223334', 'offline', 45, 88, 85, 32.089, 34.889, '2024-01-20', 'רמ')
on conflict do nothing;

-- Insert sample inventory
insert into inventory (name, category, quantity, unit, min_stock, price_per_unit, supplier, last_used)
values
  ('דשן NPK 20-20-20', 'דשנים', 12, 'ק"ג', 5, 28, 'אגרו-טק', '2026-04-22'),
  ('קוטל עשבים Roundup', 'ריסוסים', 3, 'ליטר', 4, 85, 'כימיקל ישראל', '2026-04-20'),
  ('שתילי ורדים', 'שתילים', 24, 'יח׳', 10, 35, 'משתלת השרון', '2026-04-18'),
  ('דשא סינטטי (גליל)', 'חומרים', 2, 'גליל', 1, 1200, 'גרין-לייף', '2026-04-10'),
  ('טפטפות Q2', 'השקיה', 85, 'יח׳', 50, 4.5, 'נטפים', '2026-04-15'),
  ('שמן מנוע מכסחת', 'ציוד', 2, 'ליטר', 3, 45, 'סנפרוסט', '2026-04-01')
on conflict do nothing;

-- Insert sample transactions
insert into transactions (customer_name, type, amount, description, status, method, transaction_date)
values
  ('מלון פלאזה', 'income', 3500, 'אחזקה חודשית אפריל', 'paid', 'transfer', '2026-04-24'),
  ('משפחת כהן', 'income', 225, 'כיסוח + גיזום', 'paid', 'bit', '2026-04-22'),
  ('שרה אברהם', 'income', 300, 'תחזוקה שבועית', 'paid', 'cash', '2026-04-20'),
  ('דוד לוי', 'income', 300, 'כיסוח חודשי', 'pending', 'bit', '2026-04-18'),
  ('נועה שפירא', 'income', 350, 'שתילה ראשונית', 'paid', 'credit', '2026-04-15'),
  ('ספק — אגרו-טק', 'expense', 840, 'קניית דשנים וריסוסים', 'paid', 'transfer', '2026-04-08')
on conflict do nothing;

-- ===========================
-- ROW LEVEL SECURITY (RLS)
-- ===========================
alter table customers enable row level security;
alter table employees enable row level security;
alter table jobs enable row level security;
alter table inventory enable row level security;
alter table transactions enable row level security;
alter table projects enable row level security;

-- Allow all operations for now (נרחיב עם auth בהמשך)
create policy "allow_all_customers" on customers for all using (true);
create policy "allow_all_employees" on employees for all using (true);
create policy "allow_all_jobs" on jobs for all using (true);
create policy "allow_all_inventory" on inventory for all using (true);
create policy "allow_all_transactions" on transactions for all using (true);
create policy "allow_all_projects" on projects for all using (true);
