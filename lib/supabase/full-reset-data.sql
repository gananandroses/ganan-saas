-- ============================================================
-- FULL DATA RESET — מוחק את כל הנתונים שלך מהמערכת
-- ⚠️ זה ימחק:
--   • כל העובדים
--   • כל הלקוחות (ועסקאות + עבודות מקושרות יחד איתם)
--   • כל העבודות
--   • כל העסקאות הפיננסיות
--   • כל הפרויקטים
--   • כל פריטי המלאי
--
-- ⚠️ זה לא ימחק:
--   • הפרופיל שלך / פרטי תשלום בהגדרות
--   • התחברות / סיסמה
--   • התבניות שערכת ב-localStorage
--
-- אחרי הריצה — תקבל מערכת ריקה ונקייה. כל הקלפים
-- בדשבורד ובאנליטיקה יראו 0/—.
-- ============================================================

-- 1) Delete all jobs (depends on customers)
delete from jobs;

-- 2) Delete all transactions
delete from transactions;

-- 3) Delete all projects
delete from projects;

-- 4) Delete all customers
delete from customers;

-- 5) Delete all employees
delete from employees;

-- 6) Delete all inventory
delete from inventory;
