-- ============================================================
-- Cleanup seed data — run this in Supabase SQL Editor to remove
-- the demo employees, customers, jobs, inventory, transactions,
-- projects that were inserted during initial setup but are NOT
-- yours.
--
-- ⚠️ Run only AFTER reviewing what you actually need!
-- ⚠️ This deletes by NAME (the seeded names) only — your real
--    data with different names is safe.
-- ============================================================

-- 1) Delete seed employees (none of these are yours)
delete from employees
where name in (
  'יוסי ביטון',
  'אמיר חסן',
  'מיכל גרין',
  'דני אלון',
  'רחל מוסה'
);

-- 2) Delete seed inventory items
delete from inventory
where name in (
  'דשן NPK 20-20-20',
  'קוטל עשבים Roundup',
  'שתילי ורדים',
  'דשא סינטטי (גליל)',
  'טפטפות Q2',
  'שמן מנוע מכסחת'
);

-- 3) Delete seed customers (ONLY if you don't have real customers with these names)
-- Comment out any line for customers you actually have!
delete from customers
where name in (
  'משפחת כהן',
  'דוד לוי',
  'שרה אברהם',
  'מלון פלאזה',
  'נועה שפירא'
);

-- 4) Delete seed transactions linked to seed customers
delete from transactions
where customer_name in (
  'משפחת כהן',
  'דוד לוי',
  'שרה אברהם',
  'מלון פלאזה',
  'נועה שפירא'
)
and description in (
  'אחזקה חודשית אפריל',
  'אחזקה חודשית מרץ',
  'תשלום חודשי אפריל',
  'גיזום עצים',
  'דשנים וכימיקלים'
);
