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
  { key: "irr_fittings", label: "מחברים להשקייה",  emoji: "🔩" },
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
  // חלוקי נחל
  { id: "st_peb_white",  category: "stones", name: "חלוקי נחל לבן",              unit: "מ\"ק", price: 0 },
  { id: "st_peb_gray",   category: "stones", name: "חלוקי נחל אפור",             unit: "מ\"ק", price: 0 },
  { id: "st_peb_black",  category: "stones", name: "חלוקי נחל שחור",             unit: "מ\"ק", price: 0 },
  { id: "st_peb_mix",    category: "stones", name: "חלוקי נחל צבעוני מעורב",     unit: "מ\"ק", price: 0 },
  { id: "st_peb_japan",  category: "stones", name: "חלוקי נחל יפני",             unit: "מ\"ק", price: 0 },
  // אבני מדרך
  { id: "st_step_rect",  category: "stones", name: "אבן מדרך בטון מלבנית",       unit: "יח'",  price: 0 },
  { id: "st_step_round", category: "stones", name: "אבן מדרך בטון עגולה",        unit: "יח'",  price: 0 },
  { id: "st_step_nat",   category: "stones", name: "אבן מדרך טבעית (אבן שדה)",   unit: "יח'",  price: 0 },
  { id: "st_step_strip", category: "stones", name: "אבן מדרך סלעית (פסים)",      unit: "יח'",  price: 0 },
  // אדני רכבת
  { id: "st_rail_wood",  category: "stones", name: "אדן רכבת מעץ ממוחזר",        unit: "יח'",  price: 0 },
  { id: "st_rail_conc",  category: "stones", name: "אדן רכבת מבטון",             unit: "יח'",  price: 0 },
  // סלעים ואבני שדה
  { id: "st_rock_field", category: "stones", name: "אבן שדה טבעית גדולה",        unit: "יח'",  price: 0 },
  { id: "st_rock_baz",   category: "stones", name: "סלע בזלת",                   unit: "יח'",  price: 0 },
  { id: "st_rock_lime",  category: "stones", name: "סלע גיר לבן",                unit: "יח'",  price: 0 },

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

  // — אדנית מלבנית (פלסטיק מבטנה כפולה) — אורך × רוחב × גובה (ס"מ) —
  { id: "adn_200_30_30", category: "planters", name: 'אדנית 200×30×30 ס"מ',  unit: "יח'", price: 1950, notes: "גם באפוקסי" },
  { id: "adn_150_30_30", category: "planters", name: 'אדנית 150×30×30 ס"מ',  unit: "יח'", price: 1550, notes: "גם באפוקסי" },
  { id: "adn_100_30_30", category: "planters", name: 'אדנית 100×30×30 ס"מ',  unit: "יח'", price: 950,  notes: "גם באפוקסי" },
  { id: "adn_200_40_40", category: "planters", name: 'אדנית 200×40×40 ס"מ',  unit: "יח'", price: 2250, notes: "גם באפוקסי" },
  { id: "adn_150_40_40", category: "planters", name: 'אדנית 150×40×40 ס"מ',  unit: "יח'", price: 1700, notes: "גם באפוקסי" },
  { id: "adn_100_40_40", category: "planters", name: 'אדנית 100×40×40 ס"מ',  unit: "יח'", price: 1100, notes: "גם באפוקסי" },
  { id: "adn_200_50_50", category: "planters", name: 'אדנית 200×50×50 ס"מ',  unit: "יח'", price: 2600, notes: "גם באפוקסי" },
  { id: "adn_150_50_50", category: "planters", name: 'אדנית 150×50×50 ס"מ',  unit: "יח'", price: 1960, notes: "גם באפוקסי" },
  { id: "adn_100_50_50", category: "planters", name: 'אדנית 100×50×50 ס"מ',  unit: "יח'", price: 1400, notes: "גם באפוקסי" },
  { id: "adn_200_40_60", category: "planters", name: 'אדנית 200×40×60 ס"מ',  unit: "יח'", price: 3550, notes: "גם באפוקסי" },
  { id: "adn_150_40_60", category: "planters", name: 'אדנית 150×40×60 ס"מ',  unit: "יח'", price: 2650, notes: "גם באפוקסי" },
  { id: "adn_100_40_60", category: "planters", name: 'אדנית 100×40×60 ס"מ',  unit: "יח'", price: 1850, notes: "גם באפוקסי" },
  { id: "adn_200_30_60", category: "planters", name: 'אדנית 200×30×60 ס"מ',  unit: "יח'", price: 3250, notes: "גם באפוקסי" },
  { id: "adn_150_30_60", category: "planters", name: 'אדנית 150×30×60 ס"מ',  unit: "יח'", price: 2550, notes: "גם באפוקסי" },
  { id: "adn_100_30_60", category: "planters", name: 'אדנית 100×30×60 ס"מ',  unit: "יח'", price: 1750, notes: "גם באפוקסי" },
  { id: "adn_200_40_50", category: "planters", name: 'אדנית 200×40×50 ס"מ',  unit: "יח'", price: 2600, notes: "גם באפוקסי" },
  { id: "adn_150_40_50", category: "planters", name: 'אדנית 150×40×50 ס"מ',  unit: "יח'", price: 1950, notes: "גם באפוקסי" },
  { id: "adn_100_40_50", category: "planters", name: 'אדנית 100×40×50 ס"מ',  unit: "יח'", price: 1350, notes: "גם באפוקסי" },
  { id: "adn_200_30_50", category: "planters", name: 'אדנית 200×30×50 ס"מ',  unit: "יח'", price: 3050, notes: "גם באפוקסי" },
  { id: "adn_150_30_50", category: "planters", name: 'אדנית 150×30×50 ס"מ',  unit: "יח'", price: 2300, notes: "גם באפוקסי" },
  { id: "adn_100_30_50", category: "planters", name: 'אדנית 100×30×50 ס"מ',  unit: "יח'", price: 1600, notes: "גם באפוקסי" },
  { id: "adn_200_30_40", category: "planters", name: 'אדנית 200×30×40 ס"מ',  unit: "יח'", price: 2200, notes: "גם באפוקסי" },
  { id: "adn_150_30_40", category: "planters", name: 'אדנית 150×30×40 ס"מ',  unit: "יח'", price: 1700, notes: "גם באפוקסי" },
  { id: "adn_100_30_40", category: "planters", name: 'אדנית 100×30×40 ס"מ',  unit: "יח'", price: 1100, notes: "גם באפוקסי" },
  { id: "adn_200_20_30", category: "planters", name: 'אדנית 200×20×30 ס"מ',  unit: "יח'", price: 1850, notes: "גם באפוקסי" },
  { id: "adn_150_20_30", category: "planters", name: 'אדנית 150×20×30 ס"מ',  unit: "יח'", price: 1450, notes: "גם באפוקסי" },
  { id: "adn_100_20_30", category: "planters", name: 'אדנית 100×20×30 ס"מ',  unit: "יח'", price: 950,  notes: "גם באפוקסי" },

  // — ג'ארה ישר (HP 1083) — קוטר × גובה (ס"מ) —
  { id: "jari_70_62",  category: "planters", name: 'כד ג\'ארה ישר 70×62 ס"מ',  unit: "יח'", price: 1700, notes: "גם באפוקסי" },
  { id: "jari_55_52",  category: "planters", name: 'כד ג\'ארה ישר 55×52 ס"מ',  unit: "יח'", price: 1050, notes: "גם באפוקסי" },
  { id: "jari_45_41",  category: "planters", name: 'כד ג\'ארה ישר 45×41 ס"מ',  unit: "יח'", price: 800,  notes: "גם באפוקסי" },
  { id: "jari_37_30",  category: "planters", name: 'כד ג\'ארה ישר 37×30 ס"מ',  unit: "יח'", price: 550,  notes: "גם באפוקסי" },
  { id: "jari_28_22",  category: "planters", name: 'כד ג\'ארה ישר 28×22 ס"מ',  unit: "יח'", price: 300,  notes: "גם באפוקסי" },

  // — ג'ארה קערה (HP 1177) —
  { id: "jarq_106_76", category: "planters", name: 'כד ג\'ארה קערה 106×76 ס"מ', unit: "יח'", price: 3900, notes: "גם באפוקסי" },
  { id: "jarq_90_66",  category: "planters", name: 'כד ג\'ארה קערה 90×66 ס"מ',  unit: "יח'", price: 3200, notes: "גם באפוקסי" },
  { id: "jarq_76_56",  category: "planters", name: 'כד ג\'ארה קערה 76×56 ס"מ',  unit: "יח'", price: 1750, notes: "גם באפוקסי" },
  { id: "jarq_65_49",  category: "planters", name: 'כד ג\'ארה קערה 65×49 ס"מ',  unit: "יח'", price: 1450, notes: "גם באפוקסי" },
  { id: "jarq_50_42",  category: "planters", name: 'כד ג\'ארה קערה 50×42 ס"מ',  unit: "יח'", price: 900,  notes: "גם באפוקסי" },
  { id: "jarq_40_33",  category: "planters", name: 'כד ג\'ארה קערה 40×33 ס"מ',  unit: "יח'", price: 700,  notes: "גם באפוקסי" },

  // — צילינדר (HP 1118) —
  { id: "cyl_100_75",  category: "planters", name: 'כד צילינדר 100×75 ס"מ',     unit: "יח'", price: 3900, notes: "גם באפוקסי" },
  { id: "cyl_80_75",   category: "planters", name: 'כד צילינדר 80×75 ס"מ',      unit: "יח'", price: 2550, notes: "גם באפוקסי" },
  { id: "cyl_70_70",   category: "planters", name: 'כד צילינדר 70×70 ס"מ',      unit: "יח'", price: 2000, notes: "גם באפוקסי" },
  { id: "cyl_60_60",   category: "planters", name: 'כד צילינדר 60×60 ס"מ',      unit: "יח'", price: 1650, notes: "גם באפוקסי" },
  { id: "cyl_50_50",   category: "planters", name: 'כד צילינדר 50×50 ס"מ',      unit: "יח'", price: 1100, notes: "גם באפוקסי" },
  { id: "cyl_40_40",   category: "planters", name: 'כד צילינדר 40×40 ס"מ',      unit: "יח'", price: 750,  notes: "גם באפוקסי" },
  { id: "cyl_30_30",   category: "planters", name: 'כד צילינדר 30×30 ס"מ',      unit: "יח'", price: 500,  notes: "גם באפוקסי" },
  { id: "cyl_60_75",   category: "planters", name: 'כד צילינדר גבוה 60×75 ס"מ', unit: "יח'", price: 1800, notes: "גם באפוקסי" },
  { id: "cyl_50_75",   category: "planters", name: 'כד צילינדר גבוה 50×75 ס"מ', unit: "יח'", price: 1550, notes: "גם באפוקסי" },
  { id: "cyl_40_75",   category: "planters", name: 'כד צילינדר גבוה 40×75 ס"מ', unit: "יח'", price: 1400, notes: "גם באפוקסי" },
  { id: "cyl_30_75",   category: "planters", name: 'כד צילינדר גבוה 30×75 ס"מ', unit: "יח'", price: 1050, notes: "גם באפוקסי" },

  // — פינס יבוא (HP 1151) —
  { id: "fin_60_54",   category: "planters", name: 'כד פינס יבוא 60×54 ס"מ',    unit: "יח'", price: 1400, notes: "גם באפוקסי" },
  { id: "fin_50_45",   category: "planters", name: 'כד פינס יבוא 50×45 ס"מ',    unit: "יח'", price: 1100, notes: "גם באפוקסי" },
  { id: "fin_41_37",   category: "planters", name: 'כד פינס יבוא 41×37 ס"מ',    unit: "יח'", price: 800,  notes: "גם באפוקסי" },
  { id: "fin_33_31",   category: "planters", name: 'כד פינס יבוא 33×31 ס"מ',    unit: "יח'", price: 550,  notes: "גם באפוקסי" },
  { id: "fin_27_25",   category: "planters", name: 'כד פינס יבוא 27×25 ס"מ',    unit: "יח'", price: 350,  notes: "גם באפוקסי" },

  // — קונוס עגול גבוה (HP 1161) —
  { id: "konh_55_75",  category: "planters", name: 'כד קונוס עגול גבוה 55×75 ס"מ', unit: "יח'", price: 1850, notes: "גם באפוקסי" },
  { id: "konh_45_61",  category: "planters", name: 'כד קונוס עגול גבוה 45×61 ס"מ', unit: "יח'", price: 1250, notes: "גם באפוקסי" },
  { id: "konh_38_52",  category: "planters", name: 'כד קונוס עגול גבוה 38×52 ס"מ', unit: "יח'", price: 850,  notes: "גם באפוקסי" },
  { id: "konh_30_43",  category: "planters", name: 'כד קונוס עגול גבוה 30×43 ס"מ', unit: "יח'", price: 500,  notes: "גם באפוקסי" },

  // — קערה שטוחה (HP 1074) —
  { id: "qer_110_40",  category: "planters", name: 'כד קערה שטוחה 110×40 ס"מ',  unit: "יח'", price: 1900, notes: "גם באפוקסי" },
  { id: "qer_85_30",   category: "planters", name: 'כד קערה שטוחה 85×30 ס"מ',   unit: "יח'", price: 950,  notes: "גם באפוקסי" },
  { id: "qer_70_25",   category: "planters", name: 'כד קערה שטוחה 70×25 ס"מ',   unit: "יח'", price: 800,  notes: "גם באפוקסי" },
  { id: "qer_60_18",   category: "planters", name: 'כד קערה שטוחה 60×18 ס"מ',   unit: "יח'", price: 550,  notes: "גם באפוקסי" },
  { id: "qer_50_13",   category: "planters", name: 'כד קערה שטוחה 50×13 ס"מ',   unit: "יח'", price: 400,  notes: "גם באפוקסי" },

  // — ריבוע פינות מעוגלות (HP 1254) —
  { id: "riv_73_73",   category: "planters", name: 'כד ריבוע פינות מעוגלות 73×73 ס"מ', unit: "יח'", price: 2300, notes: "גם באפוקסי" },
  { id: "riv_63_63",   category: "planters", name: 'כד ריבוע פינות מעוגלות 63×63 ס"מ', unit: "יח'", price: 1700, notes: "גם באפוקסי" },
  { id: "riv_53_53",   category: "planters", name: 'כד ריבוע פינות מעוגלות 53×53 ס"מ', unit: "יח'", price: 1150, notes: "גם באפוקסי" },
  { id: "riv_43_43",   category: "planters", name: 'כד ריבוע פינות מעוגלות 43×43 ס"מ', unit: "יח'", price: 850,  notes: "גם באפוקסי" },
  { id: "riv_33_33",   category: "planters", name: 'כד ריבוע פינות מעוגלות 33×33 ס"מ', unit: "יח'", price: 550,  notes: "גם באפוקסי" },

  // — בול עץ גבוה —
  { id: "bulg_53_80",  category: "planters", name: 'כד בול עץ גבוה 53×80 ס"מ',  unit: "יח'", price: 1850, notes: "גם באפוקסי" },
  { id: "bulg_40_60",  category: "planters", name: 'כד בול עץ גבוה 40×60 ס"מ',  unit: "יח'", price: 1050, notes: "גם באפוקסי" },
  { id: "bulg_30_50",  category: "planters", name: 'כד בול עץ גבוה 30×50 ס"מ',  unit: "יח'", price: 700,  notes: "גם באפוקסי" },
  { id: "bulg_20_40",  category: "planters", name: 'כד בול עץ גבוה 20×40 ס"מ',  unit: "יח'", price: 400,  notes: "גם באפוקסי" },

  // — בול עץ רגיל (HP 1087) —
  { id: "bulr_68_64",  category: "planters", name: 'כד בול עץ רגיל 68×64 ס"מ',  unit: "יח'", price: 2200, notes: "גם באפוקסי" },
  { id: "bulr_55_53",  category: "planters", name: 'כד בול עץ רגיל 55×53 ס"מ',  unit: "יח'", price: 1600, notes: "גם באפוקסי" },
  { id: "bulr_44_42",  category: "planters", name: 'כד בול עץ רגיל 44×42 ס"מ',  unit: "יח'", price: 900,  notes: "גם באפוקסי" },
  { id: "bulr_34_33",  category: "planters", name: 'כד בול עץ רגיל 34×33 ס"מ',  unit: "יח'", price: 700,  notes: "גם באפוקסי" },
  { id: "bulr_26_26",  category: "planters", name: 'כד בול עץ רגיל 26×26 ס"מ',  unit: "יח'", price: 350,  notes: "גם באפוקסי" },

  // — קונוס רגיל (HP 1067) —
  { id: "konr_71_62",  category: "planters", name: 'כד קונוס רגיל 71×62 ס"מ',   unit: "יח'", price: 1750, notes: "גם באפוקסי" },
  { id: "konr_61_52",  category: "planters", name: 'כד קונוס רגיל 61×52 ס"מ',   unit: "יח'", price: 1350, notes: "גם באפוקסי" },
  { id: "konr_51_42",  category: "planters", name: 'כד קונוס רגיל 51×42 ס"מ',   unit: "יח'", price: 900,  notes: "גם באפוקסי" },
  { id: "konr_41_37",  category: "planters", name: 'כד קונוס רגיל 41×37 ס"מ',   unit: "יח'", price: 750,  notes: "גם באפוקסי" },
  { id: "konr_31_26",  category: "planters", name: 'כד קונוס רגיל 31×26 ס"מ',   unit: "יח'", price: 500,  notes: "גם באפוקסי" },

  // — יהלום (HP 1400) —
  { id: "yah_55_55",   category: "planters", name: 'כד יהלום 55×55 ס"מ',          unit: "יח'", price: 1250, notes: "גם באפוקסי" },
  { id: "yah_44_44",   category: "planters", name: 'כד יהלום 44×44 ס"מ',          unit: "יח'", price: 900,  notes: "גם באפוקסי" },
  { id: "yah_36_36",   category: "planters", name: 'כד יהלום 36×36 ס"מ',          unit: "יח'", price: 700,  notes: "גם באפוקסי" },

  // — פו הדב (HP 1094) —
  { id: "poo_66_61",   category: "planters", name: 'כד פו הדב 66×61 ס"מ',        unit: "יח'", price: 1750, notes: "גם באפוקסי" },
  { id: "poo_50_45",   category: "planters", name: 'כד פו הדב 50×45 ס"מ',        unit: "יח'", price: 950,  notes: "גם באפוקסי" },
  { id: "poo_35_31",   category: "planters", name: 'כד פו הדב 35×31 ס"מ',        unit: "יח'", price: 560,  notes: "גם באפוקסי" },

  // — חצי כדור (HP 1146) —
  { id: "hkd_83_58",   category: "planters", name: 'כד חצי כדור 83×58 ס"מ',      unit: "יח'", price: 1850, notes: "גם באפוקסי" },
  { id: "hkd_54_43",   category: "planters", name: 'כד חצי כדור 54×43 ס"מ',      unit: "יח'", price: 1100, notes: "גם באפוקסי" },
  { id: "hkd_32_25",   category: "planters", name: 'כד חצי כדור 32×25 ס"מ',      unit: "יח'", price: 550,  notes: "גם באפוקסי" },

  // — אדנית חלון (HP 1312) — אורך × רוחב × גובה —
  { id: "achl_75",     category: "planters", name: 'אדנית חלון 75×25×27 ס"מ',     unit: "יח'", price: 700,  notes: "גם באפוקסי" },
  { id: "achl_60",     category: "planters", name: 'אדנית חלון 60×19×21 ס"מ',     unit: "יח'", price: 500,  notes: "גם באפוקסי" },
  { id: "achl_50",     category: "planters", name: 'אדנית חלון 50×14×17 ס"מ',     unit: "יח'", price: 300,  notes: "גם באפוקסי" },

  // — קונוס מדרגה (HP 1085) —
  { id: "konm_70_64",  category: "planters", name: 'כד קונוס מדרגה 70×64 ס"מ',   unit: "יח'", price: 1750, notes: "גם באפוקסי" },
  { id: "konm_50_49",  category: "planters", name: 'כד קונוס מדרגה 50×49 ס"מ',   unit: "יח'", price: 950,  notes: "גם באפוקסי" },
  { id: "konm_40_40",  category: "planters", name: 'כד קונוס מדרגה 40×40 ס"מ',   unit: "יח'", price: 700,  notes: "גם באפוקסי" },
  { id: "konm_31_30",  category: "planters", name: 'כד קונוס מדרגה 31×30 ס"מ',   unit: "יח'", price: 450,  notes: "גם באפוקסי" },

  // — קראקס יבוא (HP 1241) —
  { id: "krx_67_104",  category: "planters", name: 'כד קראקס יבוא 67×104 ס"מ',   unit: "יח'", price: 3450, notes: "גם באפוקסי" },
  { id: "krx_55_84",   category: "planters", name: 'כד קראקס יבוא 55×84 ס"מ',    unit: "יח'", price: 1900, notes: "גם באפוקסי" },
  { id: "krx_40_63",   category: "planters", name: 'כד קראקס יבוא 40×63 ס"מ',    unit: "יח'", price: 1050, notes: "גם באפוקסי" },

  // — כד פסים אופקיים (HP 1444) —
  { id: "kps_110_75",  category: "planters", name: 'כד פסים אופקיים 110×75 ס"מ', unit: "יח'", price: 4050, notes: "גם באפוקסי" },
  { id: "kps_82_57",   category: "planters", name: 'כד פסים אופקיים 82×57 ס"מ',  unit: "יח'", price: 2050, notes: "גם באפוקסי" },
  { id: "kps_54_42",   category: "planters", name: 'כד פסים אופקיים 54×42 ס"מ',  unit: "יח'", price: 1050, notes: "גם באפוקסי" },
  { id: "kps_32_25",   category: "planters", name: 'כד פסים אופקיים 32×25 ס"מ',  unit: "יח'", price: 600,  notes: "גם באפוקסי" },

  // — קונוס פסים (HP 1403) —
  { id: "konp_90_75",  category: "planters", name: 'כד קונוס פסים 90×75 ס"מ',    unit: "יח'", price: 3300, notes: "גם באפוקסי" },
  { id: "konp_75_63",  category: "planters", name: 'כד קונוס פסים 75×63 ס"מ',    unit: "יח'", price: 2300, notes: "גם באפוקסי" },
  { id: "konp_63_53",  category: "planters", name: 'כד קונוס פסים 63×53 ס"מ',    unit: "יח'", price: 1450, notes: "גם באפוקסי" },
  { id: "konp_50_42",  category: "planters", name: 'כד קונוס פסים 50×42 ס"מ',    unit: "יח'", price: 1050, notes: "גם באפוקסי" },
  { id: "konp_40_34",  category: "planters", name: 'כד קונוס פסים 40×34 ס"מ',    unit: "יח'", price: 800,  notes: "גם באפוקסי" },

  // — ארגז שתילה — אורך × רוחב × גובה (ס"מ) —
  { id: "arz_100_75",  category: "planters", name: 'ארגז שתילה 100×100×75 ס"מ',   unit: "יח'", price: 4200, notes: "גם באפוקסי" },
  { id: "arz_90_75",   category: "planters", name: 'ארגז שתילה 90×90×75 ס"מ',     unit: "יח'", price: 3450, notes: "גם באפוקסי" },
  { id: "arz_80_80",   category: "planters", name: 'ארגז שתילה 80×80×80 ס"מ',     unit: "יח'", price: 2600, notes: "גם באפוקסי" },
  { id: "arz_70_70",   category: "planters", name: 'ארגז שתילה 70×70×70 ס"מ',     unit: "יח'", price: 2050, notes: "גם באפוקסי" },
  { id: "arz_60_60",   category: "planters", name: 'ארגז שתילה 60×60×60 ס"מ',     unit: "יח'", price: 1500, notes: "גם באפוקסי" },
  { id: "arz_50_50",   category: "planters", name: 'ארגז שתילה 50×50×50 ס"מ',     unit: "יח'", price: 1100, notes: "גם באפוקסי" },
  { id: "arz_40_40",   category: "planters", name: 'ארגז שתילה 40×40×40 ס"מ',     unit: "יח'", price: 800,  notes: "גם באפוקסי" },
  { id: "arz_30_30",   category: "planters", name: 'ארגז שתילה 30×30×30 ס"מ',     unit: "יח'", price: 500,  notes: "גם באפוקסי" },
  { id: "arz_20_20",   category: "planters", name: 'ארגז שתילה 20×20×20 ס"מ',     unit: "יח'", price: 300,  notes: "גם באפוקסי" },
  { id: "arz_60_75",   category: "planters", name: 'ארגז שתילה גבוה 60×60×75 ס"מ', unit: "יח'", price: 1950, notes: "גם באפוקסי" },
  { id: "arz_50_75",   category: "planters", name: 'ארגז שתילה גבוה 50×50×75 ס"מ', unit: "יח'", price: 1800, notes: "גם באפוקסי" },
  { id: "arz_40_75",   category: "planters", name: 'ארגז שתילה גבוה 40×40×75 ס"מ', unit: "יח'", price: 1550, notes: "גם באפוקסי" },
  { id: "arz_30_75",   category: "planters", name: 'ארגז שתילה גבוה 30×30×75 ס"מ', unit: "יח'", price: 1150, notes: "גם באפוקסי" },

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
  // קו הובלה עיוור (PE)
  { id: "pipe_pe8",   category: "irrigation", name: "צינור PE 8 מ\"מ עיוור",             unit: "מ'",  price: 0 },
  { id: "pipe_pe16",  category: "irrigation", name: "צינור PE 16 מ\"מ עיוור",            unit: "מ'",  price: 0 },
  { id: "pipe_pe20",  category: "irrigation", name: "צינור PE 20 מ\"מ עיוור",            unit: "מ'",  price: 0 },
  { id: "pipe_pe25",  category: "irrigation", name: "צינור PE 25 מ\"מ עיוור",            unit: "מ'",  price: 0 },
  { id: "pipe_pe32",  category: "irrigation", name: "צינור PE 32 מ\"מ עיוור",            unit: "מ'",  price: 0 },
  // לנד ליין
  { id: "pipe_ll8b",  category: "irrigation", name: "לנד ליין 8 מ\"מ עיוור",             unit: "מ'",  price: 0 },
  { id: "pipe_ll8d",  category: "irrigation", name: "לנד ליין 8 מ\"מ טפטוף",             unit: "מ'",  price: 0 },
  { id: "pipe_ll16b", category: "irrigation", name: "לנד ליין 16 מ\"מ עיוור",            unit: "מ'",  price: 0 },
  { id: "pipe_ll16d", category: "irrigation", name: "לנד ליין 16 מ\"מ טפטוף",            unit: "מ'",  price: 0 },
  { id: "pipe_ll20b", category: "irrigation", name: "לנד ליין 20 מ\"מ עיוור",            unit: "מ'",  price: 0 },
  // קו טפטוף מובנה
  { id: "pipe_dt30",  category: "irrigation", name: "קו טפטוף 16 מ\"מ — 30 ס\"מ מרווח", unit: "מ'",  price: 0 },
  { id: "pipe_dt50",  category: "irrigation", name: "קו טפטוף 16 מ\"מ — 50 ס\"מ מרווח", unit: "מ'",  price: 0 },
  { id: "pipe_dt100", category: "irrigation", name: "קו טפטוף 16 מ\"מ — 100 ס\"מ מרווח",unit: "מ'",  price: 0 },
  // מחברים ישרים
  { id: "fit_str8",   category: "irr_fittings", name: "מחבר ישר 8 מ\"מ",                 unit: "יח'", price: 0 },
  { id: "fit_str16",  category: "irr_fittings", name: "מחבר ישר 16 מ\"מ",                unit: "יח'", price: 0 },
  { id: "fit_str20",  category: "irr_fittings", name: "מחבר ישר 20 מ\"מ",                unit: "יח'", price: 0 },
  { id: "fit_str25",  category: "irr_fittings", name: "מחבר ישר 25 מ\"מ",                unit: "יח'", price: 0 },
  { id: "fit_str32",  category: "irr_fittings", name: "מחבר ישר 32 מ\"מ",                unit: "יח'", price: 0 },
  // מחברי T
  { id: "fit_t8",     category: "irr_fittings", name: "מחבר T 8 מ\"מ",                   unit: "יח'", price: 0 },
  { id: "fit_t16",    category: "irr_fittings", name: "מחבר T 16 מ\"מ",                  unit: "יח'", price: 0 },
  { id: "fit_t20",    category: "irr_fittings", name: "מחבר T 20 מ\"מ",                  unit: "יח'", price: 0 },
  { id: "fit_t25",    category: "irr_fittings", name: "מחבר T 25 מ\"מ",                  unit: "יח'", price: 0 },
  // זווית
  { id: "fit_el8",    category: "irr_fittings", name: "זווית 8 מ\"מ",                    unit: "יח'", price: 0 },
  { id: "fit_el16",   category: "irr_fittings", name: "זווית 16 מ\"מ",                   unit: "יח'", price: 0 },
  { id: "fit_el20",   category: "irr_fittings", name: "זווית 20 מ\"מ",                   unit: "יח'", price: 0 },
  // מעברים (רדוקציות)
  { id: "fit_red2016",category: "irr_fittings", name: "מעבר 20→16 מ\"מ",                 unit: "יח'", price: 0 },
  { id: "fit_red2520",category: "irr_fittings", name: "מעבר 25→20 מ\"מ",                 unit: "יח'", price: 0 },
  { id: "fit_red3225",category: "irr_fittings", name: "מעבר 32→25 מ\"מ",                 unit: "יח'", price: 0 },
  // פקקי קצה
  { id: "fit_cap8",   category: "irr_fittings", name: "פקק קצה 8 מ\"מ",                  unit: "יח'", price: 0 },
  { id: "fit_cap16",  category: "irr_fittings", name: "פקק קצה 16 מ\"מ",                 unit: "יח'", price: 0 },
  { id: "fit_cap20",  category: "irr_fittings", name: "פקק קצה 20 מ\"מ",                 unit: "יח'", price: 0 },
  // מחברים לברז
  { id: "fit_tap_hf16", category: "irr_fittings", name: "מחבר לברז ½\" ← 16 מ\"מ",      unit: "יח'", price: 0 },
  { id: "fit_tap_34_20",category: "irr_fittings", name: "מחבר לברז ¾\" ← 20 מ\"מ",      unit: "יח'", price: 0 },
  { id: "fit_tap_34_25",category: "irr_fittings", name: "מחבר לברז ¾\" ← 25 מ\"מ",      unit: "יח'", price: 0 },
  { id: "fit_tap_1_32", category: "irr_fittings", name: "מחבר לברז 1\" ← 32 מ\"מ",      unit: "יח'", price: 0 },
  // מצמדים
  { id: "fit_clamp16",category: "irr_fittings", name: "מצמד 16 מ\"מ",                   unit: "יח'", price: 0 },
  { id: "fit_clamp20",category: "irr_fittings", name: "מצמד 20 מ\"מ",                   unit: "יח'", price: 0 },
  { id: "fit_clamp25",category: "irr_fittings", name: "מצמד 25 מ\"מ",                   unit: "יח'", price: 0 },
  { id: "fit_clamp32",category: "irr_fittings", name: "מצמד 32 מ\"מ",                   unit: "יח'", price: 0 },
  // כלים
  { id: "fit_punch",  category: "irr_fittings", name: "מנקב צנרת",                      unit: "יח'", price: 0 },
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
  // פריטי המשתמש
  { id: "soil_garden50",   category: "soil", name: "אדמת גינה מוכנה (תערובת גן) — שק 50 ליטר", unit: "שק",   price: 0 },
  { id: "soil_perl100",    category: "soil", name: "פרלייט — שק 100 ליטר",                      unit: "שק",   price: 0 },
  { id: "soil_verm100",    category: "soil", name: "ורמיקוליט — שק 100 ליטר",                   unit: "שק",   price: 0 },
  { id: "soil_comp25",     category: "soil", name: "קומפוסט — שק 25 ליטר",                      unit: "שק",   price: 0 },
  { id: "soil_humus25",    category: "soil", name: "הומוס — שק 25 ליטר",                        unit: "שק",   price: 0 },
  { id: "soil_tuff25g",    category: "soil", name: "טוף גס — שק 25 ליטר",                       unit: "שק",   price: 0 },
  { id: "soil_tuff25gr",   category: "soil", name: "טוף גרוס — שק 25 ליטר",                     unit: "שק",   price: 0 },
  { id: "soil_osmo1",      category: "soil", name: "אוסמוקוט (דשן בפירוק איטי) — ק\"ג",         unit: "ק\"ג", price: 0 },
  { id: "soil_osmo3",      category: "soil", name: "אוסמוקוט (דשן בפירוק איטי) — 3 ק\"ג",       unit: "יח'",  price: 0 },

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
