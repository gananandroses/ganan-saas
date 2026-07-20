# מעקב תרגום (i18n) — עברית / אנגלית / ערבית / רוסית

תשתית: `next-intl`, ללא ניתוב מבוסס-URL. locale נקבע מ-cookie `NEXT_LOCALE`,
עם `user_profile.preferred_language` כמקור אמת (נבחר ב-/settings, מסונכרן
בכניסה למערכת דרך `components/LocaleSync.tsx`). ראו `lib/locale.ts` להגדרות
(`SUPPORTED_LOCALES`, `RTL_LOCALES`, `getDirection`, `LOCALE_TAGS`).

מפתחות תרגום חיים ב-`messages/{he,en,ar,ru}.json`, מחולקים ל-namespaces:
`common`, `nav`, `header`, `dashboard`, `settings`.

**חשוב:** יש להריץ ידנית את `lib/supabase/add-language-preference-migration.sql`
ב-Supabase SQL Editor (מוסיף את העמודה `preferred_language`).

## ✅ Phase 1 — הושלם

- תשתית i18n מלאה (next-intl, cookie, DB sync, RTL/LTR דינמי).
- `components/Sidebar.tsx` — תורגם + Tailwind logical properties.
- `components/MobileMenu.tsx` — תורגם + logical properties.
- `components/Header.tsx` — תורגם במלואו (חיפוש, התראות, קטגוריות, מודלים) + logical properties.
- `components/AuthGuard.tsx` — מרכיב את `LocaleSync`.
- `app/dashboard/page.tsx` — **ה-UI הראשי תורגם** (KPI cards, מודל פירוט,
  גרף הכנסות/הוצאות, עבודות קרובות, פעולות מהירות, HERO greeting).
- `app/settings/page.tsx` — נוסף כרטיס "שפה" חדש (`LanguageCard`) לבחירת
  שפה, שומר ל-DB + cookie + reload.

### ⚠️ נשאר לא מתורגם בתוך app/dashboard/page.tsx (במכוון, לפעימה הבאה)
- הצ'ק־ליסט היומי (הוספה/מחיקה/תיוג משימות) — טקסט קבוע בעברית.
- באנר "הפעל התראות לתזכורות יומיות".
- הודעות toast (`toast.success/error/info`) בקובץ זה.
- `CITY_COORDS` — מילון נתונים (שמות ערים בעברית), לא UI טקסט; ישפיע רק על
  ברירת המחדל של מזג האוויר, לא קריטי לתרגום.

### ⚠️ נשאר לא מתורגם בתוך app/settings/page.tsx
- כל שאר הדף (פרטי עסק, תבנית הצעת מחיר, תווי אמון, עדויות, סליקה,
  חשבון, התראות, יעדים, מע״מ) — נשאר בעברית hardcoded. רק כרטיס השפה עצמו תורגם.

## ⬜ לא בוצע כלל — פעימות הבאות

מודולים מלאים (כל טקסט ה-UI + לעיתים המרת CSS ל-logical properties):

- `/customers` — CRM
- `/schedule` — לוח זמנים / יומן
- `/finance` — פיננסים
- `/inventory` — ציוד ומלאי
- `/projects` — פרויקטים
- `/portfolio` — תיק עבודות
- `/pricer` — מחירון
- `/quote` — הצעת מחיר (טופס יצירה)
- `/employees` — עובדים
- `/analytics` — אנליטיקה
- `/articles` — ידע/מאמרים
- `/end-of-day` — סיכום יום

דפים ציבוריים (ללא auth) — לא נגענו בהם, נשארים בעברית:
- `/`, `/landing`, `/tour`, `/demo`, `/login`, `/register`, `/terms`, `/privacy`

מסמכים/PDF:
- `components/QuoteDocument.tsx` — טקסט קבוע בעברית להצעת מחיר מודפסת;
  ידרוש טיפול נפרד (פורמט הדפסה, לא רק `useTranslations`).

## דפוסים לשימוש חוזר (ראו את הקוד הקיים לדוגמה)

- **מבנה נתונים שצריך תרגום** (למשל `navGroups`, `CATEGORY_META`): שמרו
  `labelKey`/`titleKey` במקום מחרוזת, ופתרו עם `t(key)` בתוך הרנדור.
- **קומפוננטה מקוננת שאינה זו שקראה ל-`useTranslations`**: העבירו את `t`
  כ-prop מוקלד `ReturnType<typeof useTranslations>` (ראו `DetailModal`,
  `CustomBarTooltip`, `DebtorsCard` ב-dashboard, ו-`SchedulingSection` ב-Header).
- **פורמט תאריכים/מספרים**: השתמשו ב-`LOCALE_TAGS[locale]` מ-`lib/locale.ts`
  במקום `"he-IL"` קבוע (למשל `amount.toLocaleString(LOCALE_TAGS[locale])`).
- **RTL/LTR**: `const dir = getDirection(locale)`, והזרימו ל-`dir={dir}`
  על קונטיינרים; המירו Tailwind physical→logical (`pl/pr/ml/mr/right/left/text-right/text-left`
  → `ps/pe/ms/me/start/end/text-start/text-end`).
