-- ============================================================================
-- DEMO MODE — Seed data for the public-facing /demo experience
-- ============================================================================
-- Pre-requisite: create the demo user FIRST in Supabase Dashboard → Auth →
--   Add User. Use email = 'demo@mygananpro.com' and any password (we use
--   'GananDemo2026!' below — change in /demo route too if you change here).
--
-- This script is safe to re-run: it wipes all rows owned by the demo user
-- and rebuilds a fresh, realistic-looking dataset. Useful both for the
-- initial seed AND for the nightly cron that resets the demo.
-- ============================================================================

do $$
declare
  v_user_id uuid;
  v_today   date := current_date;
begin
  -- 1. Find the demo user
  select id into v_user_id
  from auth.users
  where email = 'demo@mygananpro.com'
  limit 1;

  if v_user_id is null then
    raise exception
      'Demo user not found. Create demo@mygananpro.com in Supabase Auth Dashboard first.';
  end if;

  raise notice 'Seeding demo data for user %', v_user_id;

  -- 2. Wipe all data owned by the demo user (in FK order)
  delete from personal_transactions   where user_id = v_user_id;
  delete from transactions            where user_id = v_user_id;
  delete from jobs                    where user_id = v_user_id;
  delete from projects                where user_id = v_user_id;
  delete from inventory               where user_id = v_user_id;
  delete from customers               where user_id = v_user_id;

  -- 3. Customers — 8 realistic gardening customers
  insert into customers (user_id, name, city, address, phone, email, monthly_price, frequency, status, notes, tags, total_paid, balance, lat, lng, last_visit, next_visit, join_date) values
    (v_user_id, 'משפחת כהן',     'רעננה',    'רחוב הורד 12, רעננה',      '054-1234567', 'cohen@example.com',   600, 'פעמיים בחודש', 'vip',    'להיזהר מהכלב בכניסה',       ARRAY['VIP','גינה גדולה','השקיה אוטומטית'], 14400, 0,    32.185, 34.871, v_today - 7,  v_today + 7,  v_today - 365),
    (v_user_id, 'דוד לוי',        'הרצליה',   'שד׳ בן גוריון 34, הרצליה',  '052-9876543', null,                  350, 'פעם בחודש',     'active', 'מעדיף עבודה בשעות הבוקר',     ARRAY['גינה קטנה','עצי פרי'],            4200,  350,  32.165, 34.845, v_today - 14, v_today + 16, v_today - 200),
    (v_user_id, 'שרה אברהם',     'כפר סבא',  'רחוב הגפן 8, כפר סבא',     '050-5551234', 'sarah@example.com',   800, 'שבועי',         'vip',    'ערוגת ורדים מיוחדת',          ARRAY['VIP','ורדים','תאורה'],            22400, 0,    32.175, 34.906, v_today - 4,  v_today + 3,  v_today - 540),
    (v_user_id, 'מלון פלאזה',     'נתניה',    'רחוב הרצל 1, נתניה',       '09-8765432',  'plaza@hotel.com',     4500, 'שבועי x2',      'vip',    'לקוח עסקי, חשבוניות חודשיות', ARRAY['עסקי','VIP','גינה גדולה מאוד'],   162000, 0,   32.332, 34.856, v_today - 3,  v_today + 4,  v_today - 730),
    (v_user_id, 'נועה שפירא',     'רמת גן',   'שד׳ ירושלים 22, רמת גן',   '054-3334445', null,                  400, 'פעמיים בחודש', 'active', 'הופנתה ע"י משפחת כהן',         ARRAY['גינת גג'],                       2400,  0,    32.082, 34.819, v_today - 10, v_today + 5,  v_today - 90),
    (v_user_id, 'יורם בן דוד',    'תל אביב',  'רחוב דיזנגוף 45, תל אביב', '050-1112222', 'yoram@example.com',   500, 'פעמיים בחודש', 'active', 'דירת גן עם בריכה',           ARRAY['בריכה','דשא'],                    7500,  500,  32.075, 34.781, v_today - 8,  v_today + 7,  v_today - 180),
    (v_user_id, 'משפחת מזרחי',   'פתח תקווה','רחוב ז׳בוטינסקי 88',         '052-3334444', null,                  450, 'פעם בחודש',     'active', 'גינת מתבגרים — אישור הורה',  ARRAY['חדש'],                            900,   450,  32.089, 34.889, v_today - 25, v_today + 5,  v_today - 60),
    (v_user_id, 'אילן רוזן',      'מודיעין',  'רחוב המתנדבים 14',           '054-5556677', 'ilan@example.com',    300, 'פעם בחודש',     'inactive', 'הפסיק שירות זמנית',        ARRAY['רדום'],                            1800,  0,    31.892, 35.007, v_today - 95, null,         v_today - 270);

  -- 4. Inventory — typical gardening supplies
  insert into inventory (user_id, name, category, quantity, unit, min_stock, price_per_unit, supplier, last_used) values
    (v_user_id, 'דשן NPK 20-20-20',     'דשנים',     12,  'שק',  3,  85,  'אגרוקש',     v_today - 5),
    (v_user_id, 'קוטל עשבים Roundup',   'כימיקלים',  4,   'ליטר',2,  120, 'אדמה',       v_today - 12),
    (v_user_id, 'שתילי ורדים',          'שתילים',    18,  'יח׳', 5,  35,  'משתלת אורן', v_today - 3),
    (v_user_id, 'דשא סינטטי',           'דשא',       2,   'גליל',1,  450, 'דשא דה-לוקס',v_today - 30),
    (v_user_id, 'טפטפות',                'השקיה',     250, 'יח׳', 100,1.5, 'נטפים',      v_today - 8),
    (v_user_id, 'שמן מנוע מכסחת',       'תחזוקה',    3,   'ליטר',2,  55,  'שטיינמץ',    v_today - 20);

  -- 5. Jobs — past completed + upcoming pending, spread across customers
  insert into jobs (user_id, customer_name, address, job_date, job_time, duration, type, status, priority, price)
    select
      v_user_id,
      c.name,
      c.address,
      v_today - (gs * 14)::int,
      '09:00'::time + (gs % 4) * interval '1 hour',
      2 + (gs % 3),
      (ARRAY['גיזום עצים','כיסוח דשא','השקיה ותחזוקה','שתילה','ריסוס'])[1 + (gs % 5)],
      'completed',
      (ARRAY['low','medium','high'])[1 + (gs % 3)],
      c.monthly_price
    from customers c
    cross join generate_series(1, 4) gs
    where c.user_id = v_user_id and c.status != 'inactive';

  -- Upcoming jobs (next 14 days)
  insert into jobs (user_id, customer_name, address, job_date, job_time, duration, type, status, priority, price)
    select
      v_user_id,
      c.name,
      c.address,
      v_today + (row_number() over (order by c.name))::int,
      '09:00'::time + ((row_number() over (order by c.name)) % 5) * interval '1 hour',
      2,
      (ARRAY['גיזום עצים','כיסוח דשא','השקיה ותחזוקה'])[1 + ((row_number() over (order by c.name))::int % 3)],
      'pending',
      'medium',
      c.monthly_price
    from customers c
    where c.user_id = v_user_id and c.status = 'vip';

  -- 6. Transactions — match completed jobs as paid income, plus some pending
  insert into transactions (user_id, customer_name, type, amount, description, status, method, transaction_date)
    select
      v_user_id,
      j.customer_name,
      'income',
      j.price,
      j.type,
      case when j.job_date < v_today - 30 then 'paid'
           when j.job_date < v_today - 7  then 'paid'
           else 'pending' end,
      (ARRAY['cash','credit','bit','transfer'])[1 + (extract(day from j.job_date)::int % 4)],
      j.job_date
    from jobs j
    where j.user_id = v_user_id and j.status = 'completed';

  -- Some expense transactions (materials, fuel, supplier purchases)
  insert into transactions (user_id, type, amount, description, status, method, transaction_date) values
    (v_user_id, 'expense', 850,  'דלק לחודש',                  'paid', 'credit',  v_today - 25),
    (v_user_id, 'expense', 1200, 'דשנים ושתילים — אגרוקש',     'paid', 'credit',  v_today - 18),
    (v_user_id, 'expense', 450,  'תחזוקה למכסחת',              'paid', 'cash',    v_today - 10),
    (v_user_id, 'expense', 320,  'אביזרי השקיה',               'paid', 'transfer',v_today - 5),
    (v_user_id, 'expense', 720,  'דלק לחודש',                  'paid', 'credit',  v_today - 55),
    (v_user_id, 'expense', 980,  'שתילים — משתלת אורן',        'paid', 'credit',  v_today - 50);

  -- 7. Projects — one active landscaping project
  insert into projects (user_id, name, customer_name, description, start_date, end_date, budget, spent, progress, status, tasks) values
    (v_user_id, 'שיפוץ גינת ממה פלאזה — קיץ 2026', 'מלון פלאזה',
      'שיפוץ גינה ראשית: גיזום עצים גדולים, החלפת מערכת השקיה, שתילת ורדים חדשים, התקנת תאורה',
      v_today - 14, v_today + 21, 28000, 12500, 45, 'active',
      ARRAY['גיזום עצים','החלפת מערכת השקיה','שתילת ורדים','התקנת תאורה','גינון סופי']),
    (v_user_id, 'גינת גג — נועה שפירא', 'נועה שפירא',
      'תכנון והקמה של גינת גג חדשה כולל אדניות, צמחיה ים-תיכונית ומערכת השקיה',
      v_today - 30, v_today - 5, 8500, 8500, 100, 'completed',
      ARRAY['תכנון','אדניות','שתילה','השקיה']);

  -- 8. Personal transactions — gives the personal cash flow demo something to show
  insert into personal_transactions (user_id, type, category, amount, description, recurrence, start_date, scope) values
    (v_user_id, 'income',  'business',     12000, 'משיכה חודשית מהעסק',         'monthly',  date_trunc('year', v_today)::date, 'personal'),
    (v_user_id, 'expense', 'housing',      4800,  'משכנתא',                     'monthly',  date_trunc('year', v_today)::date, 'personal'),
    (v_user_id, 'expense', 'car',          900,   'ליסינג',                     'monthly',  date_trunc('year', v_today)::date, 'business'),
    (v_user_id, 'expense', 'subscriptions',180,   'נטפליקס + ספוטיפיי + iCloud','monthly',  date_trunc('year', v_today)::date, 'personal'),
    (v_user_id, 'expense', 'utilities',    420,   'חשמל + מים + ארנונה',        'monthly',  date_trunc('year', v_today)::date, 'personal'),
    (v_user_id, 'expense', 'insurance',    3600,  'ביטוח רכב שנתי',             'yearly',   date_trunc('year', v_today)::date, 'business'),
    (v_user_id, 'expense', 'groceries',    2400,  'קניות מזון',                 'monthly',  date_trunc('year', v_today)::date, 'personal'),
    (v_user_id, 'expense', 'dining',       380,   'אוכל בחוץ — סוף שבוע',       'one_time', v_today - 3,                        'personal'),
    (v_user_id, 'expense', 'shopping',     650,   'נעלי עבודה חדשות',           'one_time', v_today - 7,                        'business');

  raise notice 'Demo seed complete: % customers, % jobs, % transactions, % personal txs',
    (select count(*) from customers where user_id = v_user_id),
    (select count(*) from jobs where user_id = v_user_id),
    (select count(*) from transactions where user_id = v_user_id),
    (select count(*) from personal_transactions where user_id = v_user_id);
end $$;
