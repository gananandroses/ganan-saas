"use client";

import { useState } from "react";
import {
  Camera,
  Upload,
  Bug,
  Calendar,
  DollarSign,
  TrendingUp,
  FileText,
  MessageSquare,
  Send,
  Leaf,
  Droplets,
  Scissors,
  Sprout,
  FlaskConical,
  Sun,
  ChevronDown,
  CheckSquare,
  Square,
  Star,
  Sparkles,
  Bot,
  User,
  AlertTriangle,
  CheckCircle,
  Info,
  ArrowRight,
  MapPin,
  Clock,
  BarChart3,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatMessage = {
  role: "user" | "ai";
  text: string;
};

type SeasonalRec = {
  icon: React.ReactNode;
  label: string;
  detail: string;
  color: string;
};

type JobType = {
  id: string;
  label: string;
};

type UpsellOpportunity = {
  title: string;
  revenue: string;
  message: string;
  tag: string;
};

// ─── Static Data ──────────────────────────────────────────────────────────────

const JOB_TYPES: JobType[] = [
  { id: "mowing", label: "כיסוח דשא" },
  { id: "pruning", label: "גיזום עצים" },
  { id: "irrigation", label: "תחזוקת השקיה" },
  { id: "fertilizing", label: "דישון" },
  { id: "planting", label: "שתילה" },
  { id: "spraying", label: "ריסוס" },
];

const CUSTOMERS = [
  "משפחת כהן - רחוב הרצל 12",
  "גב׳ לוי - שכונת הדר",
  "מר גולדברג - פארק העיר",
  "חברת אייל נדל״ן",
  "בית ספר אלון",
];

const APRIL_SEASONAL: SeasonalRec[] = [
  {
    icon: <Scissors className="w-5 h-5" />,
    label: "גזום",
    detail: "אפריל הוא זמן מצוין לגזום גדרות חיות ופרחים. גזמו לאחר הפריחה.",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  {
    icon: <Droplets className="w-5 h-5" />,
    label: "השקיה",
    detail: "הגדילו השקיה ל-3 פעמים בשבוע. טמפ׳ עולה — שימו לב לצריכת מים.",
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    icon: <FlaskConical className="w-5 h-5" />,
    label: "דישון",
    detail: "הוסיפו דשן אזוט לדשא ופוספור לפורחים. שעת בוקר — הכי יעיל.",
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  {
    icon: <Bug className="w-5 h-5" />,
    label: "ריסוס",
    detail: "בדקו עלים לכנימות. ריסוס מנע עם שמן נים בשעות הצהרים.",
    color: "text-red-600 bg-red-50 border-red-200",
  },
  {
    icon: <Sprout className="w-5 h-5" />,
    label: "שתילה",
    detail: "עכשיו זמן שתילת פלפל, עגבניות ומלפפון. קרקע אחרי גשם — אידיאלי.",
    color: "text-violet-600 bg-violet-50 border-violet-200",
  },
];

const EXAMPLE_UPSELL: UpsellOpportunity[] = [
  {
    title: "מערכת השקיה חכמה",
    revenue: "₪2,800",
    message:
      "שלום! שמתי לב שהגינה שלכם גדולה וצורכת הרבה מים — מערכת השקיה אוטומטית תחסוך לכם 40% ותשמור על הגינה בצורה מושלמת.",
    tag: "פוטנציאל גבוה",
  },
  {
    title: "טיפול חורפי מניע",
    revenue: "₪650",
    message:
      "עם תחילת הסתיו ממליץ להוסיף חבילת הגנה חורפית לגינה — כיסוי עצים, דישון מחזק ובדיקת ניקוז.",
    tag: "עונתי",
  },
  {
    title: "דשן אורגני פרימיום",
    revenue: "₪320",
    message:
      "ראיתי שהדשא שלכם מצהיב מעט בפינה הצפונית — דשן אורגני איכותי יטפל בבעיה תוך שבועיים.",
    tag: "בעיה זוהתה",
  },
];

const INITIAL_CHAT: ChatMessage[] = [
  {
    role: "user",
    text: "העלים של השמן הזית שלי מלבינים — מה הסיבה?",
  },
  {
    role: "ai",
    text: "לבינות העלים בעץ זית יכולה לנבוע ממספר סיבות: הסיבה הנפוצה ביותר היא מחסור בברזל (כלורוזה), במיוחד בקרקע אלקלינית. בנוסף, יתכן ריסוס ממולח, עשן, או מזיקים כמו זבוב הזית. המלצה: בדוק pH קרקע — אם מעל 7.5, הוסף גופרית וסידן. צרף תמונה ואנתח בדיוק.",
  },
  {
    role: "user",
    text: "מה pH אידיאלי לגינת ירקות?",
  },
  {
    role: "ai",
    text: "ה-pH האידיאלי לרוב הירקות הוא בין 6.0 ל-7.0. עגבניות ופלפל מועדפים על 6.2–6.8, בעוד תפוח אדמה מעדיף 5.5–6.0 קצת יותר חומצי. לבדיקה מהירה ניתן לרכוש קיט בדיקת pH בכל חנות גינון.",
  },
];

// ─── Helper Components ────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${color}`}
    >
      {label}
    </span>
  );
}

function ToolCard({
  children,
  accent,
  title,
  icon,
  badge,
}: {
  children: React.ReactNode;
  accent: string;
  title: string;
  icon: React.ReactNode;
  badge?: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
      <div className={`h-1.5 w-full ${accent}`} />
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-xl ${accent.replace("bg-", "bg-").replace("-500", "-100")} text-slate-700`}
            >
              {icon}
            </div>
            <h2 className="font-bold text-slate-800 text-base">{title}</h2>
          </div>
          {badge && (
            <Badge
              label={badge}
              color="bg-violet-100 text-violet-700 border border-violet-200"
            />
          )}
        </div>
        <div className="flex-1 flex flex-col">{children}</div>
      </div>
    </div>
  );
}

// ─── Tool 1: Plant Identification ─────────────────────────────────────────────

function PlantIdentifier() {
  const [analysed, setAnalysed] = useState(false);
  const [loading, setLoading] = useState(false);

  const simulate = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setAnalysed(true);
    }, 1400);
  };

  return (
    <ToolCard
      accent="bg-emerald-500"
      title="זיהוי צמחים"
      icon={<Leaf className="w-4 h-4 text-emerald-600" />}
      badge="בטא"
    >
      {!analysed ? (
        <div className="flex flex-col gap-3 flex-1">
          <div
            onClick={simulate}
            className="border-2 border-dashed border-emerald-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Camera className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-sm text-slate-500 text-center">
              גרור תמונה או לחץ לבחירה
            </p>
            <p className="text-xs text-slate-400">.jpg, .png, .webp עד 10MB</p>
          </div>
          <button
            onClick={simulate}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                מנתח תמונה...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                נתח עם AI
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 flex-1">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-bold text-emerald-800 text-base">
                  עץ לימון
                </p>
                <p className="text-xs text-emerald-600 italic">
                  Citrus limon
                </p>
              </div>
              <div className="flex items-center gap-1 bg-emerald-100 px-2 py-1 rounded-lg">
                <Star className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                <span className="text-xs font-bold text-emerald-700">
                  97% התאמה
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              עץ פרי ממשפחת ההדריים, נפוץ בגינות ביתיות בישראל. פורח באביב
              עם פרחים לבנים ריחניים ונושא פרי בחורף.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-lg p-2 border border-emerald-100">
                <p className="text-[10px] text-slate-400 mb-1">טיפול</p>
                <p className="text-xs text-slate-700">
                  השקיה עמוקה פעם בשבוע, דישון ציטרוסים באביב
                </p>
              </div>
              <div className="bg-white rounded-lg p-2 border border-emerald-100">
                <p className="text-[10px] text-slate-400 mb-1">עונה</p>
                <p className="text-xs text-slate-700">
                  פריחה: מרץ–אפריל | קציר: נובמבר–פברואר
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setAnalysed(false)}
            className="text-xs text-emerald-600 hover:underline text-center"
          >
            נתח תמונה אחרת
          </button>
        </div>
      )}
    </ToolCard>
  );
}

// ─── Tool 2: Disease & Pest Detection ────────────────────────────────────────

function DiseaseDetector() {
  const [detected, setDetected] = useState(false);
  const [loading, setLoading] = useState(false);

  const simulate = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setDetected(true);
    }, 1600);
  };

  return (
    <ToolCard
      accent="bg-red-500"
      title="זיהוי מחלות ומזיקים"
      icon={<Bug className="w-4 h-4 text-red-600" />}
      badge="בטא"
    >
      {!detected ? (
        <div className="flex flex-col gap-3 flex-1">
          <div
            onClick={simulate}
            className="border-2 border-dashed border-red-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-red-400 hover:bg-red-50 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-sm text-slate-500 text-center">
              העלה תמונה של צמח חולה
            </p>
            <p className="text-xs text-slate-400">
              כנימות, כתמים, עובש ועוד
            </p>
          </div>
          <button
            onClick={simulate}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                סורק מחלות...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                זהה מחלה
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 flex-1">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <p className="font-bold text-red-800">אבקת אבקת — מחלת אבקה לבנה</p>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              פטרייה המופיעה כציפוי לבן–אפרפר על העלים. מתפשטת מהר בלחות
              גבוהה. הצמח מאבד כוח ועלוול להתייבש.
            </p>
            <div className="space-y-2">
              <div className="bg-white rounded-lg p-2 border border-red-100">
                <p className="text-[10px] text-slate-400 mb-1">טיפול מומלץ</p>
                <p className="text-xs text-slate-700">
                  ריסוס תמיסת אשלגן סודה (1%) או שמן נים 3 פעמים בשבועיים
                </p>
              </div>
              <div className="bg-white rounded-lg p-2 border border-red-100">
                <p className="text-[10px] text-slate-400 mb-1">
                  חומרי טיפול
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {["שמן נים", "גופרית בית", "תכשיר פטרייתי"].map((c) => (
                    <span
                      key={c}
                      className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => setDetected(false)}
            className="text-xs text-red-500 hover:underline text-center"
          >
            בדוק תמונה נוספת
          </button>
        </div>
      )}
    </ToolCard>
  );
}

// ─── Tool 3: Seasonal Planner ─────────────────────────────────────────────────

function SeasonalPlanner() {
  const months = [
    "ינואר",
    "פברואר",
    "מרץ",
    "אפריל",
    "מאי",
    "יוני",
    "יולי",
    "אוגוסט",
    "ספטמבר",
    "אוקטובר",
    "נובמבר",
    "דצמבר",
  ];
  const cities = ["תל אביב", "ירושלים", "חיפה", "באר שבע", "אילת", "נתניה"];

  const [month, setMonth] = useState("אפריל");
  const [city, setCity] = useState("תל אביב");

  return (
    <ToolCard
      accent="bg-amber-500"
      title="תכנון עונתי חכם"
      icon={<Calendar className="w-4 h-4 text-amber-600" />}
    >
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 pr-8 focus:outline-none focus:ring-2 focus:ring-amber-300"
          >
            {months.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative flex-1">
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 pr-8 focus:outline-none focus:ring-2 focus:ring-amber-300"
          >
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-3">
        <div className="flex items-center gap-2 mb-3">
          <Sun className="w-5 h-5 text-amber-500" />
          <p className="font-bold text-amber-800 text-sm">
            {month} ב{city} — המלצות AI
          </p>
        </div>
        <div className="space-y-2">
          {APRIL_SEASONAL.map((rec) => (
            <div
              key={rec.label}
              className={`flex items-start gap-3 p-2.5 rounded-lg border ${rec.color}`}
            >
              <div className="mt-0.5 shrink-0">{rec.icon}</div>
              <div>
                <p className="text-xs font-bold mb-0.5">{rec.label}</p>
                <p className="text-[11px] leading-relaxed opacity-80">
                  {rec.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Info className="w-3 h-3" />
        מבוסס על נתוני אקלים ועונות ישראל
      </div>
    </ToolCard>
  );
}

// ─── Tool 4: Auto Pricing ─────────────────────────────────────────────────────

function AutoPricing() {
  const [size, setSize] = useState("medium");
  const [freq, setFreq] = useState("monthly");
  const [location, setLocation] = useState("center");
  const [jobs, setJobs] = useState<string[]>(["mowing"]);
  const [showResult, setShowResult] = useState(false);

  const toggleJob = (id: string) => {
    setJobs((prev) =>
      prev.includes(id) ? prev.filter((j) => j !== id) : [...prev, id]
    );
  };

  const basePrice =
    size === "small" ? 200 : size === "medium" ? 380 : 650;
  const jobMultiplier = 1 + (jobs.length - 1) * 0.35;
  const freqDiscount =
    freq === "weekly" ? 0.85 : freq === "biweekly" ? 0.92 : 1;
  const locationMult = location === "center" ? 1.1 : location === "south" ? 0.95 : 1;
  const total = Math.round(
    basePrice * jobMultiplier * freqDiscount * locationMult
  );

  return (
    <ToolCard
      accent="bg-blue-500"
      title="תמחור אוטומטי"
      icon={<DollarSign className="w-4 h-4 text-blue-600" />}
    >
      <div className="flex flex-col gap-3 flex-1">
        {/* Size */}
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1.5">
            גודל גינה
          </p>
          <div className="flex gap-2">
            {[
              { id: "small", label: "קטן עד 100מ׳" },
              { id: "medium", label: "בינוני 100–300מ׳" },
              { id: "large", label: "גדול 300מ׳+" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setSize(s.id)}
                className={`flex-1 text-xs py-1.5 rounded-lg border transition-all ${
                  size === s.id
                    ? "bg-blue-500 text-white border-blue-500 font-semibold"
                    : "border-slate-200 text-slate-600 hover:border-blue-300"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Jobs */}
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1.5">
            סוגי עבודה
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {JOB_TYPES.map((j) => (
              <button
                key={j.id}
                onClick={() => toggleJob(j.id)}
                className="flex items-center gap-1.5 text-xs p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {jobs.includes(j.id) ? (
                  <CheckSquare className="w-4 h-4 text-blue-500 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-300 shrink-0" />
                )}
                <span
                  className={
                    jobs.includes(j.id) ? "text-blue-700 font-medium" : "text-slate-600"
                  }
                >
                  {j.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Frequency + Location */}
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <p className="text-xs font-semibold text-slate-500 mb-1">תדירות</p>
            <select
              value={freq}
              onChange={(e) => setFreq(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="weekly">שבועי (–15%)</option>
              <option value="biweekly">דו-שבועי (–8%)</option>
              <option value="monthly">חודשי</option>
            </select>
          </div>
          <div className="relative">
            <p className="text-xs font-semibold text-slate-500 mb-1">מיקום</p>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="center">מרכז (+10%)</option>
              <option value="north">צפון</option>
              <option value="south">דרום (–5%)</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => setShowResult(true)}
          className="w-full py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          חשב מחיר מומלץ
        </button>

        {showResult && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-blue-900 text-lg">
                ₪{total}
                <span className="text-xs font-normal text-blue-600 mr-1">
                  / ביקור
                </span>
              </p>
              <Badge label="מחיר שוק" color="bg-green-100 text-green-700" />
            </div>
            <div className="space-y-1.5 mb-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">בסיס גינה</span>
                <span className="font-medium">₪{basePrice}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">
                  עבודות ({jobs.length})
                </span>
                <span className="font-medium">
                  +{Math.round((jobMultiplier - 1) * 100)}%
                </span>
              </div>
              {freqDiscount < 1 && (
                <div className="flex justify-between text-xs text-green-600">
                  <span>הנחת תדירות</span>
                  <span>–{Math.round((1 - freqDiscount) * 100)}%</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
              <BarChart3 className="w-3 h-3" />
              טווח מתחרים באזור: ₪{total - 60}–₪{total + 90}
            </div>
            <button className="w-full py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1">
              הוסף כלקוח חדש עם מחיר זה
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </ToolCard>
  );
}

// ─── Tool 5: Upsell Engine ────────────────────────────────────────────────────

function UpsellEngine() {
  const [customer, setCustomer] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const analyse = () => {
    if (!customer) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setLoaded(true);
    }, 1800);
  };

  return (
    <ToolCard
      accent="bg-violet-500"
      title="הצעת Upsell חכמה"
      icon={<TrendingUp className="w-4 h-4 text-violet-600" />}
      badge="בטא"
    >
      <div className="flex flex-col gap-3 flex-1">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <select
              value={customer}
              onChange={(e) => {
                setCustomer(e.target.value);
                setLoaded(false);
              }}
              className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              <option value="">בחר לקוח...</option>
              {CUSTOMERS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <button
            onClick={analyse}
            disabled={!customer || loading}
            className="px-4 py-2 rounded-xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            נתח
          </button>
        </div>

        {loaded && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 mb-1">
              3 הזדמנויות Upsell עבור {customer.split(" - ")[0]}:
            </p>
            {EXAMPLE_UPSELL.map((opp, i) => (
              <div
                key={i}
                className="bg-violet-50 border border-violet-200 rounded-xl p-3"
              >
                <div className="flex items-start justify-between mb-1.5">
                  <p className="font-bold text-violet-900 text-xs">
                    {opp.title}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      label={opp.tag}
                      color="bg-violet-100 text-violet-700"
                    />
                    <span className="text-xs font-bold text-green-600">
                      {opp.revenue}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
                  {opp.message}
                </p>
                <button className="text-[11px] text-violet-600 font-semibold hover:underline flex items-center gap-1">
                  שלח ללקוח
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {!loaded && !loading && !customer && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-slate-400 text-center">
              בחר לקוח לניתוח הזדמנויות מכירה
            </p>
          </div>
        )}
      </div>
    </ToolCard>
  );
}

// ─── Tool 6: Visit Summary ────────────────────────────────────────────────────

function VisitSummary() {
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState<null | {
    professional: string;
    issues: string[];
    recommendations: string[];
    nextVisit: string;
  }>(null);
  const [loading, setLoading] = useState(false);

  const generate = () => {
    if (!notes.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSummary({
        professional:
          "בוצע ביקור תחזוקה שגרתי. כוסחה הדשא, נגזמו שיחים לאורך הגדר ובוצק בדיקת מערכת השקיה. זוהו מספר בעיות הדורשות מעקב.",
        issues: [
          "חלק מתזי ההשקיה אינם מכוונים כהלכה",
          "שיח הבוגנוויליה מראה סימני עקה מחום",
          "ריצוף הטרסה — אבן אחת רופפת",
        ],
        recommendations: [
          "כוונון תזי ההשקיה — לתכנן לביקור הבא",
          "הגברת השקיה לבוגנוויליה בשעות הבוקר",
          "הודעה ללקוח על אבן הריצוף",
        ],
        nextVisit: "ביקור הבא מומלץ בעוד 14 יום — בדיקת תזי ההשקיה לאחר כוונון.",
      });
    }, 1500);
  };

  return (
    <ToolCard
      accent="bg-teal-500"
      title="סיכום ביקור AI"
      icon={<FileText className="w-4 h-4 text-teal-600" />}
    >
      <div className="flex flex-col gap-3 flex-1">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="רשום הערות מהביקור... כיסחנו דשא, גזמנו, בדקנו השקיה, ראינו בעיה ב..."
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-300 min-h-[80px]"
          dir="rtl"
        />
        <button
          onClick={generate}
          disabled={!notes.trim() || loading}
          className="w-full py-2.5 rounded-xl bg-teal-500 text-white text-sm font-semibold hover:bg-teal-600 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              מייצר סיכום...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              צור סיכום מקצועי
            </>
          )}
        </button>

        {summary && (
          <div className="space-y-2">
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
              <p className="text-[10px] font-bold text-teal-600 uppercase mb-1">
                סיכום מקצועי
              </p>
              <p className="text-xs text-slate-700 leading-relaxed">
                {summary.professional}
              </p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-3">
              <p className="text-[10px] font-bold text-red-600 uppercase mb-1.5">
                בעיות שזוהו
              </p>
              <ul className="space-y-1">
                {summary.issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                    <AlertTriangle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-3">
              <p className="text-[10px] font-bold text-green-600 uppercase mb-1.5">
                המלצות
              </p>
              <ul className="space-y-1">
                {summary.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                    <CheckCircle className="w-3 h-3 text-green-400 shrink-0 mt-0.5" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
              <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-700">{summary.nextVisit}</p>
            </div>
          </div>
        )}
      </div>
    </ToolCard>
  );
}

// ─── AI Chat Assistant ────────────────────────────────────────────────────────

function AIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        role: "ai",
        text: "תודה על שאלתך! בהתבסס על הנתונים הזמינים — ממליץ לבדוק את הצמח בשעות הבוקר המוקדמות ולהשוות עם מאפייני הגינה שלך. נשמח לנתח תמונה מקרוב לתשובה מדויקת יותר.",
      };
      setMessages((prev) => [...prev, aiMsg]);
      setLoading(false);
    }, 1400);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-blue-500" />
      <div className="p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">שאל את הגנן AI</h2>
            <p className="text-xs text-slate-400">
              עוזר חכם — מומחה גינון וירקות
            </p>
          </div>
          <div className="mr-auto flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-600 font-medium">Online</span>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 mb-4 space-y-3 max-h-80 overflow-y-auto">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center ${
                  msg.role === "ai"
                    ? "bg-gradient-to-br from-emerald-400 to-teal-500"
                    : "bg-slate-200"
                }`}
              >
                {msg.role === "ai" ? (
                  <Bot className="w-4 h-4 text-white" />
                ) : (
                  <User className="w-4 h-4 text-slate-500" />
                )}
              </div>
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === "ai"
                    ? "bg-white border border-slate-200 text-slate-700 rounded-tr-sm shadow-sm"
                    : "bg-emerald-500 text-white rounded-tl-sm"
                }`}
                dir="rtl"
              >
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shrink-0 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tr-sm px-4 py-3 flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="שאל שאלה על גינון, צמחים, מחלות..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            dir="rtl"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 transition-colors flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {[
            "איך לטפל בכנימות?",
            "מתי לשתול עגבניות?",
            "כמה לדשן ורדים?",
          ].map((q) => (
            <button
              key={q}
              onClick={() => setInput(q)}
              className="text-xs bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 px-3 py-1.5 rounded-full transition-colors border border-transparent hover:border-emerald-200"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AIToolsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              כלי AI לגינון
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <p className="text-sm text-slate-500 font-medium">
                <span className="text-amber-600 font-bold">גרסת הדגמה</span>
                {" "}— AI מלא בקרוב
              </p>
            </div>
          </div>
          <div className="mr-auto hidden sm:flex items-center gap-2 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl px-4 py-2">
            <MapPin className="w-4 h-4 text-violet-500" />
            <span className="text-xs font-medium text-violet-700">
              6 כלי AI פעילים
            </span>
          </div>
        </div>
        <p className="text-slate-500 text-sm mt-3 max-w-2xl">
          חבילת הכלים החכמה לניהול עסק גינון — זיהוי צמחים ומחלות, תמחור
          אוטומטי, תכנון עונתי ועוד. כולם מופעלים על ידי AI מתקדם.
        </p>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
        <PlantIdentifier />
        <DiseaseDetector />
        <SeasonalPlanner />
        <AutoPricing />
        <UpsellEngine />
        <VisitSummary />
      </div>

      {/* AI Chat */}
      <AIChat />

      {/* Footer note */}
      <p className="text-center text-xs text-slate-400 mt-6">
        כל הכלים מבוססי AI ומיועדים כסיוע — תמיד אמת תוצאות עם הידע המקצועי שלך
      </p>
    </div>
  );
}
