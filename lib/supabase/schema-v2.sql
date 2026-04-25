-- ============================================
-- גנן Pro v2 — Production Schema
-- Multi-tenant: כל גנן רואה רק את הנתונים שלו
-- ============================================

-- 1. הוסף עמודת owner_id לכל הטבלאות
ALTER TABLE customers ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. טבלת פרופיל עסקי (כל גנן ממלא פעם אחת)
CREATE TABLE IF NOT EXISTS business_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  business_name TEXT NOT NULL DEFAULT 'עסק הגינון שלי',
  owner_name TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  logo_url TEXT,

  -- הגדרות
  currency TEXT DEFAULT 'ILS',
  working_days TEXT[] DEFAULT ARRAY['ראשון','שני','שלישי','רביעי','חמישי','שישי'],
  whatsapp_number TEXT,

  -- מנוי
  plan TEXT DEFAULT 'trial' CHECK (plan IN ('trial', 'basic', 'pro', 'business')),
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT
);

-- 3. עדכן RLS — כל משתמש רואה רק את שלו
DROP POLICY IF EXISTS "allow_all_customers" ON customers;
DROP POLICY IF EXISTS "allow_all_employees" ON employees;
DROP POLICY IF EXISTS "allow_all_jobs" ON jobs;
DROP POLICY IF EXISTS "allow_all_inventory" ON inventory;
DROP POLICY IF EXISTS "allow_all_transactions" ON transactions;
DROP POLICY IF EXISTS "allow_all_projects" ON projects;

-- Customers
CREATE POLICY "owner_customers" ON customers
  FOR ALL USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Employees
CREATE POLICY "owner_employees" ON employees
  FOR ALL USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Jobs
CREATE POLICY "owner_jobs" ON jobs
  FOR ALL USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Inventory
CREATE POLICY "owner_inventory" ON inventory
  FOR ALL USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Transactions
CREATE POLICY "owner_transactions" ON transactions
  FOR ALL USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Projects
CREATE POLICY "owner_projects" ON projects
  FOR ALL USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Business profiles
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_profile" ON business_profiles
  FOR ALL USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- 4. Trigger: כשמשתמש נרשם → צור פרופיל אוטומטי
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.business_profiles (owner_id, owner_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'גנן חדש'),
    NEW.email
  )
  ON CONFLICT (owner_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Function: seed נתוני דוגמה למשתמש חדש
CREATE OR REPLACE FUNCTION public.seed_demo_data(p_owner_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO customers (owner_id, name, city, address, phone, monthly_price, frequency, status, notes, tags, total_paid, balance, lat, lng, last_visit, next_visit)
  VALUES
    (p_owner_id, 'משפחת כהן', 'רעננה', 'רחוב הורד 12', '054-1234567', 450, 'פעמיים בחודש', 'vip', 'להיזהר מהכלב', ARRAY['VIP','גינה גדולה'], 8100, 0, 32.185, 34.871, CURRENT_DATE - 10, CURRENT_DATE + 4),
    (p_owner_id, 'דוד לוי', 'הרצליה', 'שד׳ בן גוריון 34', '052-9876543', 300, 'פעם בחודש', 'active', 'מעדיף בוקר', ARRAY['גינה קטנה'], 3900, 300, 32.165, 34.845, CURRENT_DATE - 15, CURRENT_DATE + 15),
    (p_owner_id, 'מלון פלאזה', 'נתניה', 'רחוב הרצל 1', '09-8765432', 3500, 'שבועי x2', 'vip', 'לקוח עסקי', ARRAY['עסקי','VIP'], 147000, 0, 32.332, 34.856, CURRENT_DATE - 1, CURRENT_DATE + 2);

  INSERT INTO employees (owner_id, name, role, phone, status, hourly_rate, hours_this_month, performance, lat, lng, avatar)
  VALUES
    (p_owner_id, 'יוסי ביטון', 'גנן ראשי', '054-1112223', 'active', 65, 142, 96, 32.185, 34.871, 'יב'),
    (p_owner_id, 'אמיר חסן', 'גנן', '052-4445556', 'active', 55, 128, 88, 32.332, 34.856, 'אח');

  INSERT INTO inventory (owner_id, name, category, quantity, unit, min_stock, price_per_unit, supplier)
  VALUES
    (p_owner_id, 'דשן NPK 20-20-20', 'דשנים', 12, 'ק"ג', 5, 28, 'אגרו-טק'),
    (p_owner_id, 'קוטל עשבים', 'ריסוסים', 3, 'ליטר', 4, 85, 'כימיקל ישראל'),
    (p_owner_id, 'שתילי ורדים', 'שתילים', 24, 'יח׳', 10, 35, 'משתלת השרון');

  INSERT INTO transactions (owner_id, customer_name, type, amount, description, status, method, transaction_date)
  VALUES
    (p_owner_id, 'מלון פלאזה', 'income', 3500, 'אחזקה חודשית', 'paid', 'transfer', CURRENT_DATE - 1),
    (p_owner_id, 'משפחת כהן', 'income', 450, 'תחזוקה חודשית', 'paid', 'bit', CURRENT_DATE - 5),
    (p_owner_id, 'דוד לוי', 'income', 300, 'כיסוח', 'pending', 'bit', CURRENT_DATE - 7);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
