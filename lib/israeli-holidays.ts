// Israeli holidays — covers 2026, 2027, 2028
// Sources: Hebcal & official Israeli holiday calendars
// Each entry: ISO date (YYYY-MM-DD) → { name, type }
//   type: "major"  — חג מרכזי / יום זיכרון לאומי
//         "minor"  — חג קטן / יום מסורתי
//         "memorial" — יום זיכרון
//         "national" — יום עצמאות / ירושלים

export type HolidayType = "major" | "minor" | "memorial" | "national";

export interface Holiday {
  name: string;
  type: HolidayType;
}

export const ISRAELI_HOLIDAYS: Record<string, Holiday> = {
  // ===== 2026 =====
  "2026-02-02": { name: "ט״ו בשבט", type: "minor" },
  "2026-03-03": { name: "פורים", type: "major" },
  "2026-03-04": { name: "שושן פורים", type: "minor" },
  "2026-04-02": { name: "ערב פסח", type: "minor" },
  "2026-04-03": { name: "פסח א׳", type: "major" },
  "2026-04-04": { name: "חוה״מ פסח", type: "minor" },
  "2026-04-05": { name: "חוה״מ פסח", type: "minor" },
  "2026-04-06": { name: "חוה״מ פסח", type: "minor" },
  "2026-04-07": { name: "חוה״מ פסח", type: "minor" },
  "2026-04-08": { name: "חוה״מ פסח", type: "minor" },
  "2026-04-09": { name: "שביעי של פסח", type: "major" },
  "2026-04-14": { name: "יום השואה", type: "memorial" },
  "2026-04-21": { name: "יום הזיכרון", type: "memorial" },
  "2026-04-22": { name: "יום העצמאות", type: "national" },
  "2026-05-05": { name: "ל״ג בעומר", type: "minor" },
  "2026-05-15": { name: "יום ירושלים", type: "national" },
  "2026-05-21": { name: "ערב שבועות", type: "minor" },
  "2026-05-22": { name: "שבועות", type: "major" },
  "2026-07-23": { name: "תשעה באב", type: "memorial" },
  "2026-09-11": { name: "ערב ראש השנה", type: "minor" },
  "2026-09-12": { name: "ראש השנה א׳", type: "major" },
  "2026-09-13": { name: "ראש השנה ב׳", type: "major" },
  "2026-09-14": { name: "צום גדליה", type: "memorial" },
  "2026-09-20": { name: "ערב יום כיפור", type: "minor" },
  "2026-09-21": { name: "יום כיפור", type: "major" },
  "2026-09-25": { name: "ערב סוכות", type: "minor" },
  "2026-09-26": { name: "סוכות א׳", type: "major" },
  "2026-09-27": { name: "חוה״מ סוכות", type: "minor" },
  "2026-09-28": { name: "חוה״מ סוכות", type: "minor" },
  "2026-09-29": { name: "חוה״מ סוכות", type: "minor" },
  "2026-09-30": { name: "חוה״מ סוכות", type: "minor" },
  "2026-10-01": { name: "הושענא רבה", type: "minor" },
  "2026-10-02": { name: "שמחת תורה", type: "major" },
  "2026-12-04": { name: "ערב חנוכה", type: "minor" },
  "2026-12-05": { name: "חנוכה — נר 1", type: "minor" },
  "2026-12-06": { name: "חנוכה — נר 2", type: "minor" },
  "2026-12-07": { name: "חנוכה — נר 3", type: "minor" },
  "2026-12-08": { name: "חנוכה — נר 4", type: "minor" },
  "2026-12-09": { name: "חנוכה — נר 5", type: "minor" },
  "2026-12-10": { name: "חנוכה — נר 6", type: "minor" },
  "2026-12-11": { name: "חנוכה — נר 7", type: "minor" },
  "2026-12-12": { name: "חנוכה — נר 8", type: "minor" },

  // ===== 2027 =====
  "2027-01-22": { name: "ט״ו בשבט", type: "minor" },
  "2027-03-22": { name: "תענית אסתר", type: "memorial" },
  "2027-03-23": { name: "פורים", type: "major" },
  "2027-03-24": { name: "שושן פורים", type: "minor" },
  "2027-04-21": { name: "ערב פסח", type: "minor" },
  "2027-04-22": { name: "פסח א׳", type: "major" },
  "2027-04-23": { name: "חוה״מ פסח", type: "minor" },
  "2027-04-24": { name: "חוה״מ פסח", type: "minor" },
  "2027-04-25": { name: "חוה״מ פסח", type: "minor" },
  "2027-04-26": { name: "חוה״מ פסח", type: "minor" },
  "2027-04-27": { name: "חוה״מ פסח", type: "minor" },
  "2027-04-28": { name: "שביעי של פסח", type: "major" },
  "2027-05-04": { name: "יום השואה", type: "memorial" },
  "2027-05-11": { name: "יום הזיכרון", type: "memorial" },
  "2027-05-12": { name: "יום העצמאות", type: "national" },
  "2027-05-25": { name: "ל״ג בעומר", type: "minor" },
  "2027-06-04": { name: "יום ירושלים", type: "national" },
  "2027-06-10": { name: "ערב שבועות", type: "minor" },
  "2027-06-11": { name: "שבועות", type: "major" },
  "2027-08-12": { name: "תשעה באב", type: "memorial" },
  "2027-10-01": { name: "ערב ראש השנה", type: "minor" },
  "2027-10-02": { name: "ראש השנה א׳", type: "major" },
  "2027-10-03": { name: "ראש השנה ב׳", type: "major" },
  "2027-10-10": { name: "ערב יום כיפור", type: "minor" },
  "2027-10-11": { name: "יום כיפור", type: "major" },
  "2027-10-15": { name: "ערב סוכות", type: "minor" },
  "2027-10-16": { name: "סוכות א׳", type: "major" },
  "2027-10-17": { name: "חוה״מ סוכות", type: "minor" },
  "2027-10-18": { name: "חוה״מ סוכות", type: "minor" },
  "2027-10-19": { name: "חוה״מ סוכות", type: "minor" },
  "2027-10-20": { name: "חוה״מ סוכות", type: "minor" },
  "2027-10-21": { name: "הושענא רבה", type: "minor" },
  "2027-10-22": { name: "שמחת תורה", type: "major" },
  "2027-12-24": { name: "ערב חנוכה", type: "minor" },
  "2027-12-25": { name: "חנוכה — נר 1", type: "minor" },
  "2027-12-26": { name: "חנוכה — נר 2", type: "minor" },
  "2027-12-27": { name: "חנוכה — נר 3", type: "minor" },
  "2027-12-28": { name: "חנוכה — נר 4", type: "minor" },
  "2027-12-29": { name: "חנוכה — נר 5", type: "minor" },
  "2027-12-30": { name: "חנוכה — נר 6", type: "minor" },
  "2027-12-31": { name: "חנוכה — נר 7", type: "minor" },

  // ===== 2028 (partial — covers main holidays) =====
  "2028-01-01": { name: "חנוכה — נר 8", type: "minor" },
  "2028-02-11": { name: "ט״ו בשבט", type: "minor" },
  "2028-03-12": { name: "פורים", type: "major" },
  "2028-04-11": { name: "פסח א׳", type: "major" },
  "2028-04-17": { name: "שביעי של פסח", type: "major" },
  "2028-05-02": { name: "יום השואה", type: "memorial" },
  "2028-05-09": { name: "יום הזיכרון", type: "memorial" },
  "2028-05-10": { name: "יום העצמאות", type: "national" },
  "2028-05-14": { name: "ל״ג בעומר", type: "minor" },
  "2028-05-24": { name: "יום ירושלים", type: "national" },
  "2028-05-31": { name: "שבועות", type: "major" },
};

export function getHoliday(iso: string): Holiday | undefined {
  return ISRAELI_HOLIDAYS[iso];
}
