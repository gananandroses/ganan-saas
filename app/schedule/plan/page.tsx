"use client";

// /schedule/plan — visit-planning screen.
//
// Surfaces every active/VIP customer who's "due" for their next visit
// based on customer.frequency + most-recent completed job date, then
// groups them by city so the gardener can pick ONE date for a whole
// city and bulk-create the jobs. This is the differentiator: most
// gardener tools require you to schedule each visit one at a time.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, MapPin, Calendar, ChevronRight, CheckCircle2,
  Sparkles, Search, AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "@/components/Toaster";

// ── Cadence helpers ──────────────────────────────────────────────────────────

function daysPerFrequency(freq: string | null | undefined): number {
  if (freq === "פעם בשבוע")       return 7;
  if (freq === "פעמיים בשבוע")    return 3.5;
  if (freq === "פעמיים בחודש")    return 15;
  if (freq === "פעם בחודש")       return 30;
  if (freq === "פעם בחודשיים")    return 60;
  if (freq === "פעם ב-3 חודשים") return 90;
  return 30;
}

function visitsPerMonth(freq: string | null | undefined): number {
  if (freq === "פעם בשבוע")       return 4;
  if (freq === "פעמיים בשבוע")    return 8;
  if (freq === "פעמיים בחודש")    return 2;
  if (freq === "פעם בחודש")       return 1;
  if (freq === "פעם בחודשיים")    return 0.5;
  if (freq === "פעם ב-3 חודשים") return 1 / 3;
  return 1;
}

// Per-visit price — same math as /customers.pricePerVisit so jobs created
// here carry the value that matches the rest of the app.
function pricePerVisit(price: number, freq: string | null | undefined, mode: "monthly" | "per_visit"): number {
  if (mode === "per_visit") return price;
  const visits = visitsPerMonth(freq);
  return visits > 0 ? Math.round(price / visits) : price;
}

