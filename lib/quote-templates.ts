// Pre-written quote templates for common gardening jobs.
//
// Every template provides:
//   • A short title shown on the gallery card
//   • A one-line description shown on the card
//   • An emoji icon (so the gallery looks alive without ten more SVGs)
//   • A `title` for the resulting quote (becomes the document headline)
//   • A `notes` block — bullets that explain the work, written in the same
//     "professional but friendly" tone as the SUMIT order #1074 reference
//   • A list of items, each with name + multi-line description (these
//     appear under the row in the table on the printed quote, exactly like
//     SUMIT does it). Customer fills in price + quantity.
//
// Placeholders the gardener edits per quote:
//   [שם לקוח]   [כתובת]   [מחיר]   [ימי עבודה]   [אחריות]
//
// Add new templates by appending to QUOTE_TEMPLATES — no UI changes needed.

export interface TemplateItem {
  /** product/service name shown bold in the row */
  name: string;
  /** unit label (e.g. "עבודה", "חומרים", "יח׳") */
  unit: string;
  /** suggested quantity — the gardener can change this */
  qty: number;
  /** suggested price (₪, before VAT). 0 = leave blank for the gardener */
  price: number;
  /** multi-line bullet description that prints below the row */
  description: string;
}

export interface QuoteTemplate {
  id: string;
  icon: string;
  title: string;          // gallery card title
  shortDesc: string;      // gallery card subtitle
  /** the resulting quote's headline */
  quoteTitle: string;
  /** the notes block at the bottom of the quote (terms, scope, etc.) */
  notes: string;
  items: TemplateItem[];
}

// ── Templates ────────────────────────────────────────────────────────────────

