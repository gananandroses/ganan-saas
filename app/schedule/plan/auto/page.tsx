"use client";

// /schedule/plan/auto — month-ahead automatic planner.
//
// Three-step flow:
//   1) Setup — confirm parameters (range, daily target, working days).
//      If any customers don't have lat/lng yet, this page geocodes them
//      one-by-one (~1 sec each due to Nominatim rate limit) with a
//      progress bar. Results are cached on customers.lat/lng.
//   2) Preview — show the generated draft: days with their jobs, each
//      job with customer, time, price. User can DELETE jobs they don't
//      want before approving.
//   3) Approve — bulk-insert the remaining jobs into the `jobs` table.
//
// The page is a DRAFT — nothing reaches the schedule until the user
// taps "אשר וצור". This is the user's safety net.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Loader2, CheckCircle2, MapPin, Sparkles, AlertCircle, Trash2, ChevronRight } from "lucide-react";
import BackButton from "@/components/BackButton";
import { supabase } from "@/lib/supabase/client";
import { toast } from "@/components/Toaster";
import { geocodeAddress, sleep, type LatLng } from "@/lib/geocoding";
import {
  planMonth,
  type PlannerCustomer,
  type ExistingFutureJob,
  type PlanResult,
  type PlannedJob,
} from "@/lib/route-planner";

// Default parameters — the user can tweak before generating.
const DEFAULT_DAYS_AHEAD = 30;
const DEFAULT_DAILY_TARGET_BEFORE_VAT = 2500;
const DEFAULT_WORK_DAYS = [0, 1, 2, 3, 4];     // Sun-Thu
const DEFAULT_START_HOUR = 9;
const DEFAULT_DURATION_HOURS = 1.5;

