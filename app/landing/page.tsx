"use client";

import { useState, useEffect } from "react";
import {
  Leaf,
  Users,
  Calendar,
  MessageCircle,
  DollarSign,
  Bot,
  MapPin,
  Star,
  ChevronDown,
  ChevronUp,
  Check,
  Menu,
  X,
  ArrowRight,
  Play,
  Shield,
  Zap,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FAQItem {
  q: string;
  a: string;
}

interface Feature {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
  bg: string;
}

interface Testimonial {
  name: string;
  city: string;
  quote: string;
  stars: number;
  initials: string;
  color: string;
}

interface PricingPlan {
  name: string;
  price: number;
  popular: boolean;
  features: string[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const features: Feature[] = [
  {
    icon: <Users size={28} />,
    title: "ניהול לקוחות חכם",
    desc: "CRM מלא עם היסטוריה מלאה, תמונות, הערות ומעקב אחר כל לקוח",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    icon: <Calendar size={28} />,
    title: "לוח זמנים אוטומטי",
    desc: "תזמון חכם עם תזכורות אוטומטיות ואישורי הגעה ללקוח",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: <MessageCircle size={28} />,
    title: "WhatsApp אוטומטי",
    desc: "מענה אוטומטי, תזכורות תשלום ועדכוני עבודה בזמן אמת",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: <DollarSign size={28} />,
    title: "ניהול פיננסי",
    desc: "חשבוניות מהירות, מעקב תשלומים, ודוחות רווח מפורטים",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    icon: <Bot size={28} />,
    title: "AI לגינון",
    desc: "זיהוי צמחים, תמחור חכם והצעות Upsell מותאמות לכל לקוח",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    icon: <MapPin size={28} />,
    title: "GPS עובדים",
    desc: "מעקב שטח בזמן אמת ואופטימיזציית מסלולים לחסכון בדלק",
    color: "text-red-600",
    bg: "bg-red-50",
  },
];

const testimonials: Testimonial[] = [
  {
    name: "דוד כהן",
    city: "תל אביב",
    quote:
      "גנן Pro שינה את העסק שלי לחלוטין. חסכתי 8 שעות עבודה בשבוע ורווחיתי 40% יותר תוך 3 חודשים.",
    stars: 5,
    initials: "דכ",
    color: "bg-green-500",
  },
  {
    name: "משה לוי",
    city: "חיפה",
    quote:
      "האוטומציה של WhatsApp לבדה שווה את כל המחיר. הלקוחות שלי מקבלים תזכורות ואני לא מפספס אף תשלום.",
    stars: 5,
    initials: "מל",
    color: "bg-blue-500",
  },
  {
    name: "יוסי אברהם",
    city: "ירושלים",
    quote:
      "סוף סוף יש לי שליטה מלאה על הכספים. יודע בדיוק כמה כל לקוח שווה לי ואיפה להשקיע.",
    stars: 5,
    initials: "יא",
    color: "bg-purple-500",
  },
];

const plans: PricingPlan[] = [
  {
    name: "Basic",
    price: 79,
    popular: false,
    features: [
      "עד 30 לקוחות",
      "יומן עבודה",
      "ניהול לקוחות",
      "ניהול פיננסי",
      "תמיכה בצ'אט",
    ],
  },
  {
    name: "Pro",
    price: 149,
    popular: true,
    features: [
      "עד 100 לקוחות",
      "הכל ב-Basic",
      "WhatsApp אוטומטי",
      "AI לגינון",
      "GPS עובדים",
      "דוחות מתקדמים",
      "תמיכה עדיפות",
    ],
  },
  {
    name: "Business",
    price: 299,
    popular: false,
    features: [
      "לקוחות ללא הגבלה",
      "הכל ב-Pro",
      "גישת API",
      "White-label",
      "מנהל חשבון אישי",
      "תמיכת VIP 24/7",
    ],
  },
];

const faqs: FAQItem[] = [
  {
    q: "מה כלול בתקופת הניסיון?",
    a: "תקופת הניסיון כוללת גישה מלאה לכל הפיצ'רים של פלאן Pro למשך 14 יום, ללא צורך בכרטיס אשראי. תוכל לנסות את כל הפיצ'רים ולהחליט אם זה מתאים לך.",
  },
  {
    q: "האם יש אפליקציה לנייד?",
    a: "כן! גנן Pro פועלת מצוין על כל מכשיר — מובייל, טאבלט ומחשב. האפליקציה מותאמת מלא לשימוש בשטח, כולל מצב offline.",
  },
  {
    q: "איך עובד ה-WhatsApp האוטומטי?",
    a: "אנחנו מתחברים לחשבון ה-WhatsApp Business שלך ומאפשרים שליחת הודעות אוטומטיות — תזכורות פגישות, אישורי עבודה, תזכורות תשלום ועוד. הגדרה מלאה ב-5 דקות.",
  },
  {
    q: "האם הנתונים שלי מאובטחים?",
    a: "בהחלט. כל הנתונים מוצפנים ב-AES-256, מאוחסנים בשרתים מאובטחים בישראל, ועומדים בתקן GDPR. אנחנו מבצעים גיבויים יומיים ומספקים SLA של 99.9% זמינות.",
  },
  {
    q: "איך מבטלים?",
    a: "ביטול פשוט בלחיצה אחת מהגדרות החשבון, ללא עמלות ביטול. הנתונים שלך יישמרו לאורך 30 יום לאחר הביטול לצורך ייצוא.",
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function MockDashboard() {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-green-400 opacity-20 blur-3xl rounded-3xl" />

      {/* Main card */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Top bar */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-5 py-3 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400 opacity-80" />
            <div className="w-3 h-3 rounded-full bg-yellow-400 opacity-80" />
            <div className="w-3 h-3 rounded-full bg-green-300 opacity-80" />
          </div>
          <div className="flex-1 text-center text-white text-xs font-medium opacity-80">
            גנן Pro — לוח בקרה
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* KPI Row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "לקוחות פעילים", value: "47", delta: "+3", color: "text-green-600" },
              { label: "הכנסה החודש", value: "₪12,400", delta: "+18%", color: "text-blue-600" },
              { label: "עבודות השבוע", value: "23", delta: "5 ממתינות", color: "text-amber-600" },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-gray-50 rounded-xl p-3 text-center">
                <div className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</div>
                <div className="text-xs text-gray-500 mt-0.5 leading-tight">{kpi.label}</div>
                <div className="text-xs font-medium text-green-600 mt-1">{kpi.delta}</div>
              </div>
            ))}
          </div>

          {/* Recent activity */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              פעילות אחרונה
            </div>
            {[
              { emoji: "🌿", text: "גיזום גינה — יוסי כהן", time: "לפני 10 דק'", color: "bg-green-100" },
              { emoji: "💬", text: "WhatsApp נשלח — מירה לוי", time: "לפני 25 דק'", color: "bg-blue-100" },
              { emoji: "💰", text: "תשלום התקבל ₪850", time: "לפני שעה", color: "bg-emerald-100" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50">
                <div className={`w-8 h-8 rounded-full ${item.color} flex items-center justify-center text-sm`}>
                  {item.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-700 truncate">{item.text}</div>
                  <div className="text-xs text-gray-400">{item.time}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Mini chart bar */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              הכנסות השבוע
            </div>
            <div className="flex items-end gap-1.5 h-12">
              {[40, 65, 45, 80, 60, 90, 70].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-gradient-to-t from-green-600 to-emerald-400 opacity-80"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-300">
              <span>א</span><span>ב</span><span>ג</span><span>ד</span><span>ה</span><span>ו</span><span>ש</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg px-3 py-2 flex items-center gap-2 border border-green-100">
        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
          <Check size={12} className="text-white" />
        </div>
        <span className="text-xs font-semibold text-gray-700">תשלום התקבל!</span>
      </div>

      <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg px-3 py-2 flex items-center gap-2 border border-blue-100">
        <MessageCircle size={14} className="text-blue-500" />
        <span className="text-xs font-semibold text-gray-700">WhatsApp נשלח ✓</span>
      </div>
    </div>
  );
}

function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      {items.map((item, i) => (
        <div
          key={i}
          className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
        >
          <button
            className="w-full flex items-center justify-between px-6 py-4 text-right"
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
          >
            <span className="font-semibold text-gray-800 text-sm leading-relaxed">
              {item.q}
            </span>
            <span className="flex-shrink-0 mr-4 text-green-600">
              {openIndex === i ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </span>
          </button>
          <div
            className={`overflow-hidden transition-all duration-300 ${
              openIndex === i ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="px-6 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-3">
              {item.a}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div dir="rtl" className="font-sans text-gray-900 overflow-x-hidden">
      {/* ── NAVBAR ──────────────────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-200 ${
          scrolled ? "bg-white shadow-md" : "bg-white/90 backdrop-blur-sm"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/landing" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Leaf size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">
              גנן <span className="text-green-600">Pro</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-green-600 transition-colors text-sm font-medium">
              יתרונות
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-green-600 transition-colors text-sm font-medium">
              תמחור
            </a>
            <a href="#faq" className="text-gray-600 hover:text-green-600 transition-colors text-sm font-medium">
              שאלות
            </a>
            <Link href="/login" className="text-gray-600 hover:text-green-600 transition-colors text-sm font-medium">
              התחברות
            </Link>
            <Link
              href="/register"
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm hover:shadow"
            >
              התחל חינם
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="תפריט"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3 shadow-lg">
            {["#features:יתרונות", "#pricing:תמחור", "#faq:שאלות"].map((item) => {
              const [href, label] = item.split(":");
              return (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="block text-gray-700 font-medium py-2 text-sm"
                >
                  {label}
                </a>
              );
            })}
            <Link
              href="/register"
              className="block bg-green-600 text-white text-center py-3 rounded-lg font-semibold text-sm mt-2"
              onClick={() => setMenuOpen(false)}
            >
              התחל חינם
            </Link>
          </div>
        )}
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-20 px-4 sm:px-6 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-emerald-50 -z-10" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-green-200 opacity-20 rounded-full blur-3xl -z-10 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-200 opacity-20 rounded-full blur-3xl -z-10 translate-x-1/2 translate-y-1/2" />

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text side */}
            <div className="text-right">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                <Zap size={12} />
                <span>מספר 1 לגננים בישראל</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-gray-900 mb-5">
                נהל את עסק הגינון שלך{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-l from-green-600 to-emerald-500">
                  כמו מקצוען
                </span>
              </h1>

              <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-lg">
                אפליקציה חכמה לניהול לקוחות, לוח זמנים, פיננסים ואוטומציות WhatsApp — הכל במקום אחד
              </p>

              <div className="flex flex-wrap gap-3 mb-8">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-7 py-3.5 rounded-xl font-bold text-base transition-all shadow-lg shadow-green-200 hover:shadow-green-300 hover:-translate-y-0.5"
                >
                  התחל ניסיון חינם 14 יום
                  <ArrowRight size={18} />
                </Link>
                <button className="inline-flex items-center gap-2 border-2 border-gray-200 hover:border-green-300 text-gray-700 px-6 py-3.5 rounded-xl font-semibold text-base transition-all hover:bg-green-50">
                  <Play size={16} className="text-green-600" />
                  צפה בדמו
                </button>
              </div>

              {/* Social proof */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                {["ללא כרטיס אשראי", "הגדרה ב-5 דקות", "ביטול בכל עת"].map((text) => (
                  <span key={text} className="flex items-center gap-1.5">
                    <Check size={15} className="text-green-500" />
                    {text}
                  </span>
                ))}
              </div>
            </div>

            {/* Dashboard preview */}
            <div className="relative flex justify-center lg:justify-end mt-8 lg:mt-0 px-6 py-8">
              <MockDashboard />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ───────────────────────────────────────────────────────── */}
      <div className="bg-gray-900 text-white py-5">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-3 gap-4 text-center">
          {[
            { value: "500+", label: "גננים פעילים" },
            { value: "18,000+", label: "לקוחות מנוהלים" },
            { value: "₪2.3M", label: "הכנסות מנוהלות" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl sm:text-3xl font-extrabold text-green-400">{stat.value}</div>
              <div className="text-xs sm:text-sm text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              <TrendingUp size={12} />
              <span>כל מה שגנן צריך</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              למה <span className="text-green-600">גנן Pro?</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              כל הכלים שאתה צריך לנהל ולהצמיח את עסק הגינון שלך — בפלטפורמה אחת חכמה
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-2xl border border-gray-100 bg-white hover:border-green-200 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 ${f.bg} ${f.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
              גננים שכבר{" "}
              <span className="text-green-600">מרוויחים יותר</span>
            </h2>
            <p className="text-gray-500 text-lg">מה הם אומרים על גנן Pro</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 hover:shadow-xl transition-shadow"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} size={16} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>

                <p className="text-gray-700 text-sm leading-relaxed mb-5 italic">
                  &ldquo;{t.quote}&rdquo;
                </p>

                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${t.color} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                    <div className="text-gray-400 text-xs">{t.city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
              מחירים פשוטים וברורים
            </h2>
            <p className="text-gray-500 text-lg mb-3">ללא הפתעות. ביטול בכל עת.</p>
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 text-sm font-semibold px-4 py-2 rounded-full">
              <Zap size={14} />
              חסוך 20% בתשלום שנתי
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-7 flex flex-col transition-all ${
                  plan.popular
                    ? "bg-green-600 text-white shadow-2xl shadow-green-200 scale-105"
                    : "bg-white border border-gray-200 hover:border-green-300 hover:shadow-lg"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-4 py-1.5 rounded-full shadow-md whitespace-nowrap">
                    ⭐ הפופולרי ביותר
                  </div>
                )}

                <div className="mb-6">
                  <div className={`text-lg font-bold mb-1 ${plan.popular ? "text-green-100" : "text-gray-500"}`}>
                    {plan.name}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-extrabold ${plan.popular ? "text-white" : "text-gray-900"}`}>
                      ₪{plan.price}
                    </span>
                    <span className={`text-sm ${plan.popular ? "text-green-200" : "text-gray-400"}`}>/חודש</span>
                  </div>
                </div>

                <ul className="space-y-3 flex-1 mb-7">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2.5 text-sm">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        plan.popular ? "bg-green-500" : "bg-green-100"
                      }`}>
                        <Check size={11} className={plan.popular ? "text-white" : "text-green-600"} />
                      </div>
                      <span className={plan.popular ? "text-green-50" : "text-gray-700"}>{feat}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={`block text-center py-3 rounded-xl font-bold text-sm transition-all ${
                    plan.popular
                      ? "bg-white text-green-700 hover:bg-green-50"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  התחל עכשיו
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
              שאלות נפוצות
            </h2>
            <p className="text-gray-500 text-lg">יש לך שאלה? בטח תמצא כאן את התשובה</p>
          </div>
          <FAQAccordion items={faqs} />
        </div>
      </section>

      {/* ── FOOTER CTA ──────────────────────────────────────────────────────── */}
      <section className="relative py-24 px-4 sm:px-6 bg-gradient-to-br from-green-600 to-emerald-600 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-8 right-8 w-64 h-64 border-2 border-white rounded-full" />
          <div className="absolute bottom-8 left-8 w-48 h-48 border-2 border-white rounded-full" />
          <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-white rounded-full blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2" />
        </div>

        <div className="relative max-w-2xl mx-auto text-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
            <Leaf size={32} className="text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            מוכן להתחיל?
          </h2>
          <p className="text-green-100 text-lg mb-8 leading-relaxed">
            הצטרף ל-500+ גננים שכבר מנהלים את העסק שלהם בצורה חכמה יותר
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-green-700 hover:bg-green-50 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
          >
            התחל ניסיון חינם עכשיו
            <ArrowRight size={20} />
          </Link>
          <div className="flex justify-center flex-wrap gap-5 mt-6 text-green-100 text-sm">
            {["14 יום ניסיון חינם", "ללא כרטיס אשראי", "הגדרה ב-5 דקות"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <Check size={14} />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10">
            {/* Brand */}
            <div className="max-w-xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center">
                  <Leaf size={14} className="text-white" />
                </div>
                <span className="text-white font-bold text-lg">
                  גנן <span className="text-green-500">Pro</span>
                </span>
              </div>
              <p className="text-sm leading-relaxed">
                הפלטפורמה המקצועית לניהול עסקי גינון בישראל
              </p>
            </div>

            {/* Links */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
              <div>
                <div className="text-white font-semibold mb-3">מוצר</div>
                <div className="space-y-2">
                  <a href="#features" className="block hover:text-green-400 transition-colors">יתרונות</a>
                  <a href="#pricing" className="block hover:text-green-400 transition-colors">תמחור</a>
                  <a href="#faq" className="block hover:text-green-400 transition-colors">שאלות</a>
                </div>
              </div>
              <div>
                <div className="text-white font-semibold mb-3">חשבון</div>
                <div className="space-y-2">
                  <Link href="/login" className="block hover:text-green-400 transition-colors">התחברות</Link>
                  <Link href="/register" className="block hover:text-green-400 transition-colors">הרשמה</Link>
                  <Link href="/dashboard" className="block hover:text-green-400 transition-colors">לוח בקרה</Link>
                </div>
              </div>
              <div>
                <div className="text-white font-semibold mb-3">חברה</div>
                <div className="space-y-2">
                  <a href="#" className="block hover:text-green-400 transition-colors">אודות</a>
                  <a href="#" className="block hover:text-green-400 transition-colors">פרטיות</a>
                  <a href="#" className="block hover:text-green-400 transition-colors">תנאי שימוש</a>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Shield size={13} className="text-green-500" />
              <span>כל הנתונים מוצפנים ומאובטחים</span>
            </div>
            <div>© {new Date().getFullYear()} גנן Pro. כל הזכויות שמורות.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
