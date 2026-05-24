"use client";

// /customers/status — comprehensive cadence-status view for every
// active/VIP customer. The user opens it when they want to see "who's
// on track / who needs scheduling" without sifting through alerts.
//
// Each row is colour-coded:
//   🟢 green   — has enough future visits booked
//   🟡 yellow  — no booking yet but next expected visit is still distant
//   🔴 red     — needs scheduling now (overdue or within 3 days)
//   ⚪ gray    — missing data (no frequency or no last_visit)
//
// Filter chips let the user narrow down by colour. Tapping a row
// jumps to the customer's profile via /customers?focus=<id>.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2, RefreshCw, Sparkles } from "lucide-react";
import BackButton from "@/components/BackButton";
import { supabase } from "@/lib/supabase/client";
import {
  getCustomerStatusList,
  type CustomerStatusEntry,
  type CustomerStatusColor,
} from "@/lib/customer-alerts";

type Filter = "all" | CustomerStatusColor;

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const COLOR_META: Record<CustomerStatusColor, { dot: string; ring: string; label: string; description: string }> = {
  red:    { dot: "bg-red-500",     ring: "ring-red-200",     label: "צריך לשריין",   description: "באיחור או דחוף בימים הקרובים" },
  yellow: { dot: "bg-amber-400",   ring: "ring-amber-200",   label: "לעקוב",         description: "יש עוד זמן — אבל אין שריון" },
  green:  { dot: "bg-emerald-500", ring: "ring-emerald-200", label: "מסודר",         description: "יש ביקור עתידי מתוזמן" },
  gray:   { dot: "bg-gray-300",    ring: "ring-gray-200",    label: "חסר נתונים",    description: "אין תדירות / ביקור קודם" },
};

export default function CustomerStatusPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<CustomerStatusEntry[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) setLoading(false); return; }
      const [custRes, jobsRes] = await Promise.all([
        supabase
          .from("customers")
          .select("id, name, city, last_visit, frequency, status")
          .eq("user_id", user.id)
          .in("status", ["active", "vip"]),
        supabase
          .from("jobs")
          .select("id, customer_id, customer_name, job_date, status")
          .eq("user_id", user.id),
      ]);
      if (cancelled) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customers = (custRes.data ?? []).map((c: any) => ({
        id: String(c.id),
        name: c.name,
        city: c.city,
        last_visit: c.last_visit,
        frequency: c.frequency,
        status: c.status,
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jobs = (jobsRes.data ?? []).map((j: any) => ({
        id: String(j.id),
        customer_id: j.customer_id,
        customer_name: j.customer_name,
        job_date: j.job_date,
        status: j.status,
      }));
      const list = getCustomerStatusList(jobs, customers, todayISO());
      setEntries(list);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refreshTick]);

  // Counts per colour for the filter chips.
  const counts = useMemo(() => {
    const c: Record<CustomerStatusColor, number> = { red: 0, yellow: 0, gray: 0, green: 0 };
    for (const e of entries) c[e.colour] += 1;
    return c;
  }, [entries]);

  const filtered = useMemo(() => {
    let list = entries;
    if (filter !== "all") list = list.filter(e => e.colour === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        (e.city ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [entries, filter, search]);

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
              <Sparkles size={16} className="text-emerald-500" />
              מצב לקוחות קבועים
            </h1>
            <p className="text-[11px] text-gray-400">
              {loading ? "טוען…" : `${entries.length} לקוחות active / VIP`}
            </p>
          </div>
          <button
            onClick={() => setRefreshTick(t => t + 1)}
            aria-label="רענן"
            title="רענן מהשרת"
            className="hit-44 w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-3">
        {/* Filter chips — colour-coded, with counts. "הכל" first. */}
        <div className="flex flex-wrap gap-1.5">
          <ChipButton
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label={`הכל (${entries.length})`}
            dotClass="bg-gray-700"
          />
          {(["red", "yellow", "green", "gray"] as CustomerStatusColor[]).map(col => (
            <ChipButton
              key={col}
              active={filter === col}
              onClick={() => setFilter(col)}
              label={`${COLOR_META[col].label} (${counts[col]})`}
              dotClass={COLOR_META[col].dot}
            />
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חפש לפי שם / עיר…"
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
        />

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 flex flex-col items-center gap-2 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
            <p className="text-sm">טוען מצב לקוחות…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400">
            אין לקוחות בקטגוריה הזו.
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map(e => {
              const meta = COLOR_META[e.colour];
              return (
                <li key={e.id}>
                  <button
                    onClick={() => router.push(`/customers?focus=${e.id}`)}
                    className={`w-full bg-white border border-gray-100 rounded-2xl p-3.5 flex items-center gap-3 hover:border-gray-200 transition-colors text-right`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${meta.dot} flex-shrink-0 ring-4 ${meta.ring}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm truncate">{e.name}</p>
                        {e.status === "vip" && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">★ VIP</span>
                        )}
                        {e.frequency && (
                          <span className="text-[10px] text-gray-400">{e.frequency}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">{e.subtitle}</p>
                      {e.city && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{e.city}</p>
                      )}
                    </div>
                    <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

function ChipButton(props: {
  active: boolean;
  onClick: () => void;
  label: string;
  dotClass: string;
}) {
  return (
    <button
      onClick={props.onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
        props.active
          ? "bg-gray-900 text-white"
          : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${props.dotClass}`} />
      {props.label}
    </button>
  );
}
