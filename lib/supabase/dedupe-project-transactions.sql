-- ============================================================
-- Dedupe project transactions
-- ⚠️ Run in Supabase SQL Editor
--
-- מוחק תנועות שנוצרו פעמיים לאותו פרויקט:
--   • תנועה אחת מהפרויקט (description = "פרויקט: ...")
--   • תנועה שנייה מהעבודה (description = שם העבודה)
--
-- אסטרטגיה: לכל תנועה שמתחילה ב-"פרויקט:" — אם יש תנועה אחרת
-- של אותו לקוח/אותו תאריך/אותו סכום שלא מתחילה ב-"פרויקט:" —
-- מוחקים את הזוגית (הזולה — בלי תיאור פרויקט).
-- שומרים את התנועה עם הסטטוס "שולם" אם יש כזו, אחרת זו של הפרויקט.
-- ============================================================

-- 1) Show what duplicates exist BEFORE deleting (preview)
select
  'DUPLICATE PAIR' as info,
  p.id as project_tx_id,
  p.customer_name,
  p.amount,
  p.transaction_date,
  p.description as project_desc,
  p.status as project_status,
  j.id as job_tx_id,
  j.description as job_desc,
  j.status as job_status
from transactions p
join transactions j on
  p.user_id = j.user_id
  and p.customer_name = j.customer_name
  and p.transaction_date = j.transaction_date
  and p.amount = j.amount
  and p.type = j.type
  and p.id != j.id
where p.description like 'פרויקט:%'
  and j.description not like 'פרויקט:%'
  and j.description not like 'הוצאות עבודה:%';

-- 2) DELETE the duplicate (the one WITHOUT "פרויקט:" prefix when both exist)
-- Keep the project-prefixed one, but if user marked the other as "paid" we'll preserve that status
update transactions p set status = (
  select max(j.status)
  from transactions j
  where p.user_id = j.user_id
    and p.customer_name = j.customer_name
    and p.transaction_date = j.transaction_date
    and p.amount = j.amount
    and p.type = j.type
    and p.id != j.id
    and j.description not like 'פרויקט:%'
    and j.description not like 'הוצאות עבודה:%'
    and j.status = 'paid'
  limit 1
)
where p.description like 'פרויקט:%'
  and exists (
    select 1
    from transactions j
    where p.user_id = j.user_id
      and p.customer_name = j.customer_name
      and p.transaction_date = j.transaction_date
      and p.amount = j.amount
      and p.type = j.type
      and p.id != j.id
      and j.description not like 'פרויקט:%'
      and j.description not like 'הוצאות עבודה:%'
      and j.status = 'paid'
  );

-- 3) Now delete the non-project duplicate
delete from transactions j
where j.description not like 'פרויקט:%'
  and j.description not like 'הוצאות עבודה:%'
  and exists (
    select 1
    from transactions p
    where p.user_id = j.user_id
      and p.customer_name = j.customer_name
      and p.transaction_date = j.transaction_date
      and p.amount = j.amount
      and p.type = j.type
      and p.id != j.id
      and p.description like 'פרויקט:%'
  );
