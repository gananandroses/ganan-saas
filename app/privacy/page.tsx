import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "מדיניות פרטיות · גנן Pro",
  description: "כיצד גנן Pro אוסף, משתמש ומגן על המידע שלך.",
};

// NOTE TO OPERATOR (Ariel): fill in the bracketed placeholders before
// launch and have a lawyer / privacy professional review. Because the
// service stores personal data about the gardener's OWN customers,
// this policy also clarifies the gardener's role as data controller.
const BUSINESS_NAME = "גנן Pro";
const LEGAL_ENTITY = "[שם בעל העסק / חברה רשומה]";
const CONTACT_EMAIL = "support@mygananpro.com";
const LAST_UPDATED = "מאי 2026";

export default function PrivacyPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/landing" className="flex items-center gap-2 text-green-700 font-bold">
            <span className="text-xl">🌿</span> {BUSINESS_NAME}
          </Link>
          <Link href="/landing" className="text-sm text-gray-500 hover:text-gray-800">חזרה לאתר</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1">מדיניות פרטיות</h1>
        <p className="text-sm text-gray-400 mb-8">עודכן לאחרונה: {LAST_UPDATED}</p>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          <Section n="1" title="מי אנחנו">
            <p>
              {BUSINESS_NAME} (&quot;השירות&quot;), המופעל על ידי {LEGAL_ENTITY}, מכבד את פרטיותך.
              מסמך זה מסביר איזה מידע אנו אוספים, כיצד אנו משתמשים בו וכיצד אנו מגנים עליו.
              המדיניות חלה על השימוש באפליקציה ובאתר mygananpro.com.
            </p>
          </Section>

          <Section n="2" title="המידע שאנו אוספים">
            <p className="font-semibold text-gray-800">מידע שאתה מספק:</p>
            <ul className="list-disc pr-5 space-y-1.5">
              <li>פרטי הרשמה: שם, אימייל, טלפון, שם העסק, עיר.</li>
              <li>פרטי תשלום: מעובדים ישירות על ידי ספק הסליקה (Meshulam). איננו שומרים מספרי כרטיס אשראי בשרתינו.</li>
              <li>תוכן עסקי שאתה מזין: לקוחות, עבודות, הצעות מחיר, תנועות פיננסיות, ציוד ומלאי.</li>
            </ul>
            <p className="font-semibold text-gray-800 mt-3">מידע שנאסף אוטומטית:</p>
            <ul className="list-disc pr-5 space-y-1.5">
              <li>נתוני שימוש בסיסיים (עמודים שנצפו, פעולות) לצורך שיפור השירות.</li>
              <li>מידע טכני: סוג מכשיר, דפדפן, כתובת IP.</li>
              <li>מיקום גיאוגרפי משוער (geocoding של כתובות לקוחות) — לצורך תכנון מסלולים בלבד.</li>
            </ul>
          </Section>

          <Section n="3" title="מידע על הלקוחות שלך (חשוב)">
            <p>
              במסגרת השימוש בשירות, אתה מזין מידע אישי על הלקוחות שלך (שם, טלפון, כתובת).
              ביחס למידע זה, <strong>אתה &quot;בעל מאגר המידע&quot;</strong> ואנו משמשים כמעבד נתונים מטעמך בלבד.
            </p>
            <ul className="list-disc pr-5 space-y-1.5">
              <li>אתה אחראי לחוקיות איסוף המידע ולקבלת הסכמות הנדרשות מלקוחותיך.</li>
              <li>אנו לא נשתמש במידע על לקוחותיך לכל מטרה שאינה אספקת השירות אליך.</li>
              <li>אנו לא נמכור ולא נעביר מידע זה לצדדים שלישיים למטרות שיווק.</li>
            </ul>
          </Section>

          <Section n="4" title="כיצד אנו משתמשים במידע">
            <ul className="list-disc pr-5 space-y-1.5">
              <li>אספקת השירות, תפעולו ושיפורו.</li>
              <li>עיבוד תשלומים וניהול המנוי.</li>
              <li>שליחת הודעות תפעוליות (אישורים, תזכורות, עדכוני מערכת).</li>
              <li>תמיכה טכנית ומענה לפניות.</li>
              <li>אבטחה, מניעת הונאות ועמידה בדרישות חוק.</li>
            </ul>
          </Section>

          <Section n="5" title="שיתוף מידע עם צדדים שלישיים">
            <p>אנו משתפים מידע רק עם ספקי שירות חיוניים, ורק במידה הנדרשת:</p>
            <ul className="list-disc pr-5 space-y-1.5">
              <li><strong>Supabase</strong> — אחסון מסד הנתונים והאימות.</li>
              <li><strong>Vercel</strong> — אירוח האפליקציה.</li>
              <li><strong>Meshulam</strong> — עיבוד תשלומים.</li>
              <li><strong>OpenStreetMap / Nominatim</strong> — המרת כתובות לקואורדינטות (geocoding).</li>
            </ul>
            <p className="mt-2">איננו מוכרים את המידע שלך לאף גורם.</p>
          </Section>

          <Section n="6" title="הודעות WhatsApp ומייל">
            <p>
              השירות מאפשר לך לשלוח הודעות ללקוחותיך (תזכורות תשלום, תיאומים) דרך WhatsApp או מייל.
              הודעות אלה נשלחות <strong>ביוזמתך ובאחריותך</strong>, מהמספר/החשבון שלך. עליך לוודא
              שאתה פועל בהתאם לחוק (לרבות איסור דיוור פרסומי ללא הסכמה — חוק הספאם).
            </p>
          </Section>

          <Section n="7" title="אבטחת מידע">
            <p>
              אנו נוקטים באמצעי אבטחה מקובלים — הצפנה בתעבורה (HTTPS), בקרת גישה ברמת שורה (RLS)
              במסד הנתונים, וגיבויים שוטפים. עם זאת, אף מערכת אינה חסינה לחלוטין, ואיננו יכולים
              להבטיח אבטחה מוחלטת.
            </p>
          </Section>

          <Section n="8" title="שמירת מידע ומחיקתו">
            <ul className="list-disc pr-5 space-y-1.5">
              <li>אנו שומרים את המידע כל עוד חשבונך פעיל.</li>
              <li>לאחר ביטול, תוכל לייצא את הנתונים תוך 30 יום. לאחר מכן הם עשויים להימחק.</li>
              <li>חלק מהמידע עשוי להישמר לתקופה ארוכה יותר אם נדרש על פי חוק (למשל נתונים חשבונאיים).</li>
            </ul>
          </Section>

          <Section n="9" title="הזכויות שלך">
            <p>בהתאם לחוק הגנת הפרטיות, עומדות לך הזכויות הבאות:</p>
            <ul className="list-disc pr-5 space-y-1.5">
              <li>לעיין במידע שאנו מחזיקים עליך.</li>
              <li>לבקש תיקון מידע שגוי.</li>
              <li>לבקש מחיקת חשבונך והמידע הקשור אליו.</li>
              <li>לייצא את הנתונים שלך (CSV/PDF זמין בתוך האפליקציה).</li>
            </ul>
            <p className="mt-2">
              למימוש זכויות אלה ניתן לפנות אלינו ב-
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-green-700 underline">{CONTACT_EMAIL}</a>.
            </p>
          </Section>

          <Section n="10" title="עוגיות (Cookies)">
            <p>
              אנו משתמשים בעוגיות חיוניות לצורך התחברות ותפעול בסיסי של השירות. איננו משתמשים
              בעוגיות פרסום של צדדים שלישיים.
            </p>
          </Section>

          <Section n="11" title="קטינים">
            <p>השירות מיועד לבעלי עסקים בגירים (18+). איננו אוספים מידע ביודעין מקטינים.</p>
          </Section>

          <Section n="12" title="שינויים במדיניות">
            <p>
              אנו עשויים לעדכן מדיניות זו מעת לעת. שינוי מהותי יפורסם באפליקציה ו/או יישלח אליך
              במייל. תאריך העדכון האחרון מופיע בראש המסמך.
            </p>
          </Section>

          <Section n="13" title="צור קשר">
            <p>
              לכל שאלה בנושא פרטיות:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-green-700 underline">{CONTACT_EMAIL}</a>.
            </p>
          </Section>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 flex items-center gap-4 text-sm">
          <Link href="/terms" className="text-green-700 font-semibold hover:underline">תנאי שימוש</Link>
          <Link href="/landing" className="text-gray-500 hover:text-gray-800">חזרה לאתר</Link>
        </div>
      </main>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold text-gray-900 mb-2">{n}. {title}</h2>
      {children}
    </section>
  );
}
