import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "תנאי שימוש · גנן Pro",
  description: "תנאי השימוש בשירות גנן Pro לניהול עסקי גינון.",
};

// NOTE TO OPERATOR (Ariel): the bracketed placeholders below — legal
// business name, ח.פ/ע.מ number, and contact email — must be filled in
// before launch. These terms are a solid baseline but are NOT a
// substitute for a lawyer's review.
const BUSINESS_NAME = "גנן Pro";
const LEGAL_ENTITY = "גנן אנד רוזס (עוסק מורשה)";
const BUSINESS_ID = "322644113";
const CONTACT_EMAIL = "support@mygananpro.com";
const LAST_UPDATED = "מאי 2026";

export default function TermsPage() {
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
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1">תנאי שימוש</h1>
        <p className="text-sm text-gray-400 mb-8">עודכן לאחרונה: {LAST_UPDATED}</p>

        <div className="prose-legal space-y-6 text-sm text-gray-700 leading-relaxed">
          <Section n="1" title="כללי">
            <p>
              ברוכים הבאים ל-{BUSINESS_NAME} (&quot;השירות&quot;, &quot;האפליקציה&quot;), שירות תוכנה כשירות (SaaS)
              לניהול עסקי גינון, המופעל על ידי {LEGAL_ENTITY} (&quot;מפעיל השירות&quot;, &quot;אנחנו&quot;), מספר עוסק/חברה {BUSINESS_ID}.
            </p>
            <p>
              השימוש בשירות מהווה הסכמה מלאה לתנאים אלה. אם אינך מסכים — אנא הימנע משימוש בשירות.
              תנאים אלה מנוסחים בלשון זכר מטעמי נוחות בלבד ומיועדים לכל המגדרים.
            </p>
          </Section>

          <Section n="2" title="החשבון שלך">
            <ul className="list-disc pr-5 space-y-1.5">
              <li>עליך להיות בן 18 ומעלה ובעל כשירות משפטית להתקשר בהסכם.</li>
              <li>אתה אחראי לשמירת סודיות פרטי ההתחברות שלך ולכל פעילות שתתבצע בחשבונך.</li>
              <li>עליך לספק מידע נכון ומעודכן בעת ההרשמה.</li>
              <li>חשבון מיועד לשימוש עסק יחיד. שיתוף החשבון בין עסקים שונים אסור.</li>
            </ul>
          </Section>

          <Section n="3" title="תקופת ניסיון ותשלום">
            <ul className="list-disc pr-5 space-y-1.5">
              <li>חשבונות חדשים זכאים לתקופת ניסיון חינם של 14 ימים.</li>
              <li>בתום תקופת הניסיון, המשך השימוש כרוך במנוי חודשי בסך ₪99 (כולל מע&quot;מ), אלא אם צוין אחרת.</li>
              <li>החיוב מתבצע באמצעות ספק הסליקה Meshulam. אנו איננו שומרים את פרטי כרטיס האשראי שלך בשרתינו.</li>
              <li>המנוי מתחדש אוטומטית מדי חודש עד לביטולו על ידך.</li>
              <li>מחירים עשויים להשתנות בהודעה מוקדמת של 30 יום מראש.</li>
            </ul>
          </Section>

          <Section n="4" title="ביטול והחזרים">
            <ul className="list-disc pr-5 space-y-1.5">
              <li>ניתן לבטל את המנוי בכל עת מתוך האפליקציה או בפנייה אלינו. הביטול ייכנס לתוקף בתום מחזור החיוב הנוכחי.</li>
              <li>לא יינתן החזר על חלק יחסי של חודש שכבר שולם, אלא אם נדרש על פי חוק הגנת הצרכן.</li>
              <li>לאחר ביטול, תוכל לייצא את הנתונים שלך עד 30 יום, ולאחר מכן הם עשויים להימחק.</li>
            </ul>
          </Section>

          <Section n="5" title="הנתונים שלך והבעלות עליהם">
            <ul className="list-disc pr-5 space-y-1.5">
              <li>כל הנתונים שאתה מזין (לקוחות, עבודות, הצעות מחיר, נתונים פיננסיים) הם בבעלותך המלאה.</li>
              <li>אנו משמשים כמעבד נתונים בלבד לצורך אספקת השירות. ראה את <Link href="/privacy" className="text-green-700 underline">מדיניות הפרטיות</Link>.</li>
              <li>אתה אחראי לחוקיות איסוף ושמירת המידע על לקוחותיך, לרבות קבלת הסכמתם במידת הצורך.</li>
              <li>אנו מבצעים גיבויים שוטפים, אך מומלץ לייצא עותק של הנתונים החשובים שלך מעת לעת.</li>
            </ul>
          </Section>

          <Section n="6" title="שימוש מותר ואסור">
            <p>בעת השימוש בשירות, אתה מתחייב שלא:</p>
            <ul className="list-disc pr-5 space-y-1.5">
              <li>תשתמש בשירות לכל מטרה בלתי חוקית או לשליחת תוכן מטריד/פוגעני.</li>
              <li>תנסה לפרוץ, להעמיס יתר על המידה, או לשבש את פעילות השרתים.</li>
              <li>תבצע הנדסה לאחור, העתקה או מכירה של חלקי השירות.</li>
              <li>תשלח הודעות (WhatsApp/מייל) ללקוחותיך בניגוד לחוק הספאם (תיקון 40 לחוק התקשורת).</li>
            </ul>
          </Section>

          <Section n="7" title="זמינות השירות">
            <p>
              אנו שואפים לזמינות גבוהה אך איננו מתחייבים לשירות רציף וללא תקלות. ייתכנו הפסקות
              לצורכי תחזוקה, עדכונים או נסיבות שאינן בשליטתנו. לא נהיה אחראים לנזק עקיף שייגרם
              מהפסקת שירות זמנית.
            </p>
          </Section>

          <Section n="8" title="הגבלת אחריות">
            <p>
              השירות מסופק &quot;כפי שהוא&quot; (AS IS). מפעיל השירות לא יישא באחריות לכל נזק ישיר,
              עקיף, תוצאתי או מיוחד הנובע מהשימוש או מאי-היכולת להשתמש בשירות, לרבות אובדן
              רווחים, אובדן נתונים או הסתמכות על מידע באפליקציה (כגון תזכורות, חישובים פיננסיים
              או הצעות מחיר). האחריות הכוללת שלנו בכל מקרה לא תעלה על הסכום ששילמת בשלושת
              החודשים האחרונים.
            </p>
          </Section>

          <Section n="9" title="שינויים בתנאים">
            <p>
              אנו רשאים לעדכן תנאים אלה מעת לעת. שינוי מהותי יפורסם באפליקציה ו/או יישלח אליך
              במייל. המשך השימוש לאחר השינוי מהווה הסכמה לתנאים המעודכנים.
            </p>
          </Section>

          <Section n="10" title="דין וסמכות שיפוט">
            <p>
              על תנאים אלה יחולו דיני מדינת ישראל. סמכות השיפוט הבלעדית בכל מחלוקת תהיה נתונה
              לבתי המשפט המוסמכים במחוז המרכז.
            </p>
          </Section>

          <Section n="11" title="צור קשר">
            <p>
              לכל שאלה בנוגע לתנאים אלה ניתן לפנות אלינו בכתובת:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-green-700 underline">{CONTACT_EMAIL}</a>.
            </p>
          </Section>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 flex items-center gap-4 text-sm">
          <Link href="/privacy" className="text-green-700 font-semibold hover:underline">מדיניות פרטיות</Link>
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
