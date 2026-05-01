export interface PriceItem {
  id: string;
  name: string;
  unit: string;         // יחידת מידה: מ"ר, מ', יח', טון, ק"ג, שק וכו'
  price: number;        // מחיר ממוצע סיטונאי בשקלים
  category: string;
  notes?: string;
}

export interface PriceCategory {
  key: string;
  label: string;
  emoji: string;
}

export const PRICE_CATEGORIES: PriceCategory[] = [
  { key: "all",         label: "הכל",              emoji: "📋" },
  { key: "stones",      label: "אבנים וסלעים",      emoji: "🪨" },
  { key: "grass",       label: "דשא",               emoji: "🌿" },
  { key: "plants",      label: "צמחים",             emoji: "🌱" },
  { key: "planters",    label: "אדניות וכדים",      emoji: "🪴" },
  { key: "irrigation",  label: "השקיה",             emoji: "💧" },
  { key: "soil",        label: "קרקע ומצעים",       emoji: "🌍" },
  { key: "pavers",      label: "ריצוף ושבילים",     emoji: "🏗️" },
  { key: "fencing",     label: "גדרות ומסכים",      emoji: "🔒" },
  { key: "lighting",    label: "תאורת גינה",        emoji: "💡" },
  { key: "tools",       label: "ציוד ושונות",       emoji: "🔧" },
  { key: "labor",       label: "עבודה",             emoji: "👷" },
];

