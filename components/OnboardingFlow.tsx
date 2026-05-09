"use client";

// First-Run Experience — surfaces only the very first time a logged-in user
// lands on the dashboard with zero customers. Walks them through:
//   1. Welcome
//   2. Add first customer (inline form)
//   3. Schedule first job for that customer
//   4. Quick tour pointing at finance, quote, personal cash flow
//
// Once they finish or explicitly skip, we set localStorage["onboarding_done"]
// so they won't see it again on this device. The flag is keyed by user id so
// switching account on the same browser triggers a new onboarding.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, ArrowLeft, ArrowRight, Loader2, Check,
  UserPlus, CalendarPlus, FileText, DollarSign, PiggyBank,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "@/components/Toaster";

interface Props {
  userId: string;
  ownerName: string;
}

const STEPS = ["welcome", "customer", "job", "tour"] as const;
type StepKey = typeof STEPS[number];

function flagKey(userId: string) {
  return `onboarding_done_${userId}`;
}

export default function OnboardingFlow({ userId, ownerName }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<StepKey>("welcome");
  const [show, setShow] = useState(false);

  // Customer form state
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custCity, setCustCity] = useState("");
  const [custMonthly, setCustMonthly] = useState("");
  const [custId, setCustId] = useState<string | null>(null);
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Job form state
  const [jobDate, setJobDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [jobTime, setJobTime] = useState("09:00");
  const [jobPrice, setJobPrice] = useState("");
  const [savingJob, setSavingJob] = useState(false);

  // First mount — decide whether to show
  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(flagKey(userId));
    if (seen === "1") return;

    // Only show if the user has zero customers — don't hassle existing users
    // who just happen to have cleared localStorage.
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (cancelled) return;
      if (count === 0) setShow(true);
      else localStorage.setItem(flagKey(userId), "1");
    })();
    return () => { cancelled = true; };
  }, [userId]);

  function close() {
    localStorage.setItem(flagKey(userId), "1");
    setShow(false);
  }

  function nextStep() {
    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1]);
    else close();
  }

  function prevStep() {
    const i = STEPS.indexOf(step);
    if (i > 0) setStep(STEPS[i - 1]);
  }

  async function saveCustomer() {
    if (!custName.trim()) {
      toast.error("שם הלקוח חובה");
      return;
    }
    setSavingCustomer(true);
    const { data, error } = await supabase.from("customers").insert({
      user_id: userId,
      name: custName.trim(),
      phone: custPhone.trim() || null,
      city: custCity.trim() || null,
      monthly_price: custMonthly ? parseFloat(custMonthly) : 0,
      status: "active",
    }).select("id").single();
    setSavingCustomer(false);

    if (error || !data) {
      toast.error("לא הצלחנו לשמור את הלקוח", error?.message);
      return;
    }
    setCustId(data.id);
    if (custMonthly) setJobPrice(custMonthly);
    toast.success(`${custName} נוסף כלקוח ראשון 🌱`);
    nextStep();
  }

  async function saveJob() {
    if (!custId) {
      toast.error("בעיה פנימית — לא נמצא הלקוח");
      return;
    }
    setSavingJob(true);
    const { error } = await supabase.from("jobs").insert({
      user_id: userId,
      customer_id: custId,
      customer_name: custName.trim(),
      job_date: jobDate,
      job_time: jobTime,
      duration: 2,
      type: "ביקור גינה",
      status: "pending",
      priority: "medium",
      price: jobPrice ? parseFloat(jobPrice) : 0,
    });
    setSavingJob(false);

    if (error) {
      toast.error("לא הצלחנו לקבוע את העבודה", error.message);
      return;
    }
    toast.success("העבודה נקבעה ביומן");
    nextStep();
  }

  function finish() {
    close();
    toast.success(`כל הכבוד ${ownerName || ""} — אתה בדרך 🌱`);
    router.refresh();
  }

  if (!show) return null;

  const stepIndex = STEPS.indexOf(step);

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-[90] bg-black/50 flex items-end sm:items-center justify-center"
    >
      <div className="bg-white w-full sm:max-w-md sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92dvh]">
        {/* Header — progress + skip */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  i < stepIndex ? "w-6 bg-green-500"
                  : i === stepIndex ? "w-10 bg-green-600"
                  : "w-3 bg-gray-200"
                }`}
              />
            ))}
          </div>
          <button
            onClick={close}
            aria-label="דלג על האונבורדינג"
            className="hit-44 text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
          >
            דלג
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === "welcome"  && <WelcomeStep ownerName={ownerName} />}
          {step === "customer" && (
            <CustomerStep
              name={custName} setName={setCustName}
              phone={custPhone} setPhone={setCustPhone}
              city={custCity} setCity={setCustCity}
              monthly={custMonthly} setMonthly={setCustMonthly}
            />
          )}
          {step === "job" && (
            <JobStep
              customerName={custName}
              date={jobDate} setDate={setJobDate}
              time={jobTime} setTime={setJobTime}
              price={jobPrice} setPrice={setJobPrice}
            />
          )}
          {step === "tour" && <TourStep />}
        </div>

        {/* Footer — back / next */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {stepIndex > 0 && step !== "tour" && (
            <button
              onClick={prevStep}
              className="px-4 py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 min-h-[44px]"
            >
              <ArrowRight size={15} />
            </button>
          )}
          {step === "welcome" && (
            <button
              onClick={nextStep}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl py-3 text-sm min-h-[44px]"
            >
              בוא נתחיל
              <ArrowLeft size={15} />
            </button>
          )}
          {step === "customer" && (
            <button
              onClick={saveCustomer}
              disabled={savingCustomer}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold rounded-2xl py-3 text-sm min-h-[44px]"
            >
              {savingCustomer ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {savingCustomer ? "שומר..." : "המשך"}
            </button>
          )}
          {step === "job" && (
            <button
              onClick={saveJob}
              disabled={savingJob}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold rounded-2xl py-3 text-sm min-h-[44px]"
            >
              {savingJob ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {savingJob ? "שומר..." : "קבע ולסיים"}
            </button>
          )}
          {step === "tour" && (
            <button
              onClick={finish}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl py-3 text-sm min-h-[44px]"
            >
              סיימתי, יאלה
              <ArrowLeft size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Steps ───────────────────────────────────────────────────────────────────

function WelcomeStep({ ownerName }: { ownerName: string }) {
  const greeting = ownerName ? `שלום ${ownerName}` : "ברוך הבא";
  return (
    <div className="text-center py-4">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg mb-4">
        <Sparkles size={28} className="text-white" />
      </div>
      <h2 id="onboarding-title" className="text-xl font-bold text-gray-900 mb-2">
        {greeting} 🌱
      </h2>
      <p className="text-sm text-gray-500 leading-relaxed mb-6">
        בוא נבנה ביחד את התשתית הראשונה שלך.<br />
        <strong className="text-gray-800">90 שניות בלבד</strong> ויש לך:
      </p>
      <ul className="space-y-2 text-right max-w-xs mx-auto">
        <Bullet>✅ לקוח ראשון מוגדר</Bullet>
        <Bullet>📅 ביקור ראשון ביומן</Bullet>
        <Bullet>💰 מערכת פיננסים מוכנה</Bullet>
      </ul>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-sm text-gray-700 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
      {children}
    </li>
  );
}

function CustomerStep({
  name, setName, phone, setPhone, city, setCity, monthly, setMonthly,
}: {
  name: string; setName: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  city: string; setCity: (v: string) => void;
  monthly: string; setMonthly: (v: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <UserPlus size={18} className="text-green-600" />
        <h2 className="text-base font-bold text-gray-900">הלקוח הראשון שלך</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4">חשוב כי זה גם איש הקשר הראשון לעדכונים אוטומטיים</p>

      <div className="space-y-3">
        <Field label="שם הלקוח *">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="משפחת כהן"
            autoFocus
            autoComplete="name"
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </Field>
        <Field label="טלפון">
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="054-1234567"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="עיר">
            <input
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="רעננה"
              autoComplete="address-level2"
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </Field>
          <Field label="מחיר חודשי (₪)">
            <input
              value={monthly}
              onChange={e => setMonthly(e.target.value)}
              placeholder="450"
              type="number"
              inputMode="decimal"
              autoComplete="off"
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

function JobStep({
  customerName, date, setDate, time, setTime, price, setPrice,
}: {
  customerName: string;
  date: string; setDate: (v: string) => void;
  time: string; setTime: (v: string) => void;
  price: string; setPrice: (v: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <CalendarPlus size={18} className="text-green-600" />
        <h2 className="text-base font-bold text-gray-900">קבע ביקור ראשון</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        מתי אתה רואה את <strong className="text-gray-800">{customerName}</strong> בפעם הבאה?
      </p>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Field label="תאריך">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              dir="ltr"
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </Field>
          <Field label="שעה">
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              dir="ltr"
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </Field>
        </div>
        <Field label="מחיר (₪)">
          <input
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="450"
            type="number"
            inputMode="decimal"
            autoComplete="off"
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </Field>
      </div>
    </div>
  );
}

function TourStep() {
  const items = [
    { icon: <DollarSign size={18} className="text-green-600" />,    title: "פיננסים",        desc: "כל החשבוניות, הוצאות, ומע\"מ במקום אחד" },
    { icon: <FileText size={18} className="text-purple-600" />,     title: "הצעת מחיר",      desc: "בנה ושלח ב-WhatsApp תוך 30 שניות" },
    { icon: <PiggyBank size={18} className="text-blue-600" />,      title: "תזרים אישי",     desc: "כמה באמת נשאר לך בסוף החודש" },
  ];
  return (
    <div>
      <div className="text-center mb-5">
        <div className="text-3xl mb-2">🎉</div>
        <h2 className="text-base font-bold text-gray-900 mb-1">מצוין! יש לך את הליבה</h2>
        <p className="text-xs text-gray-500">3 כלים נוספים שכדאי לך להכיר:</p>
      </div>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm">{it.icon}</div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{it.title}</p>
              <p className="text-xs text-gray-500">{it.desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-600 mb-1">{label}</span>
      {children}
    </label>
  );
}
