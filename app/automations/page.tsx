"use client";

import { useState } from "react";
import Header from "@/components/Header";
import {
  MessageSquare,
  Zap,
  Calendar,
  CreditCard,
  Mail,
  Navigation,
  ToggleLeft,
  ToggleRight,
  Plus,
  ChevronDown,
  Play,
  Pause,
  Clock,
  TrendingUp,
  CheckCircle,
  Repeat,
  BellRing,
  Camera,
  ArrowRight,
  Sparkles,
  Activity,
  Bot,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface AutomationCard {
  id: string;
  title: string;
  description: string;
  message: string;
  trigger: string;
  timesTriggered: number;
  lastRun: string;
  enabled: boolean;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

interface ActiveAutomation {
  id: string;
  name: string;
  trigger: string;
  lastRun: string;
  timesTriggered: number;
  status: "active" | "paused";
}

// ─────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────

const initialWhatsappAutomations: AutomationCard[] = [
  {
    id: "wa1",
    title: "אישור הגעה",
    description: "שולח הודעה ללקוח יומיים לפני הביקור",
    message: "שלום {שם}, אנחנו מגיעים מחר ב-{שעה}. יש שינוי? ✅",
    trigger: "יומיים לפני ביקור מתוזמן",
    timesTriggered: 38,
    lastRun: "אתמול, 18:00",
    enabled: true,
    icon: <CheckCircle size={20} />,
    color: "text-green-600",
    bgColor: "bg-green-50 border-green-200",
  },
  {
    id: "wa2",
    title: "תזכורת תשלום",
    description: "שולח תזכורת 7 ימים לאחר הוצאת חשבונית",
    message: "שלום {שם}, יש חשבונית פתוחה של ₪{סכום}. ניתן לשלם ב...",
    trigger: "7 ימים לאחר חשבונית פתוחה",
    timesTriggered: 12,
    lastRun: "לפני 3 ימים",
    enabled: true,
    icon: <CreditCard size={20} />,
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200",
  },
  {
    id: "wa3",
    title: "מענה אוטומטי",
    description: "מגיב להודעות וואטסאפ חדשות בשעות העבודה",
    message: "שלום! קיבלנו את הודעתך. ניצור איתך קשר בקרוב 🌿",
    trigger: "הודעה נכנסת בשעות 07:00–18:00",
    timesTriggered: 54,
    lastRun: "היום, 09:14",
    enabled: false,
    icon: <Bot size={20} />,
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
  },
  {
    id: "wa4",
    title: "עדכון סיום עבודה",
    description: "שולח סיכום + תמונות לפני/אחרי עם סיום כל עבודה",
    message: "העבודה הושלמה! מצ\"ב תמונות לפני ואחרי 📸 תודה שבחרתם בנו!",
    trigger: "סיום עבודה (סטטוס → הושלם)",
    timesTriggered: 29,
    lastRun: "לפני שעתיים",
    enabled: true,
    icon: <Camera size={20} />,
    color: "text-purple-600",
    bgColor: "bg-purple-50 border-purple-200",
  },
  {
    id: "wa5",
    title: "Upsell חודשי",
    description: "מציע שירות רלוונטי ללקוחות לפי עונה ופרופיל",
    message: "שלום {שם}, עונת האביב כאן! 🌸 חשבת על שתילה מחדש? השאיר לנו הודעה",
    trigger: "תחילת חודש — לקוחות רלוונטיים",
    timesTriggered: 8,
    lastRun: "לפני 4 ימים",
    enabled: true,
    icon: <Sparkles size={20} />,
    color: "text-pink-600",
    bgColor: "bg-pink-50 border-pink-200",
  },
];

const activeAutomations: ActiveAutomation[] = [
  { id: "a1", name: "אישור הגעה", trigger: "יומיים לפני ביקור", lastRun: "אתמול", timesTriggered: 38, status: "active" },
  { id: "a2", name: "תזכורת תשלום", trigger: "7 ימים לאחר חשבונית", lastRun: "לפני 3 ימים", timesTriggered: 12, status: "active" },
  { id: "a3", name: "מענה אוטומטי", trigger: "הודעה נכנסת", lastRun: "היום 09:14", timesTriggered: 54, status: "paused" },
  { id: "a4", name: "עדכון סיום עבודה", trigger: "סיום עבודה", lastRun: "לפני שעתיים", timesTriggered: 29, status: "active" },
  { id: "a5", name: "Upsell חודשי", trigger: "תחילת חודש", lastRun: "01/04/2026", timesTriggered: 8, status: "active" },
];

const triggerOptions = [
  "לקוח לא אישר הגעה → שלח הודעה",
  "עבודה הושלמה → צלם תמונה ושלח",
  "יתרה פתוחה → שלח תזכורת",
  "הודעה נכנסת → מענה אוטומטי",
  "תחילת חודש → הצע Upsell",
];

const actionOptions = [
  "שלח הודעת וואטסאפ",
  "שלח מייל",
  "צור פגישה בגוגל קלנדר",
  "שלח קישור Bit",
  "הפק דוח שבועי",
];

const delayOptions = ["מיידי", "30 דקות", "שעה", "יום", "3 ימים", "שבוע"];

const chatMessages = [
  { from: "business", text: "שלום! קיבלנו את הודעתך. ניצור איתך קשר בקרוב 🌿", time: "09:14" },
  { from: "customer", text: "היי, רציתי לשאול מתי אתם מגיעים השבוע?", time: "09:13" },
  { from: "business", text: "שלום משפחת כהן, אנחנו מגיעים מחר ב-09:00. יש שינוי? ✅", time: "08:00" },
  { from: "customer", text: "מושלם, תודה!", time: "08:05" },
  { from: "business", text: "העבודה הושלמה! מצ\"ב תמונות לפני ואחרי 📸", time: "12:45" },
];

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function WhatsAppPreview() {
  return (
    <div className="bg-[#0b141a] rounded-2xl overflow-hidden shadow-2xl w-full max-w-xs">
      {/* Header */}
      <div className="bg-[#1f2c34] px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">
          גנן
        </div>
        <div>
          <p className="text-white text-sm font-semibold">גן עדן — גננות מקצועית</p>
          <p className="text-green-400 text-xs">אוטומציות פעילות</p>
        </div>
      </div>
      {/* Background pattern */}
      <div className="p-3 space-y-2 min-h-[320px]" style={{ background: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E\") #0b141a" }}>
        {[...chatMessages].reverse().map((msg, i) => (
          <div key={i} className={`flex ${msg.from === "business" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] px-3 py-2 rounded-xl text-xs shadow ${
                msg.from === "business"
                  ? "bg-[#005c4b] text-white rounded-tr-none"
                  : "bg-[#202c33] text-gray-100 rounded-tl-none"
              }`}
            >
              <p className="leading-relaxed" dir="rtl">{msg.text}</p>
              <p className={`text-[10px] mt-1 text-right ${msg.from === "business" ? "text-green-300" : "text-gray-400"}`}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>
      {/* Input bar */}
      <div className="bg-[#1f2c34] px-3 py-2 flex items-center gap-2">
        <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-2 text-gray-400 text-xs text-right" dir="rtl">
          הודעה אוטומטית...
        </div>
        <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center">
          <MessageSquare size={14} className="text-white" />
        </div>
      </div>
    </div>
  );
}

function AutomationBuilderCard() {
  const [trigger, setTrigger] = useState(triggerOptions[0]);
  const [action, setAction] = useState(actionOptions[0]);
  const [delay, setDelay] = useState(delayOptions[0]);
  const [previewMsg, setPreviewMsg] = useState("שלום {שם}, הביקור שלנו מחר ב-{שעה}. יש שינוי? ✅");

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6" dir="rtl">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
          <Zap size={16} className="text-violet-600" />
        </div>
        <h3 className="font-semibold text-gray-800 text-lg">בונה אוטומציות</h3>
        <span className="mr-auto text-xs bg-violet-100 text-violet-600 px-2 py-1 rounded-full font-medium">IF → THEN</span>
      </div>

      <div className="space-y-4">
        {/* Trigger */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <BellRing size={14} className="text-blue-600" />
            </div>
            <div className="w-0.5 h-8 bg-gray-200 my-1"></div>
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1 font-medium">טריגר (IF)</p>
            <div className="relative">
              <select
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {triggerOptions.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Delay */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock size={14} className="text-amber-600" />
            </div>
            <div className="w-0.5 h-8 bg-gray-200 my-1"></div>
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1 font-medium">המתנה</p>
            <div className="relative">
              <select
                value={delay}
                onChange={(e) => setDelay(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-amber-300"
              >
                {delayOptions.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Zap size={14} className="text-green-600" />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1 font-medium">פעולה (THEN)</p>
            <div className="relative">
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-green-300"
              >
                {actionOptions.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Message preview */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 mb-2 font-medium">תצוגה מקדימה של ההודעה</p>
          <div className="bg-[#005c4b] text-white text-sm rounded-xl rounded-tr-none px-3 py-2 inline-block max-w-full">
            <p dir="rtl" className="leading-relaxed">{previewMsg}</p>
          </div>
          <textarea
            value={previewMsg}
            onChange={(e) => setPreviewMsg(e.target.value)}
            className="mt-3 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
            rows={2}
            dir="rtl"
            placeholder="ערוך את ההודעה..."
          />
        </div>

        <button className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white py-3 rounded-xl font-semibold text-sm hover:from-violet-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-200">
          <Plus size={16} />
          צור אוטומציה
        </button>
      </div>
    </div>
  );
}

function IntegrationCard({ icon, title, description, status, color }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: "connected" | "disconnected";
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:shadow-md transition-shadow" dir="rtl">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm">{title}</p>
        <p className="text-xs text-gray-500 truncate">{description}</p>
      </div>
      {status === "connected" ? (
        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium flex-shrink-0">מחובר</span>
      ) : (
        <button className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full font-medium hover:bg-gray-200 transition-colors flex-shrink-0">
          חיבור
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────

export default function AutomationsPage() {
  const [automations, setAutomations] = useState(initialWhatsappAutomations);
  const [activeTab, setActivetab] = useState<"whatsapp" | "builder">("whatsapp");
  const [selectedCard, setSelectedCard] = useState<string>("wa1");

  const toggleAutomation = (id: string) => {
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  const selected = automations.find((a) => a.id === selectedCard);
  const totalSent = automations.reduce((sum, a) => sum + a.timesTriggered, 0);

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <Header title="מרכז אוטומציות" subtitle="נהל את כל האוטומציות של העסק במקום אחד" />

      <div className="p-6 max-w-[1400px] mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">מרכז אוטומציות</h1>
            <p className="text-gray-500 text-sm mt-0.5">נהל את כל האוטומציות של העסק במקום אחד</p>
          </div>
          <button className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:from-green-600 hover:to-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-green-200">
            <Plus size={16} />
            אוטומציה חדשה +
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "הודעות החודש", value: "47", icon: <MessageSquare size={18} />, color: "text-green-600", bg: "bg-green-50" },
            { label: "אוטומציות פעילות", value: `${automations.filter((a) => a.enabled).length}`, icon: <Activity size={18} />, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "חסכת בזמן", value: "3.5 שעות", icon: <Clock size={18} />, color: "text-purple-600", bg: "bg-purple-50" },
            { label: "שיעור מענה", value: "94%", icon: <TrendingUp size={18} />, color: "text-amber-600", bg: "bg-amber-50" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActivetab("whatsapp")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "whatsapp"
                ? "bg-green-500 text-white shadow-lg shadow-green-200"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            <span className="flex items-center gap-2">
              <MessageSquare size={14} /> וואטסאפ
            </span>
          </button>
          <button
            onClick={() => setActivetab("builder")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "builder"
                ? "bg-violet-500 text-white shadow-lg shadow-violet-200"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            <span className="flex items-center gap-2">
              <Zap size={14} /> בונה אוטומציות
            </span>
          </button>
        </div>

        {activeTab === "whatsapp" && (
          <>
            {/* WhatsApp Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Left: Automation cards */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-[#25d366] flex items-center justify-center">
                    <MessageSquare size={16} className="text-white" />
                  </div>
                  <h2 className="font-bold text-gray-800">אוטומציות וואטסאפ</h2>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full mr-auto">
                    {automations.filter((a) => a.enabled).length} פעילות
                  </span>
                </div>

                {automations.map((auto) => (
                  <div
                    key={auto.id}
                    onClick={() => setSelectedCard(auto.id)}
                    className={`bg-white rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
                      selectedCard === auto.id ? "border-green-400 shadow-md" : "border-gray-100"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl ${auto.bgColor} border flex items-center justify-center flex-shrink-0 ${auto.color}`}>
                        {auto.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-800 text-sm">{auto.title}</span>
                          <span className="text-xs text-gray-400">—</span>
                          <span className="text-xs text-gray-500">{auto.trigger}</span>
                        </div>
                        <div className="bg-gray-50 rounded-lg px-3 py-2 mb-2 border border-gray-100">
                          <p className="text-xs text-gray-600 font-mono leading-relaxed">{auto.message}</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Repeat size={11} /> {auto.timesTriggered} פעמים
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={11} /> {auto.lastRun}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleAutomation(auto.id); }}
                        className="flex-shrink-0"
                      >
                        {auto.enabled ? (
                          <ToggleRight size={28} className="text-green-500" />
                        ) : (
                          <ToggleLeft size={28} className="text-gray-300" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right: WhatsApp preview */}
              <div className="flex flex-col items-center gap-4">
                <div className="w-full bg-white rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold text-gray-500 mb-3">תצוגה מקדימה — {selected?.title}</p>
                  <WhatsAppPreview />
                </div>
                {selected && (
                  <div className={`w-full rounded-xl border p-4 ${selected.bgColor}`} dir="rtl">
                    <p className={`text-xs font-semibold ${selected.color} mb-1`}>{selected.title}</p>
                    <p className="text-xs text-gray-600">{selected.description}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === "builder" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <AutomationBuilderCard />
            <div className="bg-white rounded-2xl border border-gray-200 p-6" dir="rtl">
              <h3 className="font-semibold text-gray-800 mb-4">טמפלטים מוכנים</h3>
              <div className="space-y-3">
                {[
                  { name: "מעקב חשבוניות", desc: "תזכורת תשלום אוטומטית", icon: <CreditCard size={16} />, color: "bg-amber-100 text-amber-600" },
                  { name: "תיאום ביקורים", desc: "אישור + תזכורת לפני ביקור", icon: <Calendar size={16} />, color: "bg-blue-100 text-blue-600" },
                  { name: "דוח שבועי", desc: "סיכום פעילות במייל", icon: <Mail size={16} />, color: "bg-purple-100 text-purple-600" },
                  { name: "ניווט אוטומטי", desc: "פתיחת ווייז לפני יציאה", icon: <Navigation size={16} />, color: "bg-green-100 text-green-600" },
                ].map((tmpl) => (
                  <div key={tmpl.name} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors border border-gray-100">
                    <div className={`w-8 h-8 rounded-lg ${tmpl.color} flex items-center justify-center`}>
                      {tmpl.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{tmpl.name}</p>
                      <p className="text-xs text-gray-400">{tmpl.desc}</p>
                    </div>
                    <ArrowRight size={14} className="mr-auto text-gray-300 rotate-180" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Active Automations Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-gray-600" />
              <h3 className="font-semibold text-gray-800">כל האוטומציות</h3>
            </div>
            <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
              שלחת {totalSent} הודעות אוטומטיות החודש
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir="rtl">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500">שם</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">טריגר</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">הפעלה אחרונה</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">סה"כ</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">סטטוס</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">פעולה</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeAutomations.map((auto) => (
                  <tr key={auto.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-800">{auto.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{auto.trigger}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{auto.lastRun}</td>
                    <td className="px-4 py-3">
                      <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {auto.timesTriggered}×
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {auto.status === "active" ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                          <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
                          פעיל
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
                          מושהה
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {auto.status === "active" ? (
                        <button className="text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1">
                          <Pause size={12} /> השהה
                        </button>
                      ) : (
                        <button className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1">
                          <Play size={12} /> הפעל
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Other Integrations */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2" dir="rtl">
            <Zap size={18} className="text-violet-500" />
            אינטגרציות נוספות
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <IntegrationCard
              icon={<Calendar size={18} className="text-blue-600" />}
              title="Google Calendar"
              description="סנכרון ביקורים ועבודות"
              status="connected"
              color="bg-blue-50"
            />
            <IntegrationCard
              icon={<Navigation size={18} className="text-teal-600" />}
              title="Waze"
              description="ניווט אוטומטי לעבודה"
              status="disconnected"
              color="bg-teal-50"
            />
            <IntegrationCard
              icon={<CreditCard size={18} className="text-purple-600" />}
              title="Bit"
              description="יצירת קישורי תשלום"
              status="connected"
              color="bg-purple-50"
            />
            <IntegrationCard
              icon={<Mail size={18} className="text-orange-600" />}
              title="דוחות מייל"
              description="דוח שבועי / חודשי"
              status="disconnected"
              color="bg-orange-50"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