function fmtMoney(n: number) {
  return `₪${Math.round(n).toLocaleString("he-IL")}`;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayISO() { return isoDate(new Date()); }

// Israeli weekend = Friday (5) and Saturday (6). The gardener doesn't work
// those days, so suggested dates roll forward to Sunday whenever they
// land on one of them.
function isWeekend(iso: string): boolean {
  const day = new Date(iso + "T00:00:00").getDay();
  return day === 5 || day === 6;
}

function rollPastWeekend(iso: string): string {
  let d = new Date(iso + "T00:00:00");
  while (d.getDay() === 5 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return isoDate(d);
}

function dateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}/${m}/${y}`;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(b + "T00:00:00").getTime();
  return Math.floor((db - da) / (1000 * 60 * 60 * 24));
}

// ── Types ──

interface CustomerRow {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  status: string;
  monthly_price: number;
  price_mode: "monthly" | "per_visit";
  frequency: string;
  last_visit_db: string | null;   // customers.last_visit (often stale)
}

interface JobRow {
  customer_id: string | null;
  customer_name: string;
  job_date: string;
  status: string;
}

interface DueCustomer extends CustomerRow {
  effectiveLastVisit: string | null;   // max(completed job_date) or fallback to last_visit_db
  suggestedDate: string;
  daysOverdue: number;                 // negative = early, positive = overdue
  visitPrice: number;
  hasFutureJob: boolean;               // true if a non-cancelled future job already exists
}

interface CityGroup {
  city: string;
  customers: DueCustomer[];
  totalPrice: number;
  earliestSuggested: string;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function PlanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<CityGroup[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  // Per-city date + time. Keyed by normalised city name.
  const [groupDate, setGroupDate] = useState<Record<string, string>>({});
  const [groupTime, setGroupTime] = useState<Record<string, string>>({});
  // Per-city saving spinner.
  const [savingCity, setSavingCity] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) { setLoading(false); return; }

      const [custRes, jobsRes] = await Promise.all([
        supabase.from("customers")
          .select("id, name, city, address, phone, status, monthly_price, price_mode, frequency, last_visit")
          .eq("user_id", user.id)
          .in("status", ["active", "vip", "new"]),
        supabase.from("jobs")
          .select("customer_id, customer_name, job_date, status")
          .eq("user_id", user.id),
      ]);

      const customers = (custRes.data ?? []) as Array<{
        id: string;
        name: string;
        city: string | null;
        address: string | null;
        phone: string | null;
        status: string | null;
        monthly_price: number | null;
        price_mode: string | null;
        frequency: string | null;
        last_visit: string | null;
      }>;
      const jobs = (jobsRes.data ?? []) as JobRow[];

      // Build "true last_visit" per customer from completed jobs.
      const normName = (s: string | null | undefined) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
      const lastByCustomerId = new Map<string, string>();
      const lastByName = new Map<string, string>();
      const hasFutureById = new Map<string, boolean>();
      const hasFutureByName = new Map<string, boolean>();
      const today = todayISO();
      for (const j of jobs) {
        if (j.status === "completed" && j.job_date) {
          if (j.customer_id) {
            const cur = lastByCustomerId.get(String(j.customer_id));
            if (!cur || j.job_date > cur) lastByCustomerId.set(String(j.customer_id), j.job_date);
          }
          const n = normName(j.customer_name);
          if (n) {
            const cur = lastByName.get(n);
            if (!cur || j.job_date > cur) lastByName.set(n, j.job_date);
          }
        }
        if (j.status !== "completed" && j.status !== "cancelled" && j.job_date >= today) {
          if (j.customer_id) hasFutureById.set(String(j.customer_id), true);
          const n = normName(j.customer_name);
          if (n) hasFutureByName.set(n, true);
        }
      }

      const todayDate = new Date(today + "T00:00:00");
      const due: DueCustomer[] = customers.map(c => {
        const fromJobs = lastByCustomerId.get(c.id) ?? lastByName.get(normName(c.name)) ?? null;
        const fromDb = c.last_visit ?? null;
        // Prefer the freshest available date.
        const effectiveLastVisit = fromJobs && fromDb ? (fromJobs > fromDb ? fromJobs : fromDb) : (fromJobs ?? fromDb);
        const cadence = daysPerFrequency(c.frequency);
        let suggested: Date;
        if (effectiveLastVisit) {
          suggested = new Date(effectiveLastVisit + "T00:00:00");
          suggested.setDate(suggested.getDate() + cadence);
        } else {
          // First-time customer — schedule for tomorrow as a sensible default.
          suggested = new Date(todayDate);
          suggested.setDate(suggested.getDate() + 1);
        }
        // Israeli weekend (Fri/Sat) — gardener doesn't work, roll forward.
        const suggestedDate = rollPastWeekend(isoDate(suggested));
        const daysOverdue = daysBetween(suggestedDate, today); // positive → overdue, negative → early
        const monthly = Number(c.monthly_price ?? 0);
        const mode: "monthly" | "per_visit" = c.price_mode === "per_visit" ? "per_visit" : "monthly";
        const hasFuture =
          (hasFutureById.get(c.id) ?? false) ||
          (hasFutureByName.get(normName(c.name)) ?? false);
        return {
          id: c.id,
          name: c.name ?? "",
          city: (c.city ?? "").trim() || "ללא עיר",
          address: c.address ?? "",
          phone: c.phone ?? "",
          status: c.status ?? "active",
          monthly_price: monthly,
          price_mode: mode,
          frequency: c.frequency ?? "פעם בחודש",
          last_visit_db: c.last_visit ?? null,
          effectiveLastVisit,
          suggestedDate,
          daysOverdue,
          visitPrice: pricePerVisit(monthly, c.frequency, mode),
          hasFutureJob: hasFuture,
        };
      })
      // Show every active/VIP/new customer. Customers already on the
      // calendar are flagged (hasFutureJob) and default-unselected; the
      // gardener decides whether to add a second booking. Sort: most
      // overdue → due soon → already-booked → freshly visited.
      .sort((a, b) => {
        if (a.hasFutureJob !== b.hasFutureJob) return a.hasFutureJob ? 1 : -1;
        return b.daysOverdue - a.daysOverdue;
      });

      // Group by city, sort cities by urgency (max overdue first).
      const byCity = new Map<string, DueCustomer[]>();
      for (const c of due) {
        const k = c.city;
        if (!byCity.has(k)) byCity.set(k, []);
        byCity.get(k)!.push(c);
      }
      const cityGroups: CityGroup[] = Array.from(byCity.entries())
        .map(([city, customersInCity]) => ({
          city,
          customers: customersInCity,
          totalPrice: customersInCity.reduce((s, c) => s + c.visitPrice, 0),
          earliestSuggested: customersInCity.reduce((min, c) => (c.suggestedDate < min ? c.suggestedDate : min), customersInCity[0].suggestedDate),
        }))
        .sort((a, b) => {
          // Cities with overdue customers first.
          const aOverdue = a.customers.some(c => c.daysOverdue > 0);
          const bOverdue = b.customers.some(c => c.daysOverdue > 0);
          if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
          // Then by count descending.
          return b.customers.length - a.customers.length;
        });

      // Pre-select every due customer, default the group date to MIN
      // (earliest) suggested date, default time to 09:00.
      const initialSelected: Record<string, boolean> = {};
      const initialDate: Record<string, string> = {};
      const initialTime: Record<string, string> = {};
      for (const g of cityGroups) {
        const base = g.earliestSuggested < today ? today : g.earliestSuggested;
        initialDate[g.city] = rollPastWeekend(base);
        initialTime[g.city] = "09:00";
        for (const c of g.customers) {
          // Default-select customers who NEED a visit (no future job yet).
          // Customers already on the calendar start unchecked — the gardener
          // can tick them on explicitly to add a second booking.
          initialSelected[c.id] = !c.hasFutureJob;
        }
      }
      setGroups(cityGroups);
      setSelectedIds(initialSelected);
      setGroupDate(initialDate);
      setGroupTime(initialTime);
      setLoading(false);
    })();
  }, []);

  function toggleSelect(id: string) {
    setSelectedIds(prev => ({ ...prev, [id]: !prev[id] }));
  }

  // Bulk-insert: every selected customer in this city gets a pending job
  // at the chosen date + time + per-visit price.
  async function createForCity(group: CityGroup) {
    const date = groupDate[group.city];
    const time = groupTime[group.city] || "09:00";
    if (!date) { toast.error("בחר תאריך"); return; }
    if (isWeekend(date)) {
      toast.error("יום שישי / שבת לא זמין", "בחר יום חול");
      return;
    }
    const ids = group.customers.filter(c => selectedIds[c.id]).map(c => c.id);
    if (ids.length === 0) { toast.error("בחר לפחות לקוח אחד"); return; }
    setSavingCity(group.city);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) { setSavingCity(null); toast.error("לא מחובר"); return; }

    const rows = group.customers
      .filter(c => selectedIds[c.id])
      .map(c => ({
        user_id: user.id,
        customer_id: c.id,
        customer_name: c.name,
        address: [c.address, c.city].filter(Boolean).join(", ") || null,
        job_date: date,
        job_time: time,
        duration: 1.5,
        type: "תחזוקת גינה",
        priority: "medium",
        price: c.visitPrice,
        price_before_vat: false,
        status: "pending",
        assigned_to: [],
      }));
    const { error } = await supabase.from("jobs").insert(rows);
    setSavingCity(null);
    if (error) { toast.error("שגיאה ביצירת עבודות", error.message); return; }
    toast.success(`${rows.length} עבודות נקבעו ל-${dateLabel(date)}`, `עיר ${group.city}`);

    // Drop the city out of the planning view — its work is done.
    setGroups(prev => prev.filter(g => g.city !== group.city));
  }

  // Filtered groups by search.
  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map(g => ({
        ...g,
        customers: g.customers.filter(c => c.name.toLowerCase().includes(q) || g.city.toLowerCase().includes(q)),
      }))
      .filter(g => g.customers.length > 0);
  }, [groups, search]);

  const totalCustomers = groups.reduce((s, g) => s + g.customers.length, 0);
  const totalRevenue = groups.reduce((s, g) => s + g.totalPrice, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]" dir="rtl">
        <Loader2 size={28} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#F7F8FA] pb-24">
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => router.push("/schedule")}
              aria-label="חזרה ליומן"
              className="hit-44 w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <ChevronRight size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-500" />
                תכנון ביקורים
              </h1>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {totalCustomers > 0
                  ? `${totalCustomers} לקוחות · ${groups.length} ${groups.length === 1 ? "עיר" : "ערים"} · בחר וקבע בקליק אחד`
                  : "אין לקוחות פעילים"}
              </p>
            </div>
          </div>
          {totalCustomers > 0 && (
            <span className="text-sm font-bold text-gray-700 tabular-nums flex-shrink-0">
              {fmtMoney(totalRevenue)}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-4 space-y-4">

        {/* Search */}
        {groups.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-3">
            <div className="relative">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="חיפוש לקוח או עיר..."
                autoComplete="off"
                inputMode="search"
                className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2 pr-9 text-sm focus:outline-none focus:bg-white focus:border-gray-200 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Empty state */}
        {groups.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-3xl p-10 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 size={24} className="text-emerald-500" />
            </div>
            <h2 className="text-base font-bold text-gray-900">הכל מתוכנן</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              אין לקוחות שמחכים לתיאום הבא. כל מי שצריך — כבר ביומן.
            </p>
            <button
              onClick={() => router.push("/schedule")}
              className="mt-4 inline-flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
            >
              חזרה ליומן <ChevronRight size={13} />
            </button>
          </div>
        )}

        {/* City groups */}
        {filteredGroups.map(g => {
          const selectedCount = g.customers.filter(c => selectedIds[c.id]).length;
          const selectedRevenue = g.customers
            .filter(c => selectedIds[c.id])
            .reduce((s, c) => s + c.visitPrice, 0);
          const hasOverdue = g.customers.some(c => c.daysOverdue > 0);

          return (
            <section key={g.city} className="bg-white border border-gray-100 rounded-3xl overflow-hidden">
              <div className="px-5 sm:px-6 pt-5 pb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    hasOverdue ? "bg-amber-50" : "bg-gray-50"
                  }`}>
                    <MapPin size={16} className={hasOverdue ? "text-amber-600" : "text-gray-500"} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-gray-900">{g.city}</h2>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {g.customers.length} {g.customers.length === 1 ? "לקוח" : "לקוחות"} · {fmtMoney(g.totalPrice)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer list */}
              <div className="px-3 sm:px-4 pb-2">
                {g.customers.map(c => {
                  const checked = !!selectedIds[c.id];
                  const overdue = c.daysOverdue > 0;
                  const isNewCustomer = !c.effectiveLastVisit;
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleSelect(c.id)}
                      className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl transition-colors text-right ${
                        c.hasFutureJob ? "opacity-70 hover:bg-gray-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                        checked ? "bg-emerald-500" : "bg-white border border-gray-300"
                      }`}>
                        {checked && <CheckCircle2 size={14} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`text-sm font-semibold truncate ${
                            checked ? "text-gray-900" : "text-gray-500"
                          }`}>
                            {c.name}
                          </p>
                          {/* Status badges — one of: כבר משובץ / מאחר X ימים / חדש */}
                          {c.hasFutureJob && (
                            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                              ✓ כבר משובץ
                            </span>
                          )}
                          {!c.hasFutureJob && overdue && (
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-full whitespace-nowrap tabular-nums">
                              {c.daysOverdue} ימי איחור
                            </span>
                          )}
                          {!c.hasFutureJob && isNewCustomer && (
                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                              חדש
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                          {c.effectiveLastVisit
                            ? `אחרון ${dateLabel(c.effectiveLastVisit)}`
                            : "טרם בוקר"}
                          {" · "}{c.frequency}
                          {!overdue && !c.hasFutureJob && c.daysOverdue < 0 && (
                            <span className="mr-1">· מומלץ ב-{dateLabel(c.suggestedDate)}</span>
                          )}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-gray-700 tabular-nums flex-shrink-0">
                        {fmtMoney(c.visitPrice)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Date/time + CTA — sticky footer per group */}
              <div className="px-5 sm:px-6 py-3 bg-gray-50 border-t border-gray-100 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">תאריך</label>
                    <input
                      type="date"
                      dir="ltr"
                      value={groupDate[g.city] ?? ""}
                      onChange={e => setGroupDate(prev => ({ ...prev, [g.city]: e.target.value }))}
                      className={`w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 transition-colors ${
                        groupDate[g.city] && isWeekend(groupDate[g.city])
                          ? "bg-red-50 border-red-200 text-red-700 focus:ring-red-200"
                          : "bg-white border-gray-200 focus:ring-gray-300"
                      }`}
                    />
                    {groupDate[g.city] && isWeekend(groupDate[g.city]) && (
                      <p className="text-[10px] text-red-600 mt-1">יום שישי/שבת — בחר יום חול</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">שעה</label>
                    <input
                      type="time"
                      dir="ltr"
                      value={groupTime[g.city] ?? "09:00"}
                      onChange={e => setGroupTime(prev => ({ ...prev, [g.city]: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
                    />
                  </div>
                </div>
                <button
                  onClick={() => createForCity(g)}
                  disabled={selectedCount === 0 || savingCity === g.city}
                  className="w-full flex items-center justify-between gap-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
                >
                  <span className="flex items-center gap-2">
                    {savingCity === g.city
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Calendar size={14} />}
                    קבע {selectedCount} {selectedCount === 1 ? "ביקור" : "ביקורים"}
                  </span>
                  <span className="text-sm tabular-nums opacity-90">{fmtMoney(selectedRevenue)}</span>
                </button>
              </div>
            </section>
          );
        })}

        {/* No results for search */}
        {groups.length > 0 && filteredGroups.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center">
            <AlertCircle size={20} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">לא נמצאו תוצאות לחיפוש</p>
          </div>
        )}

        {/* Footer hint */}
        {groups.length > 0 && (
          <p className="text-[11px] text-gray-400 text-center px-6 leading-relaxed">
            הקבוצות מסודרות לפי דחיפות. תאריך ברירת מחדל = הביקור המוקדם ביותר בעיר.
            תוכל לערוך תאריך פר־לקוח אחרי שתקבע ב־<button onClick={() => router.push("/schedule")} className="underline">/schedule</button>.
          </p>
        )}
      </main>
    </div>
  );
}