const WEEKDAY_LABELS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${WEEKDAY_LABELS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

function fmtMoney(n: number): string {
  return `₪${Math.round(n).toLocaleString("he-IL")}`;
}

type Phase = "setup" | "geocoding" | "preview" | "saving" | "done";

export default function AutoPlanPage() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("setup");
  const [daysAhead, setDaysAhead] = useState(DEFAULT_DAYS_AHEAD);
  const [dailyTarget, setDailyTarget] = useState(DEFAULT_DAILY_TARGET_BEFORE_VAT);
  const [workDays, setWorkDays] = useState<number[]>(DEFAULT_WORK_DAYS);

  // Optional starting point — defaults to first customer's coord if blank.
  const [homeAddress, setHomeAddress] = useState("");

  // Geocoding progress
  const [geoProgress, setGeoProgress] = useState({ done: 0, total: 0, currentName: "" });

  // Plan state
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [removedJobKeys, setRemovedJobKeys] = useState<Set<string>>(new Set());
  const [savedCount, setSavedCount] = useState(0);

  function toggleWorkDay(d: number) {
    setWorkDays(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort()
    );
  }

  async function generatePlan() {
    setPhase("geocoding");
    setPlan(null);
    setRemovedJobKeys(new Set());

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("לא מחובר");
      setPhase("setup");
      return;
    }

    // Load customers + future jobs in parallel.
    const [custRes, jobsRes] = await Promise.all([
      supabase
        .from("customers")
        .select("id, name, city, address, status, monthly_price, price_mode, frequency, last_visit, lat, lng")
        .eq("user_id", user.id)
        .in("status", ["active", "vip"]),
      supabase
        .from("jobs")
        .select("customer_id, customer_name, job_date, status")
        .eq("user_id", user.id)
        .gte("job_date", todayISO())
        .neq("status", "cancelled")
        .neq("status", "completed"),
    ]);

    if (custRes.error) {
      // Most likely: lat/lng columns don't exist yet. Tell the user
      // how to fix it, then bail.
      if (/lat|lng|column/i.test(custRes.error.message)) {
        toast.error("חסרים עמודות lat/lng בטבלת customers — הרץ את המיגרציה (ראה lib/supabase/add-customer-geo-migration.sql)");
      } else {
        toast.error(`שגיאה: ${custRes.error.message}`);
      }
      setPhase("setup");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawCusts = (custRes.data ?? []) as any[];

    // Geocode any customer without lat/lng. Throttle to 1 req/sec
    // (Nominatim's policy). Cache results back to the DB.
    const toGeocode = rawCusts.filter(c => (c.lat == null || c.lng == null) && (c.address || c.city));
    setGeoProgress({ done: 0, total: toGeocode.length, currentName: "" });

    for (let i = 0; i < toGeocode.length; i++) {
      const c = toGeocode[i];
      setGeoProgress({ done: i, total: toGeocode.length, currentName: c.name });
      const query = [c.address, c.city, "ישראל"].filter(Boolean).join(", ");
      const coord = await geocodeAddress(query);
      if (coord) {
        c.lat = coord.lat;
        c.lng = coord.lng;
        await supabase
          .from("customers")
          .update({ lat: coord.lat, lng: coord.lng })
          .eq("id", c.id)
          .eq("user_id", user.id);
      }
      // Nominatim policy: ≤1 req/sec. We wait between calls, not after
      // the last one.
      if (i < toGeocode.length - 1) await sleep(1100);
    }
    setGeoProgress({ done: toGeocode.length, total: toGeocode.length, currentName: "" });

    // Compute effective last_visit per customer from completed jobs.
    const { data: allJobsForLast } = await supabase
      .from("jobs")
      .select("customer_id, customer_name, job_date, status")
      .eq("user_id", user.id)
      .eq("status", "completed");
    const norm = (s: string | null | undefined) =>
      (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    const lastById = new Map<string, string>();
    const lastByName = new Map<string, string>();
    for (const j of allJobsForLast ?? []) {
      if (!j.job_date) continue;
      if (j.customer_id) {
        const cur = lastById.get(String(j.customer_id));
        if (!cur || j.job_date > cur) lastById.set(String(j.customer_id), j.job_date);
      }
      const n = norm(j.customer_name);
      if (n) {
        const cur = lastByName.get(n);
        if (!cur || j.job_date > cur) lastByName.set(n, j.job_date);
      }
    }

    const customers: PlannerCustomer[] = rawCusts.map(c => ({
      id: String(c.id),
      name: c.name ?? "",
      city: c.city,
      address: c.address,
      monthlyPrice: Number(c.monthly_price) || 0,
      priceMode: c.price_mode === "per_visit" ? "per_visit" : "monthly",
      frequency: c.frequency,
      status: c.status,
      lastVisit:
        lastById.get(String(c.id)) ??
        lastByName.get(norm(c.name)) ??
        c.last_visit ??
        null,
      lat: c.lat == null ? null : Number(c.lat),
      lng: c.lng == null ? null : Number(c.lng),
    }));

    const existingFutureJobs: ExistingFutureJob[] = (jobsRes.data ?? []).map(j => ({
      customerId: j.customer_id ?? null,
      customerName: j.customer_name ?? "",
      jobDate: j.job_date ?? "",
    }));

    // Optional home base — geocode the user's typed address if present.
    let homeBase: LatLng | null = null;
    if (homeAddress.trim()) {
      homeBase = await geocodeAddress(homeAddress.trim() + ", ישראל");
    }

    const result = planMonth({
      customers,
      existingFutureJobs,
      today: todayISO(),
      daysAhead,
      dailyTargetBeforeVat: dailyTarget,
      workDays,
      startHour: DEFAULT_START_HOUR,
      defaultDurationHours: DEFAULT_DURATION_HOURS,
      homeBase,
    });

    setPlan(result);
    setPhase("preview");
  }

  function jobKey(j: PlannedJob): string {
    return `${j.date}|${j.customerId}|${j.time}`;
  }

  function removeJob(j: PlannedJob) {
    setRemovedJobKeys(prev => {
      const next = new Set(prev);
      next.add(jobKey(j));
      return next;
    });
  }

  const visibleDays = useMemo(() => {
    if (!plan) return [];
    return plan.days
      .map(d => {
        const jobs = d.jobs.filter(j => !removedJobKeys.has(jobKey(j)));
        const total = jobs.reduce((s, j) => s + j.price, 0);
        return { ...d, jobs, totalPrice: total };
      })
      .filter(d => d.jobs.length > 0);
  }, [plan, removedJobKeys]);

  const summary = useMemo(() => {
    let jobs = 0;
    let revenue = 0;
    for (const d of visibleDays) {
      jobs += d.jobs.length;
      revenue += d.totalPrice;
    }
    return { jobs, revenue, days: visibleDays.length };
  }, [visibleDays]);

  async function approveAndSave() {
    setPhase("saving");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("לא מחובר");
      setPhase("preview");
      return;
    }
    const rows: Record<string, unknown>[] = [];
    for (const d of visibleDays) {
      for (const j of d.jobs) {
        rows.push({
          user_id: user.id,
          customer_id: j.customerId,
          customer_name: j.customerName,
          address: j.address,
          job_date: j.date,
          job_time: j.time,
          duration: j.durationHours,
          type: "תחזוקת גינה",
          status: "scheduled",
          priority: "medium",
          price: j.price,
          price_before_vat: true,
          expenses: 0,
          job_category: "work",
        });
      }
    }
    if (rows.length === 0) {
      toast.error("אין עבודות לשמירה");
      setPhase("preview");
      return;
    }
    const { error } = await supabase.from("jobs").insert(rows);
    if (error) {
      toast.error(`שגיאה בשמירה: ${error.message}`);
      setPhase("preview");
      return;
    }
    setSavedCount(rows.length);
    setPhase("done");
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-lg font-bold text-gray-900">תכנון אוטומטי לחודש</h1>
            <p className="text-xs text-gray-500">טיוטה — שום דבר לא ייכנס ליומן עד שתאשר</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {phase === "setup" && (
          <SetupView
            daysAhead={daysAhead}
            setDaysAhead={setDaysAhead}
            dailyTarget={dailyTarget}
            setDailyTarget={setDailyTarget}
            workDays={workDays}
            toggleWorkDay={toggleWorkDay}
            homeAddress={homeAddress}
            setHomeAddress={setHomeAddress}
            onGenerate={generatePlan}
          />
        )}

        {phase === "geocoding" && (
          <GeocodingView progress={geoProgress} />
        )}

        {phase === "preview" && plan && (
          <PreviewView
            visibleDays={visibleDays}
            unplaceable={plan.unplaceable}
            summary={summary}
            onRemove={removeJob}
            onBack={() => setPhase("setup")}
            onApprove={approveAndSave}
          />
        )}

        {phase === "saving" && (
          <div className="bg-white border border-gray-100 rounded-2xl p-10 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            <p className="text-sm font-medium text-gray-700">שומר עבודות ליומן…</p>
          </div>
        )}

        {phase === "done" && (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <h2 className="text-xl font-bold text-gray-900">נוצרו {savedCount} עבודות</h2>
            <p className="text-sm text-gray-500">הן כעת ביומן שלך כעבודות מתוזמנות.</p>
            <button
              onClick={() => router.push("/schedule")}
              className="mt-3 px-5 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl transition-colors"
            >
              עבור ליומן
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Subviews ────────────────────────────────────────────────────────────────

function SetupView(props: {
  daysAhead: number;
  setDaysAhead: (n: number) => void;
  dailyTarget: number;
  setDailyTarget: (n: number) => void;
  workDays: number[];
  toggleWorkDay: (d: number) => void;
  homeAddress: string;
  setHomeAddress: (s: string) => void;
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-emerald-900 leading-relaxed">
          המערכת תבנה לך לוח זמנים אופטימלי לחודש הקרוב. לקוחות עם תדירות
          יקבלו את התאריכים שלהם, ולקוחות שלא משוריינים ישובצו לפי
          מסלול גיאוגרפי חכם עד שכל יום יגיע ליעד.
        </div>
      </div>

      <Card title="פרמטרים">
        <Row label="טווח ימים">
          <input
            type="number"
            min={7}
            max={60}
            value={props.daysAhead}
            onChange={e => props.setDaysAhead(Math.max(7, Math.min(60, Number(e.target.value) || 0)))}
            className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center"
          />
          <span className="text-xs text-gray-400">ימים מהיום</span>
        </Row>
        <Row label="יעד יומי לפני מע״מ">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={100}
              value={props.dailyTarget}
              onChange={e => props.setDailyTarget(Math.max(0, Number(e.target.value) || 0))}
              className="w-32 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center"
            />
            <span className="text-xs text-gray-400">₪</span>
          </div>
        </Row>
        <Row label="ימי עבודה">
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAY_LABELS.map((label, idx) => {
              const on = props.workDays.includes(idx);
              return (
                <button
                  key={idx}
                  onClick={() => props.toggleWorkDay(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    on ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </Row>
        <Row label="כתובת התחלה (אופציונלי)">
          <input
            type="text"
            value={props.homeAddress}
            onChange={e => props.setHomeAddress(e.target.value)}
            placeholder="הבית/המחסן שלך — לאופטימיזציה של המסלול"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
          />
        </Row>
      </Card>

      <button
        onClick={props.onGenerate}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
      >
        <Sparkles className="w-5 h-5" /> בנה תוכנית
      </button>

      <p className="text-[11px] text-gray-400 text-center">
        בפעם הראשונה תתבצע איתור-מיקום (geocoding) לכל לקוחות שאין להם קואורדינטות.
        זה לוקח ~שנייה לכל לקוח. התוצאות נשמרות לפעם הבאה.
      </p>
    </div>
  );

  // Local Row helper — keeps the form rows aligned without a CSS grid.
  function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div className="flex items-center justify-between gap-3 py-2.5">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex items-center gap-2 flex-shrink-0">{children}</div>
      </div>
    );
  }

  function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        </div>
        <div className="px-4 divide-y divide-gray-50">{children}</div>
      </div>
    );
  }
}

function GeocodingView({ progress }: { progress: { done: number; total: number; currentName: string } }) {
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 100;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 flex flex-col items-center gap-4">
      <MapPin className="w-10 h-10 text-blue-500" />
      <div className="text-center">
        <p className="text-sm font-bold text-gray-900">מאתר מיקומים</p>
        <p className="text-xs text-gray-500 mt-1">
          {progress.total > 0
            ? `${progress.done}/${progress.total} — ${progress.currentName || "מסיים..."}`
            : "מכין נתונים…"}
        </p>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-gray-400 text-center">
        זה ייקח רגע — שניה לכל לקוח. הפעם הבאה תהיה מיידית.
      </p>
    </div>
  );
}

function PreviewView(props: {
  visibleDays: { date: string; jobs: PlannedJob[]; totalPrice: number }[];
  unplaceable: PlanResult["unplaceable"];
  summary: { jobs: number; revenue: number; days: number };
  onRemove: (j: PlannedJob) => void;
  onBack: () => void;
  onApprove: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">סיכום התוכנית</p>
          <p className="text-base font-bold text-gray-900">
            {props.summary.jobs} עבודות · {props.summary.days} ימים · {fmtMoney(props.summary.revenue)}
          </p>
        </div>
        <Calendar className="w-7 h-7 text-gray-300" />
      </div>

      {props.unplaceable.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <p className="font-bold mb-1">{props.unplaceable.length} לקוחות לא שובצו</p>
            <p className="text-amber-800">
              {props.unplaceable.slice(0, 5).map(u => u.name).join(", ")}
              {props.unplaceable.length > 5 && ` ועוד ${props.unplaceable.length - 5}`}
            </p>
            <p className="mt-1 text-amber-700">הם עברו את היעד היומי / אין מקום בטווח. אפשר להגדיל טווח או יעד.</p>
          </div>
        </div>
      )}

      {/* Days */}
      {props.visibleDays.map(day => (
        <div key={day.date} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900">{dateLabel(day.date)}</p>
              <p className="text-[11px] text-gray-400">
                {day.jobs.length} עבודות · {fmtMoney(day.totalPrice)} לפני מע״מ
              </p>
            </div>
          </div>
          <ul className="divide-y divide-gray-50">
            {day.jobs.map(j => (
              <li key={`${j.date}-${j.customerId}-${j.time}`} className="px-4 py-3 flex items-center gap-3">
                <div className="text-xs font-bold text-gray-700 tabular-nums min-w-[44px]">{j.time}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{j.customerName}</p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {j.city || j.address || "—"} · {fmtMoney(j.price)}
                    {j.source === "recurring" && " · קבוע"}
                  </p>
                </div>
                <button
                  onClick={() => props.onRemove(j)}
                  aria-label="הסר"
                  className="hit-44 w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {props.visibleDays.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-sm text-gray-400">
          אין עבודות לשבץ בטווח שביקשת.
        </div>
      )}

      {/* Sticky bottom action bar */}
      <div
        className="sticky bottom-0 -mx-4 px-4 py-3 bg-white/95 backdrop-blur border-t border-gray-200 flex gap-2"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={props.onBack}
          className="flex-1 px-4 py-3 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          חזור
        </button>
        <button
          onClick={props.onApprove}
          disabled={props.summary.jobs === 0}
          className="flex-[2] px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-2xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" /> אשר וצור {props.summary.jobs} עבודות
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