export const PRICE_LIST: PriceItem[] = [

  // ══════════════════════════════════════════
  // 🪨 אבנים וסלעים
  // ══════════════════════════════════════════
  { id: "s001", category: "stones", name: "חצץ לבן 8–16 מ\"מ",              unit: "טון",  price: 85 },
  { id: "s002", category: "stones", name: "חצץ שחור בזלת 8–16 מ\"מ",        unit: "טון",  price: 120 },
  { id: "s003", category: "stones", name: "חצץ אדום (אדמית)",              unit: "טון",  price: 95 },
  { id: "s004", category: "stones", name: "חצץ צהוב ים-תיכוני",            unit: "טון",  price: 90 },
  { id: "s005", category: "stones", name: "שפכת גרנוליט לבן",              unit: "טון",  price: 75 },
  { id: "s006", category: "stones", name: "אבן כורכר מסותתת 30×60",        unit: "מ\"ר", price: 85,  notes: "עובי 3 סמ" },
  { id: "s007", category: "stones", name: "אבן כורכר 40×40",               unit: "מ\"ר", price: 75 },
  { id: "s008", category: "stones", name: "אבן גרניט אפור 40×40",          unit: "מ\"ר", price: 145 },
  { id: "s009", category: "stones", name: "אבן גרניט שחור 60×60",          unit: "מ\"ר", price: 185 },
  { id: "s010", category: "stones", name: "אבן צפחה טבעית משתנה",          unit: "מ\"ר", price: 160 },
  { id: "s011", category: "stones", name: "אבן בזלת מסותתת 40×40",         unit: "מ\"ר", price: 130 },
  { id: "s012", category: "stones", name: "אבן קוורץ לבן 30×60",           unit: "מ\"ר", price: 175 },
  { id: "s013", category: "stones", name: "אבני מדרך כורכר קטנות",         unit: "מ\"ר", price: 65 },
  { id: "s014", category: "stones", name: "אבני מדרך בזלת גדולות",         unit: "מ\"ר", price: 110 },
  { id: "s015", category: "stones", name: "סלעי נוי בזלת",                 unit: "ק\"ג", price: 2.8 },
  { id: "s016", category: "stones", name: "סלעי נוי גרניט",                unit: "ק\"ג", price: 3.5 },
  { id: "s017", category: "stones", name: "סלעי נוי גיר לבנים",            unit: "ק\"ג", price: 2.2 },
  { id: "s018", category: "stones", name: "לוחות צפחה גדולים (stepping stones)", unit: "יח'", price: 45 },
  { id: "s019", category: "stones", name: "אבן שטוחה טבעית לשביל",         unit: "מ\"ר", price: 120 },
  { id: "s020", category: "stones", name: "חול בנייה גס",                  unit: "טון",  price: 55 },
  { id: "s021", category: "stones", name: "אשפה (חצץ 0–4)",               unit: "טון",  price: 50 },
  { id: "s022", category: "stones", name: "בולדרים בזלת גדולים",           unit: "יח'",  price: 180, notes: "בקוטר ~40 סמ" },
  { id: "s023", category: "stones", name: "אבן גזית טבעית לבנייה",         unit: "מ\"ר", price: 220 },
  { id: "s024", category: "stones", name: "חצץ גרניט מעורב",               unit: "טון",  price: 135 },
  { id: "s025", category: "stones", name: "אריחי קוורץ לבן 20×20",         unit: "מ\"ר", price: 155 },

  // ══════════════════════════════════════════
  // 🌿 דשא
  // ══════════════════════════════════════════
  { id: "g001", category: "grass", name: "דשא סינטטי 25 מ\"מ",             unit: "מ\"ר", price: 85 },
  { id: "g002", category: "grass", name: "דשא סינטטי 35 מ\"מ",             unit: "מ\"ר", price: 110 },
  { id: "g003", category: "grass", name: "דשא סינטטי 45 מ\"מ פרימיום",     unit: "מ\"ר", price: 140 },
  { id: "g004", category: "grass", name: "דשא סינטטי 50+ מ\"מ ספורט",      unit: "מ\"ר", price: 165 },
  { id: "g005", category: "grass", name: "גליל דשא טבעי זויסיה",           unit: "מ\"ר", price: 22 },
  { id: "g006", category: "grass", name: "גליל דשא טבעי ברמודה",           unit: "מ\"ר", price: 18 },
  { id: "g007", category: "grass", name: "גליל דשא טבעי פסקיו",            unit: "מ\"ר", price: 25 },
  { id: "g008", category: "grass", name: "זרע דשא קיץ (ברמודה)",           unit: "ק\"ג", price: 30 },
  { id: "g009", category: "grass", name: "זרע דשא חורף (ריי גראס)",        unit: "ק\"ג", price: 22 },
  { id: "g010", category: "grass", name: "מצע לדשא סינטטי (דולומיט+חול)", unit: "מ\"ר", price: 18, notes: "שכבה 5 סמ" },
  { id: "g011", category: "grass", name: "גרנולס מילוי לדשא סינטטי",       unit: "ק\"ג", price: 3.5 },
  { id: "g012", category: "grass", name: "סרט הדבקה לדשא סינטטי",         unit: "מ'",   price: 8 },
  { id: "g013", category: "grass", name: "סיכות קיבוע לדשא סינטטי",        unit: "יח'",  price: 1.2 },
  { id: "g014", category: "grass", name: "דשא סינטטי לגג/מרפסת 10 מ\"מ",  unit: "מ\"ר", price: 55 },

  // ══════════════════════════════════════════
  // 🌱 צמחים
  // ══════════════════════════════════════════
  { id: "p001", category: "plants", name: "עציץ 12 סמ — עונתי",            unit: "יח'",  price: 12 },
  { id: "p002", category: "plants", name: "עציץ 12 סמ — רב שנתי",          unit: "יח'",  price: 18 },
  { id: "p003", category: "plants", name: "עציץ 12 סמ — שיח קטן",          unit: "יח'",  price: 20 },
  { id: "p004", category: "plants", name: "עציץ 4 ליטר — שיח",             unit: "יח'",  price: 28 },
  { id: "p005", category: "plants", name: "עציץ 4 ליטר — פרחוני",          unit: "יח'",  price: 32 },
  { id: "p006", category: "plants", name: "עציץ 10 ליטר — שיח",            unit: "יח'",  price: 55 },
  { id: "p007", category: "plants", name: "עציץ 10 ליטר — עץ קטן",         unit: "יח'",  price: 70 },
  { id: "p008", category: "plants", name: "עציץ 25 ליטר — עץ",             unit: "יח'",  price: 140 },
  { id: "p009", category: "plants", name: "עציץ 25 ליטר — דקל קטן",        unit: "יח'",  price: 180 },
  { id: "p010", category: "plants", name: "עציץ 50 ליטר — עץ בוגר",        unit: "יח'",  price: 320 },
  { id: "p011", category: "plants", name: "עציץ 50 ליטר — דקל",            unit: "יח'",  price: 420 },
  { id: "p012", category: "plants", name: "עץ בוגר 100+ ליטר",             unit: "יח'",  price: 850, notes: "לא כולל שתילה" },
  { id: "p013", category: "plants", name: "גדר חיה — שתיל 4L (ליניארי)",  unit: "מ'",   price: 55,  notes: "כ-3 שתילים למטר" },
  { id: "p014", category: "plants", name: "כיסוי קרקע — שתיל 12 סמ",       unit: "מ\"ר", price: 65,  notes: "כ-6 שתילים למ\"ר" },
  { id: "p015", category: "plants", name: "ורד שיח 4 ליטר",                unit: "יח'",  price: 38 },
  { id: "p016", category: "plants", name: "ורד מטפס 4 ליטר",               unit: "יח'",  price: 42 },
  { id: "p017", category: "plants", name: "דקל האריקה 25 ליטר",            unit: "יח'",  price: 220 },
  { id: "p018", category: "plants", name: "בוגנוויליה 10 ליטר",            unit: "יח'",  price: 75 },
  { id: "p019", category: "plants", name: "עץ פרי 25 ליטר (הדר/מנגו/אבוקדו)", unit: "יח'", price: 165 },
  { id: "p020", category: "plants", name: "עץ פרי 50 ליטר בוגר",           unit: "יח'",  price: 380 },

  // ══════════════════════════════════════════
  // 🪴 אדניות וכדים
  // ══════════════════════════════════════════
  { id: "pl001", category: "planters", name: "אדנית פיברגלס מלבנית קטנה (60×20)",  unit: "יח'", price: 180 },
  { id: "pl002", category: "planters", name: "אדנית פיברגלס מלבנית בינונית (80×25)", unit: "יח'", price: 250 },
  { id: "pl003", category: "planters", name: "אדנית פיברגלס מלבנית גדולה (100×30)", unit: "יח'", price: 350 },
  { id: "pl004", category: "planters", name: "אדנית פיברגלס עגולה 40 סמ",          unit: "יח'", price: 160 },
  { id: "pl005", category: "planters", name: "אדנית פיברגלס עגולה 60 סמ",          unit: "יח'", price: 280 },
  { id: "pl006", category: "planters", name: "אדנית פיברגלס עגולה 80 סמ",          unit: "יח'", price: 420 },
  { id: "pl007", category: "planters", name: "אדנית בטון מלבנית קטנה",             unit: "יח'", price: 220 },
  { id: "pl008", category: "planters", name: "אדנית בטון מלבנית גדולה",            unit: "יח'", price: 480 },
  { id: "pl009", category: "planters", name: "כד חרס קטן (25–30 סמ)",              unit: "יח'", price: 35 },
  { id: "pl010", category: "planters", name: "כד חרס בינוני (35–45 סמ)",           unit: "יח'", price: 75 },
  { id: "pl011", category: "planters", name: "כד חרס גדול (50–60 סמ)",             unit: "יח'", price: 150 },
  { id: "pl012", category: "planters", name: "כד חרס ענק (70–80 סמ)",              unit: "יח'", price: 320 },
  { id: "pl013", category: "planters", name: "כד פולי (פלסטיק) שחור 30 סמ",       unit: "יח'", price: 22 },
  { id: "pl014", category: "planters", name: "כד פולי שחור 50 סמ",                unit: "יח'", price: 55 },
  { id: "pl015", category: "planters", name: "כד פולי שחור 70 סמ",                unit: "יח'", price: 95 },
  { id: "pl016", category: "planters", name: "תלתל/עציץ תלוי",                    unit: "יח'", price: 45 },
  { id: "pl017", category: "planters", name: "אדנית עץ מעובד (composite)",         unit: "יח'", price: 380 },
  { id: "pl018", category: "planters", name: "גינת אדניות מעץ ברוש (raised bed)",  unit: "יח'", price: 550, notes: "120×60×40 סמ" },

  // ══════════════════════════════════════════
  // 💧 השקיה
  // ══════════════════════════════════════════
  { id: "i001", category: "irrigation", name: "מחשב השקיה גלקון 9V",              unit: "יח'", price: 180 },
  { id: "i002", category: "irrigation", name: "מחשב השקיה גלקון 9V כפול",         unit: "יח'", price: 280 },
  { id: "i003", category: "irrigation", name: "מחשב השקיה Hunter Wifi",           unit: "יח'", price: 450 },
  { id: "i004", category: "irrigation", name: "מגוף (סולנואיד) 24V",              unit: "יח'", price: 95 },
  { id: "i005", category: "irrigation", name: "מגוף (סולנואיד) 9V",               unit: "יח'", price: 110 },
  { id: "i006", category: "irrigation", name: "טפטפת ויסות עצמי (PC) 2 ל\"ש",    unit: "יח'", price: 1.8 },
  { id: "i007", category: "irrigation", name: "טפטפת ויסות עצמי (PC) 4 ל\"ש",    unit: "יח'", price: 2.0 },
  { id: "i008", category: "irrigation", name: "מתז ספרינקלר פופ-אפ",              unit: "יח'", price: 22 },
  { id: "i009", category: "irrigation", name: "ראש ספרינקלר רוטור Hunter",         unit: "יח'", price: 45 },
  // קו הובלה עיוור
  { id: "i010",  category: "irrigation", name: "צינור PE 8 מ\"מ עיוור",             unit: "מ'",  price: 0 },
  { id: "i010b", category: "irrigation", name: "צינור PE 16 מ\"מ עיוור",            unit: "מ'",  price: 2.2 },
  { id: "i011",  category: "irrigation", name: "צינור PE 20 מ\"מ עיוור",            unit: "מ'",  price: 3.5 },
  { id: "i012",  category: "irrigation", name: "צינור PE 25 מ\"מ עיוור",            unit: "מ'",  price: 5.5 },
  { id: "i013",  category: "irrigation", name: "צינור PE 32 מ\"מ עיוור",            unit: "מ'",  price: 8.5 },
  // לנד ליין
  { id: "i027",  category: "irrigation", name: "לנד ליין 8 מ\"מ עיוור",             unit: "מ'",  price: 0 },
  { id: "i028",  category: "irrigation", name: "לנד ליין 8 מ\"מ טפטוף",             unit: "מ'",  price: 0 },
  { id: "i029",  category: "irrigation", name: "לנד ליין 16 מ\"מ עיוור",            unit: "מ'",  price: 0 },
  { id: "i030",  category: "irrigation", name: "לנד ליין 16 מ\"מ טפטוף",            unit: "מ'",  price: 0 },
  { id: "i031",  category: "irrigation", name: "לנד ליין 20 מ\"מ עיוור",            unit: "מ'",  price: 0 },
  // קו טפטוף מובנה
  { id: "i032",  category: "irrigation", name: "קו טפטוף 16 מ\"מ — 30 ס\"מ מרווח", unit: "מ'",  price: 0 },
  { id: "i033",  category: "irrigation", name: "קו טפטוף 16 מ\"מ — 50 ס\"מ מרווח", unit: "מ'",  price: 0 },
  { id: "i034",  category: "irrigation", name: "קו טפטוף 16 מ\"מ — 100 ס\"מ מרווח",unit: "מ'",  price: 0 },
  { id: "i014", category: "irrigation", name: "מחבר T 16 מ\"מ",                   unit: "יח'", price: 1.5 },
  { id: "i015", category: "irrigation", name: "מחבר ישר 16 מ\"מ",                 unit: "יח'", price: 1.2 },
  { id: "i016", category: "irrigation", name: "ברך 16 מ\"מ",                      unit: "יח'", price: 1.4 },
  { id: "i017", category: "irrigation", name: "פקק קצה 16 מ\"מ",                  unit: "יח'", price: 0.8 },
  { id: "i018", category: "irrigation", name: "מסנן רשת ¾\"",                    unit: "יח'", price: 35 },
  { id: "i019", category: "irrigation", name: "מקטין לחץ",                       unit: "יח'", price: 45 },
  { id: "i020", category: "irrigation", name: "חיישן גשם",                       unit: "יח'", price: 65 },
  { id: "i021", category: "irrigation", name: "משאבת דשן (פרופורציונל)",          unit: "יח'", price: 220 },
  { id: "i022", category: "irrigation", name: "שסתום אוויר (ונטוז) ½\"",         unit: "יח'", price: 55 },
  { id: "i023", category: "irrigation", name: "ברז מאסטר ¾\"",                   unit: "יח'", price: 75 },
  { id: "i024", category: "irrigation", name: "ערפלן מרפסת",                     unit: "יח'", price: 18 },
  { id: "i025", category: "irrigation", name: "צינור ערפול 6 מ\"מ (מ')",          unit: "מ'",  price: 4.5 },
  { id: "i026", category: "irrigation", name: "ראש פופ-אפ 4\" עם דיזה",          unit: "יח'", price: 38 },

  // ══════════════════════════════════════════
  // 🌍 קרקע ומצעים
  // ══════════════════════════════════════════
  { id: "so001", category: "soil", name: "אדמה שחורה (שק 50 ליטר)",            unit: "שק",  price: 22 },
  { id: "so002", category: "soil", name: "אדמה שחורה (גוש)",                   unit: "מ\"ק", price: 180 },
  { id: "so003", category: "soil", name: "מצע שתילה אוניברסלי (שק 50 ליטר)",  unit: "שק",  price: 28 },
  { id: "so004", category: "soil", name: "קומפוסט בוגר (שק 40 ליטר)",          unit: "שק",  price: 25 },
  { id: "so005", category: "soil", name: "פרלייט (שק 100 ליטר)",               unit: "שק",  price: 55 },
  { id: "so006", category: "soil", name: "כבול (שק 70 ליטר)",                  unit: "שק",  price: 45 },
  { id: "so007", category: "soil", name: "טוף גרוס (שק 50 ליטר)",              unit: "שק",  price: 38 },
  { id: "so008", category: "soil", name: "ורמיקוליט (שק 100 ליטר)",            unit: "שק",  price: 65 },
  { id: "so009", category: "soil", name: "מולצ' שבבי עץ (שק 60 ליטר)",        unit: "שק",  price: 32 },
  { id: "so010", category: "soil", name: "מולצ' טאף (שק 50 ליטר)",             unit: "שק",  price: 28 },
  { id: "so011", category: "soil", name: "מולצ' קליפות (שק 60 ליטר)",          unit: "שק",  price: 35 },
  { id: "so012", category: "soil", name: "יריעת מניעת עשבים (רוחב 1.5 מ')",   unit: "מ'",  price: 5.5 },
  { id: "so013", category: "soil", name: "יריעת מניעת עשבים (רוחב 2 מ')",     unit: "מ'",  price: 7.5 },
  { id: "so014", category: "soil", name: "אוסמוקוט שחרור מבוקר 8-9 חודש",     unit: "ק\"ג", price: 28 },
  { id: "so015", category: "soil", name: "דשן NPK כללי (שק 25 ק\"ג)",          unit: "שק",  price: 85 },
  { id: "so016", category: "soil", name: "כלאט ברזל (סקווסטרין)",              unit: "ק\"ג", price: 45 },
  { id: "so017", category: "soil", name: "גפרית גרנולרית להחמצת קרקע",        unit: "ק\"ג", price: 12 },

  // ══════════════════════════════════════════
  // 🏗️ ריצוף ושבילים
  // ══════════════════════════════════════════
  { id: "pv001", category: "pavers", name: "ריצוף טרצו 40×40",                unit: "מ\"ר", price: 65 },
  { id: "pv002", category: "pavers", name: "ריצוף טרצו 60×60",                unit: "מ\"ר", price: 85 },
  { id: "pv003", category: "pavers", name: "אריחי פורצלן 60×60",              unit: "מ\"ר", price: 130 },
  { id: "pv004", category: "pavers", name: "אריחי פורצלן 80×80",              unit: "מ\"ר", price: 165 },
  { id: "pv005", category: "pavers", name: "דק WPC (עץ-פלסטיק)",              unit: "מ\"ר", price: 220 },
  { id: "pv006", category: "pavers", name: "דק עץ טבעי (איפאה/טיק)",          unit: "מ\"ר", price: 350 },
  { id: "pv007", category: "pavers", name: "בטון מוטבע דקורטיבי",             unit: "מ\"ר", price: 280 },
  { id: "pv008", category: "pavers", name: "אבני פייבר/כביש",                 unit: "מ\"ר", price: 95 },
  { id: "pv009", category: "pavers", name: "שכבת יסוד (אשפה+חול)",           unit: "מ\"ר", price: 35, notes: "עובי 10 סמ" },
  { id: "pv010", category: "pavers", name: "מלט הדבקה לאריחים",               unit: "שק",  price: 38, notes: "שק 25 ק\"ג" },
  { id: "pv011", category: "pavers", name: "פוגה (סיוד תפרים)",               unit: "שק",  price: 32 },
  { id: "pv012", category: "pavers", name: "פנל גישה — מכסה תקשורת/השקיה",   unit: "יח'", price: 45 },

  // ══════════════════════════════════════════
  // 🔒 גדרות ומסכים
  // ══════════════════════════════════════════
  { id: "f001", category: "fencing", name: "רשת צל 70% (רוחב 2 מ')",          unit: "מ'",  price: 18 },
  { id: "f002", category: "fencing", name: "רשת צל 90% (רוחב 2 מ')",          unit: "מ'",  price: 24 },
  { id: "f003", category: "fencing", name: "גדר רשת ברזל (גובה 1.2 מ')",      unit: "מ'",  price: 55 },
  { id: "f004", category: "fencing", name: "גדר רשת ברזל (גובה 1.8 מ')",      unit: "מ'",  price: 75 },
  { id: "f005", category: "fencing", name: "גדר עץ מעובד (גובה 1.5 מ')",      unit: "מ'",  price: 180 },
  { id: "f006", category: "fencing", name: "פרגולה עץ מעובד (למ\"ר גג)",      unit: "מ\"ר", price: 380 },
  { id: "f007", category: "fencing", name: "פרגולה אלומיניום (למ\"ר גג)",     unit: "מ\"ר", price: 450 },
  { id: "f008", category: "fencing", name: "גדר אלומיניום (גובה 1.8 מ')",     unit: "מ'",  price: 220 },
  { id: "f009", category: "fencing", name: "עמוד גדר ברזל 2 מ'",              unit: "יח'", price: 35 },
  { id: "f010", category: "fencing", name: "מסך פרטיות PVC (רוחב 1.5 מ')",   unit: "מ'",  price: 45 },
  { id: "f011", category: "fencing", name: "ביומבו קנה טבעי (פאנל 2×1 מ')",  unit: "יח'", price: 65 },
  { id: "f012", category: "fencing", name: "ביומבו פוליאתילן (פאנל 2×1 מ')", unit: "יח'", price: 85 },
  { id: "f013", category: "fencing", name: "שער כניסה ברזל",                  unit: "יח'", price: 850, notes: "רוחב 1 מ'" },

  // ══════════════════════════════════════════
  // 💡 תאורת גינה
  // ══════════════════════════════════════════
  { id: "l001", category: "lighting", name: "זרקור LED קרקע 10W",              unit: "יח'", price: 85 },
  { id: "l002", category: "lighting", name: "זרקור LED קרקע 20W",              unit: "יח'", price: 120 },
  { id: "l003", category: "lighting", name: "ספוט גינה LED (שתול בקרקע)",      unit: "יח'", price: 65 },
  { id: "l004", category: "lighting", name: "נתיב LED (שביל גינה)",            unit: "יח'", price: 45 },
  { id: "l005", category: "lighting", name: "אפ-לייט עצים (Up-Light)",         unit: "יח'", price: 95 },
  { id: "l006", category: "lighting", name: "רצועת LED חיצונית (מ')",         unit: "מ'",  price: 35 },
  { id: "l007", category: "lighting", name: "גוף תאורה קיר חיצוני",           unit: "יח'", price: 150 },
  { id: "l008", category: "lighting", name: "שנאי LED 60W",                   unit: "יח'", price: 180 },
  { id: "l009", category: "lighting", name: "כבל חיצוני 2×1.5 (מ')",         unit: "מ'",  price: 8 },
  { id: "l010", category: "lighting", name: "קופסת חיבור חיצונית IP65",        unit: "יח'", price: 35 },

  // ══════════════════════════════════════════
  // 🔧 ציוד ושונות
  // ══════════════════════════════════════════
  { id: "t001", category: "tools", name: "עמוד מתיחה לצמח מטפס",              unit: "יח'", price: 15 },
  { id: "t002", category: "tools", name: "סבך (תמיכה) לצמחים",               unit: "יח'", price: 25 },
  { id: "t003", category: "tools", name: "עמוד עץ/במבוק לתמיכת עצים",         unit: "יח'", price: 18 },
  { id: "t004", category: "tools", name: "חוט קשירה ירוק (גליל 50 מ')",       unit: "יח'", price: 22 },
  { id: "t005", category: "tools", name: "קרש עץ מעובד ACQ 10×10×200",        unit: "יח'", price: 55 },
  { id: "t006", category: "tools", name: "בטון מוכן (מיסוב)",                 unit: "שק",  price: 28, notes: "שק 25 ק\"ג" },
  { id: "t007", category: "tools", name: "חיפוי קיר ירוק (מודול)",            unit: "יח'", price: 120, notes: "מודול 50×50 סמ" },
  { id: "t008", category: "tools", name: "אבן גבול (curbing) מבטון",          unit: "מ'",  price: 45 },
  { id: "t009", category: "tools", name: "שפה פלסטיק לדשא (edging)",          unit: "מ'",  price: 12 },
  { id: "t010", category: "tools", name: "מי ריסוס חומר הדברה (בקבוק 1 ל')", unit: "יח'", price: 45 },
  { id: "t011", category: "tools", name: "כלאט ברזל (טיפול כלורוזה)",        unit: "יח'", price: 38 },
  { id: "t012", category: "tools", name: "אוסמוקוט 1 ק\"ג",                  unit: "יח'", price: 30 },
  { id: "t013", category: "tools", name: "ריסוס נגד עש מנהרות",              unit: "יח'", price: 55 },
  { id: "t014", category: "tools", name: "ריסוס נגד כנימות סיסטמי",          unit: "יח'", price: 65 },
  { id: "t015", category: "tools", name: "קופסת השקיה (box)",                 unit: "יח'", price: 35 },
  { id: "t016", category: "tools", name: "ארגז חשמל חיצוני",                 unit: "יח'", price: 120 },

  // ══════════════════════════════════════════
  // 👷 עבודה (כ\"א)
  // ══════════════════════════════════════════
  { id: "lb001", category: "labor", name: "שעת עבודה — גנן",                  unit: "שעה", price: 120 },
  { id: "lb002", category: "labor", name: "שעת עבודה — פועל עזר",             unit: "שעה", price: 75 },
  { id: "lb003", category: "labor", name: "שתילת עציץ 12–10L",                unit: "יח'", price: 18 },
  { id: "lb004", category: "labor", name: "שתילת עץ 25L+",                    unit: "יח'", price: 55 },
  { id: "lb005", category: "labor", name: "הנחת דשא סינטטי",                  unit: "מ\"ר", price: 45 },
  { id: "lb006", category: "labor", name: "הנחת גלילי דשא טבעי",              unit: "מ\"ר", price: 20 },
  { id: "lb007", category: "labor", name: "הנחת ריצוף/אבן",                   unit: "מ\"ר", price: 90 },
  { id: "lb008", category: "labor", name: "התקנת מערכת השקיה",                unit: "נקודה", price: 35, notes: "לכל נקודת השקיה" },
  { id: "lb009", category: "labor", name: "גיזום עצים",                       unit: "שעה", price: 130 },
  { id: "lb010", category: "labor", name: "הסעת פסולת גינה (טנדר)",           unit: "יח'", price: 350 },
  { id: "lb011", category: "labor", name: "כרייה ידנית (חפירה)",              unit: "שעה", price: 90 },
  { id: "lb012", category: "labor", name: "הכנת קרקע + עיבוד",               unit: "מ\"ר", price: 25 },
];