export const QUOTE_TEMPLATES: QuoteTemplate[] = [

  // ── 1. Recurring maintenance ──────────────────────────────────────────────
  {
    id: "maintenance",
    icon: "🌿",
    title: "אחזקה שוטפת",
    shortDesc: "ביקורי תחזוקה חודשיים — גיזום, השקיה, דישון",
    quoteTitle: "אחזקת גינה שוטפת",
    notes:
`הסכם אחזקה חודשי קבוע עבור [שם לקוח].
תדירות: ביקור [ימי עבודה] בחודש לפי תיאום מראש.
כולל: גיזום ותחזוקה כללית, השקיה, דישון עונתי, ניקוי שטח.
חומרים בסיסיים (דשנים, חוטים, חומרי הדברה ביתיים) — כלולים.
חומרים מיוחדים (שתילים, צנרת מערכת השקייה) — לא כלולים, יתומחרו בנפרד.
[אחריות] על איכות העבודה.
ההסכם בתוקף לחודש קלנדרי, מתחדש אוטומטית עד הודעה.`,
    items: [
      {
        name: "ביקור תחזוקה חודשי",
        unit: "חודש",
        qty: 1,
        price: 0,
        description: `גיזום שיחים ועצים (לפי הצורך)
ניקוי עשבי בר ופסולת צמחית
בדיקת מערכת השקיה והתאמת זרימה
דישון עונתי לפי סוג הצמחיה
פינוי גזם בסוף הביקור`,
      },
      {
        name: "טיפול בעשבייה ומחלות",
        unit: "עבודה",
        qty: 1,
        price: 0,
        description: `ריסוס נקודתי לפי הצורך
טיפול במזיקים ובמחלות עלים
סבב הדברה ביולוגית כשמתאים`,
      },
    ],
  },

  // ── 2. Garden reset / overhaul ────────────────────────────────────────────
  {
    id: "garden-reset",
    icon: "🌱",
    title: "איפוס גינה",
    shortDesc: "נקיון יסודי, עקירת צמחייה ישנה והכנה למתחיל",
    quoteTitle: "איפוס גינה — חידוש מלא",
    notes:
`איפוס יסודי של הגינה ב-[כתובת] להחזרת מצב התחלתי לקראת שתילה חדשה.
משך עבודה משוער: [ימי עבודה] ימי עבודה.
פינוי גזם וקרטונים מהמקום בסוף כל יום.
[אחריות] על העבודה והעצים שנשתלים מחדש.
* תכנון נופי וצמחייה חדשה אינם כלולים — יתומחרו בנפרד.`,
    items: [
      {
        name: "עקירה ופינוי",
        unit: "עבודה",
        qty: 1,
        price: 0,
        description: `עקירת עצים ושיחים שאינם רלוונטיים
פינוי שורשים מהאדמה
פינוי כל הגזם והפסולת מהשטח
ניקוי כללי של השטח לקראת שתילה`,
      },
      {
        name: "הכנת קרקע",
        unit: "עבודה",
        qty: 1,
        price: 0,
        description: `איוורור והפיכת קרקע
תוספת קומפוסט וטוף לשיפור הקרקע
איזון רמות חומציות
יישור מפלסים`,
      },
      {
        name: "שתילות בסיס",
        unit: "עבודה",
        qty: 1,
        price: 0,
        description: `שתילת צמחיה רב-שנתית בקווים מנחים
שתילה בקווי השקיה קיימים
דישון ראשוני`,
      },
    ],
  },

  // ── 3. Replace irrigation line ────────────────────────────────────────────
  {
    id: "irrigation-line",
    icon: "💧",
    title: "החלפת קו השקיה",
    shortDesc: "החלפה מלאה של צנרת ראשית או טפטפות",
    quoteTitle: "החלפת קו השקיה",
    notes:
`החלפה מלאה של קו השקיה קיים שלא מתפקד.
משך עבודה משוער: [ימי עבודה].
חומרים: צנרת תקנית של נטפים/פלסאון, מחברים, טפטפות.
[אחריות] שנה על העבודה ועל החומרים.
לחצי מים נבדקים לפני סיום העבודה.`,
    items: [
      {
        name: "פירוק והסרת צנרת ישנה",
        unit: "עבודה",
        qty: 1,
        price: 0,
        description: `איתור הצנרת הקיימת
פירוק מסודר
סגירת מי המקור עד סיום העבודה`,
      },
      {
        name: "הנחת קו השקיה חדש",
        unit: "מטר",
        qty: 0,
        price: 0,
        description: `צנרת ראשית חדשה
טפטפות ומפזרים לפי תכנון
מחברים ושסתומים`,
      },
      {
        name: "בדיקת לחצים והפעלה",
        unit: "עבודה",
        qty: 1,
        price: 0,
        description: `בדיקת לחץ בכל נקודה
איתור דליפות
תיאום תוכנית השקיה במחשב
מסירה ללקוח עם הדרכה`,
      },
    ],
  },

  // ── 4. Plantings ──────────────────────────────────────────────────────────
  {
    id: "plantings",
    icon: "🌳",
    title: "שתילות",
    shortDesc: "שתילי עונה, שיחים ועצים",
    quoteTitle: "שתילות חדשות",
    notes:
`שתילה של צמחיה חדשה ב-[כתובת] בהתאם להחלטה משותפת על סוגי הצמחים.
חומרים: שתילים, מצע שתילה, טוף, דשן ראשון.
[אחריות] על קליטת השתילים — בתנאי השקייה תקינה לחודש הראשון.
* פינוי קרטוני שתילים ופסולת בסוף יום העבודה.`,
    items: [
      {
        name: "צמחיה רב-שנתית",
        unit: "יח׳",
        qty: 0,
        price: 0,
        description: `שתילים מותאמים לאזור ולחשיפה לשמש
שתילה בקווי השקיה קיימים
מצע שתילה + קומפוסט
דישון ראשון`,
      },
      {
        name: "צמחיה עונתית",
        unit: "יח׳",
        qty: 0,
        price: 0,
        description: `שתילים תוססים לעונה הקרובה
שתילה בערוגות / אדניות
טוף נוי בשכבה עליונה`,
      },
      {
        name: "עבודת שתילה",
        unit: "עבודה",
        qty: 1,
        price: 0,
        description: `הכנת בורות שתילה
שתילה בקווי השקיה
טוף נוי על מצע השתילה
פינוי קרטונים`,
      },
    ],
  },

  // ── 5. Irrigation repair ──────────────────────────────────────────────────
  {
    id: "irrigation-repair",
    icon: "🔧",
    title: "תיקוני השקיה",
    shortDesc: "טיפול בדליפות, לחצים, ראשי מערכת",
    quoteTitle: "תיקוני מערכת השקיה",
    notes:
`טיפול נקודתי בקלקולים במערכת השקיה ב-[כתובת].
משך עבודה משוער: [ימי עבודה].
[אחריות] על תיקונים שבוצעו — 6 חודשים על העבודה.
* החלפת מערכת מחשב או החלפה מלאה של קווים אינן כלולות (יתומחר בנפרד).`,
    items: [
      {
        name: "איתור ותיקון דליפות",
        unit: "עבודה",
        qty: 1,
        price: 0,
        description: `סריקה כללית של המערכת
איתור נקודות דליפה
תיקון מקומי או החלפת קטעי צנרת`,
      },
      {
        name: "טיפול בראשי מערכת",
        unit: "עבודה",
        qty: 1,
        price: 0,
        description: `ניקוי וטיפול בראשי מערכת
החלפת רכיבים שאינם תקינים
בדיקת לחצים`,
      },
    ],
  },

  // ── 6. Pruning ────────────────────────────────────────────────────────────
  {
    id: "pruning",
    icon: "✂️",
    title: "גיזום",
    shortDesc: "גיזום עצים, שיחים ושיקום עיצוב",
    quoteTitle: "גיזום ועיצוב גינה",
    notes:
`גיזום מקצועי של הצמחיה ב-[כתובת] לקראת העונה.
פינוי כל הגזם בסוף יום העבודה.
[אחריות] על איכות העבודה.
* עצים גבוהים מ-4 מטרים — דורשים אישור נפרד וייתכן ובמסגרת גוזם מוסמך.`,
    items: [
      {
        name: "גיזום עצים",
        unit: "עבודה",
        qty: 1,
        price: 0,
        description: `הסרת ענפים יבשים
איוורור הצמרת
עיצוב הגזם לפי המבנה הטבעי`,
      },
      {
        name: "גיזום שיחים",
        unit: "עבודה",
        qty: 1,
        price: 0,
        description: `עיצוב מחודש של שיחי הגדר
הסרת חלקים יבשים או חולים
הכנה לעונת הצמיחה`,
      },
      {
        name: "פינוי גזם",
        unit: "פינוי",
        qty: 1,
        price: 0,
        description: `איסוף וקיפול הגזם
פינוי מהשטח לתחנת הקליטה
ניקוי השטח בסיום`,
      },
    ],
  },

  // ── 7. Garden cleanup ─────────────────────────────────────────────────────
  {
    id: "cleanup",
    icon: "🧹",
    title: "ניקוי גינה",
    shortDesc: "ניקיון יסודי, עשבייה, פינוי גזם",
    quoteTitle: "ניקוי גינה",
    notes:
`ניקיון יסודי של הגינה ב-[כתובת], כולל פינוי כל החומרים והגזם.
משך עבודה משוער: [ימי עבודה].
* לא כולל החלפת אדמה, גיזום עצים גבוהים או עבודות תשתית.`,
    items: [
      {
        name: "ניקוי כללי",
        unit: "עבודה",
        qty: 1,
        price: 0,
        description: `איסוף עלים, ענפים ופסולת
ניכוש עשבי בר
ניקוי שבילים ופינות`,
      },
      {
        name: "פינוי גזם וחומר",
        unit: "פינוי",
        qty: 1,
        price: 0,
        description: `איסוף לשקים
פינוי מהשטח לתחנת הקליטה
ניקוי השטח בסיום`,
      },
    ],
  },

  // ── 8. Install controller ─────────────────────────────────────────────────
  {
    id: "install-controller",
    icon: "📟",
    title: "התקנת מחשב השקיה",
    shortDesc: "מחשב השקיה דיגיטלי + תכנות תוכנית",
    quoteTitle: "התקנת מחשב השקיה",
    notes:
`התקנת מחשב השקיה חדש ותכנות תוכנית עונתית עבור [שם לקוח].
מחשב מוצע: דגם תקני של חברה מוכרת (גלקון / רויין-בירד / נטפים).
[אחריות] שנה על המחשב, 6 חודשים על ההתקנה.
הדרכה ללקוח על שינוי תוכניות עתידי כלולה.`,
    items: [
      {
        name: "מחשב השקיה",
        unit: "יח׳",
        qty: 1,
        price: 0,
        description: `מחשב דיגיטלי בעל מספר תחנות
תיבה אטומה למים
מתאים לתשתית קיימת`,
      },
      {
        name: "התקנה וחיווט",
        unit: "עבודה",
        qty: 1,
        price: 0,
        description: `התקנה במיקום מוגן
חיווט לתחנות קיימות
חיבור לחשמל
בדיקת תקינות`,
      },
      {
        name: "תכנות והדרכה",
        unit: "עבודה",
        qty: 1,
        price: 0,
        description: `תוכנית השקיה עונתית
התאמת ימים ושעות
הדרכה ללקוח`,
      },
    ],
  },

  // ── 9. New irrigation system ──────────────────────────────────────────────
  {
    id: "new-irrigation",
    icon: "🚿",
    title: "הקמת מערכת השקיה",
    shortDesc: "תכנון והקמה של מערכת השקיה מלאה",
    quoteTitle: "הקמת מערכת השקיה חדשה",
    notes:
`תכנון והקמה של מערכת השקיה מלאה ב-[כתובת].
משך עבודה משוער: [ימי עבודה].
חומרים: צנרת נטפים, ראש מערכת, מחשב השקיה, טפטפות ומפזרים.
[אחריות] שנתיים על העבודה, אחריות יצרן על החומרים.
מסירה ללקוח כוללת תוכנית השקיה רשומה והדרכה.`,
    items: [
      {
        name: "תכנון ומדידה",
        unit: "עבודה",
        qty: 1,
        price: 0,
        description: `מדידת השטח
תכנון תאים והקצאה
חישוב לחצים וזרימה`,
      },
      {
        name: "ראש מערכת",
        unit: "יח׳",
        qty: 1,
        price: 0,
        description: `ברז ראשי + מסנן
ווסת לחץ
חיבור למחשב השקיה`,
      },
      {
        name: "צנרת והנחה",
        unit: "מטר",
        qty: 0,
        price: 0,
        description: `צנרת ראשית 25 מ"מ
צנרת משנית
טפטפות ומפזרים`,
      },
      {
        name: "מחשב השקיה",
        unit: "יח׳",
        qty: 1,
        price: 0,
        description: `מחשב דיגיטלי
תוכנית עונתית
הדרכה ללקוח`,
      },
      {
        name: "התקנה והפעלה",
        unit: "עבודה",
        qty: 1,
        price: 0,
        description: `הנחה וחיבור הצנרת
בדיקת לחצים
תכנות והפעלה
מסירה ללקוח`,
      },
    ],
  },
];

export function getTemplate(id: string): QuoteTemplate | undefined {
  return QUOTE_TEMPLATES.find(t => t.id === id);
}
