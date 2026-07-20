"use client";
import { Bell, Search, Plus, X, AlertCircle, Package, CheckCircle, Calendar, Users, FileText, Loader2, MessageSquare } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase/client";
import { pendingMissedVisits } from "@/lib/missed-visits";
import { getUnbookedCustomers, getInactiveCustomers } from "@/lib/customer-alerts";
import BackButton from "@/components/BackButton";
import { getDirection, type Locale } from "@/lib/locale";

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
  showBack?: boolean;
}

// Category groups the bell dropdown into collapsible sections — one
// per kind of attention the user owes. Order matters: most actionable
// first (payments → scheduling), housekeeping last (inventory).
type NotifCategory = "payment" | "scheduling" | "missed" | "inactive" | "inventory";

interface Notif {
  id: string;
  text: string;
  type: "red" | "yellow" | "green" | "orange";
  category: NotifCategory;
  href?: string;
  // When set, clicking the notif opens an inline payment-confirm modal
  // instead of navigating. txIds is an array because debts get
  // aggregated per customer — confirming pays off ALL of that
  // customer's outstanding balances at once.
  payment?: { txIds: string[]; customerName: string; amount: number };
  // When set, dismissing this notif writes through to the DB so it
  // never comes back on refresh. Used by the "דרוש תיאום מחדש"
  // (missed-visit) category: clicking X marks the underlying cancelled
  // job as resolved instead of just hiding it locally.
  missed?: { jobId: string };
  // Enriched metadata for scheduling-category notifs so the bell can
  // render them with sub-grouping (דחוף / השבוע / רחוקים), a city,
  // a cadence chip, and a WhatsApp shortcut.
  scheduling?: {
    customerId: string;
    daysOverdue: number;     // 9999 means "no last_visit known"
    futureCount: number;
    city: string | null;
    phone: string | null;
    frequency: string | null;
    nextExpectedISO: string | null;
  };
}

// Label keys resolve to header.categoryPayment / categoryScheduling / etc.
const CATEGORY_META: Record<NotifCategory, { labelKey: string; emoji: string }> = {
  payment:    { labelKey: "categoryPayment",    emoji: "💰" },
  scheduling: { labelKey: "categoryScheduling", emoji: "📅" },
  missed:     { labelKey: "categoryMissed",     emoji: "🔥" },
  inactive:   { labelKey: "categoryInactive",   emoji: "🌙" },
  inventory:  { labelKey: "categoryInventory",  emoji: "📦" },
};

const CATEGORY_ORDER: NotifCategory[] = ["payment", "scheduling", "missed", "inactive", "inventory"];

// Search result types ─ a single dropdown shows three buckets
interface SearchResultCustomer { kind: "customer"; id: string; name: string; phone: string | null; city: string | null }
interface SearchResultQuote    { kind: "quote";    id: string; title: string; customer_name: string; quote_number: string | null }
interface SearchResultJob      { kind: "job";      id: string; customer_name: string; type: string | null; job_date: string }
type SearchResult = SearchResultCustomer | SearchResultQuote | SearchResultJob;

export default function Header({ title, subtitle, action, showBack = false }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("header");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const dir = getDirection(locale);
  const [showNotif, setShowNotif] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [notifTick, setNotifTick] = useState(0);

  // Pending payment-confirm modal — set when the user taps a debt
  // notification; cleared on close or after marking as paid. Holds
  // an ARRAY of tx ids because debts are aggregated per customer
  // (3 unpaid invoices → 1 notif → marks all 3 paid in one go).
  const [paymentConfirm, setPaymentConfirm] = useState<
    { txIds: string[]; customerName: string; amount: number } | null
  >(null);
  const [savingPayment, setSavingPayment] = useState(false);

  // Pending confirm for permanently dismissing a missed-visit notif.
  // Holds the notif's id + display text so the modal can name it. Unlike
  // other categories (local-only X), this dismissal writes to the DB, so
  // we gate it behind a "are you sure?" prompt.
  const [missedConfirm, setMissedConfirm] = useState<{ id: string; text: string } | null>(null);

  async function markPaid(txIds: string[]) {
    if (txIds.length === 0) return;
    setSavingPayment(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Same bug-class as finance's markAsPaid — without the error
      // check, a rejected update silently emptied the bell of debt
      // notifs while the rows stayed pending in the DB. The user
      // then refreshed and watched the same debts come back, with
      // no idea what had failed.
      const { error } = await supabase
        .from("transactions")
        .update({ status: "paid" })
        .in("id", txIds)
        .eq("user_id", user.id);
      if (error) {
        // Bell has no toast here, so the closest we can do is leave
        // the notif in place + the modal open. The user will see
        // their click had no effect and try again.
        return;
      }
      const idSet = new Set(txIds);
      setNotifs((prev) =>
        prev.filter((n) => {
          const ids = n.payment?.txIds;
          if (!ids) return true;
          // Drop the notif if every one of its txIds was just paid.
          return !ids.every((x) => idSet.has(x));
        }),
      );
      setPaymentConfirm(null);
    } finally {
      setSavingPayment(false);
    }
  }

  // ── Global search ─────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!searchBoxRef.current) return;
      if (!searchBoxRef.current.contains(e.target as Node)) setShowResults(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Debounced search — runs 220ms after the user stops typing.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      // Sync results back to empty when the query becomes too short.
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSearching(false); return; }
      const like = `%${q}%`;

      // Three lookups in parallel — kept tight (limit 5 each) so the dropdown
      // never feels heavy. ilike is case-insensitive across Hebrew text.
      const [custRes, quoteRes, jobRes] = await Promise.all([
        supabase.from("customers")
          .select("id, name, phone, city")
          .eq("user_id", user.id)
          .or(`name.ilike.${like},phone.ilike.${like},city.ilike.${like}`)
          .limit(5),
        supabase.from("quotes")
          .select("id, title, customer_name, quote_number")
          .eq("user_id", user.id)
          .or(`title.ilike.${like},customer_name.ilike.${like},quote_number.ilike.${like}`)
          .limit(5),
        supabase.from("jobs")
          .select("id, customer_name, type, job_date")
          .eq("user_id", user.id)
          .or(`customer_name.ilike.${like},type.ilike.${like}`)
          .order("job_date", { ascending: false })
          .limit(5),
      ]);

      if (cancelled) return;
      const next: SearchResult[] = [
        ...(custRes.data ?? []).map(r => ({ kind: "customer" as const, id: String(r.id), name: r.name ?? "", phone: r.phone, city: r.city })),
        ...(quoteRes.data ?? []).map(r => ({ kind: "quote" as const, id: String(r.id), title: r.title ?? "", customer_name: r.customer_name ?? "", quote_number: r.quote_number })),
        ...(jobRes.data ?? []).map(r => ({ kind: "job" as const, id: String(r.id), customer_name: r.customer_name ?? "", type: r.type, job_date: r.job_date })),
      ];
      setResults(next);
      setSearching(false);
    }, 220);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  function pickResult(r: SearchResult) {
    setShowResults(false);
    setQuery("");
    if (r.kind === "customer")  router.push(`/customers?focus=${r.id}`);
    else if (r.kind === "quote") router.push(`/quote/${r.id}`);
    else                          router.push(`/schedule?focus=${r.id}`);
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const list: Notif[] = [];

      // 🔥 ביקורים שדורשים תיאום מחדש — single source of truth in
      // lib/missed-visits.ts. Auto-clears once the customer is rebooked.
      const { data: allJobs } = await supabase
        .from("jobs")
        .select("id, customer_id, customer_name, job_date, status, cancellation_reason")
        .eq("user_id", user.id)
        .order("job_date", { ascending: false });

      pendingMissedVisits(allJobs || []).forEach((j) => {
        const reasonLabel = j.cancellation_reason === "no_show" ? t("noShow") : t("forceMajeure");
        list.push({
          id: `missed-${j.id}`,
          text: t("missedVisitText", { name: j.customer_name, reason: reasonLabel, date: j.job_date ?? "" }),
          type: "orange",
          category: "missed",
          // No href — the row's X persists the dismissal (below). The
          // old "/automations" target is gone, and there's nothing to
          // navigate to: the action is "I handled this, stop nagging".
          missed: { jobId: String(j.id) },
        });
      });

      // חובות פתוחים — aggregate per customer so two debts for the
      // same person collapse into a single notif with the combined
      // total. Without this, a customer with 3 unpaid invoices clogs
      // the dropdown with 3 near-identical rows.
      const { data: pending } = await supabase
        .from("transactions")
        .select("id, customer_id, customer_name, amount")
        .eq("user_id", user.id)
        .eq("type", "income")
        .in("status", ["pending", "overdue"]);

      const debtGroups = new Map<string, { ids: string[]; customerName: string; total: number }>();
      for (const t of pending ?? []) {
        const key = t.customer_id
          ? `id:${t.customer_id}`
          : `name:${(t.customer_name ?? "").trim().toLowerCase().replace(/\s+/g, " ")}`;
        const existing = debtGroups.get(key);
        if (existing) {
          existing.ids.push(t.id);
          existing.total += Number(t.amount) || 0;
        } else {
          debtGroups.set(key, {
            ids: [t.id],
            customerName: t.customer_name,
            total: Number(t.amount) || 0,
          });
        }
      }
      for (const g of debtGroups.values()) {
        const suffix = g.ids.length > 1 ? t("debtSuffix", { count: g.ids.length }) : "";
        list.push({
          id: `tx-${g.ids.join(",")}`,
          text: t("debtText", { name: g.customerName, amount: g.total.toLocaleString(), suffix }),
          type: "red",
          category: "payment",
          payment: {
            txIds: g.ids,
            customerName: g.customerName,
            amount: g.total,
          },
        });
      }

      // לקוחות שצריך לשריין + לקוחות לא פעילים — both depend on the
      // customers table. Fetch once, run both calculators. We include
      // city + phone so the scheduling sub-grouped renderer can show
      // them inline + drive the per-row WhatsApp shortcut.
      const { data: custs } = await supabase
        .from("customers")
        .select("id, name, city, phone, last_visit, frequency, status")
        .eq("user_id", user.id);

      const today = new Date().toISOString().slice(0, 10);
      const allJobsTyped = (allJobs || []).map((j) => ({
        id: String(j.id),
        customer_id: j.customer_id,
        customer_name: j.customer_name,
        job_date: j.job_date,
        status: j.status,
      }));
      const allCusts = (custs || []).map((c) => ({
        id: String(c.id),
        name: c.name,
        city: c.city,
        phone: c.phone,
        last_visit: c.last_visit,
        frequency: c.frequency,
        status: c.status,
      }));

      getUnbookedCustomers(allJobsTyped, allCusts, today).forEach((u) => {
        list.push({
          id: `unbooked-${u.id}`,
          text: u.name,                  // sub-grouped renderer reads from scheduling.* below
          type: "orange",
          category: "scheduling",
          href: "/schedule/plan",
          scheduling: {
            customerId: u.id,
            daysOverdue: u.daysOverdue,
            futureCount: u.futureCount,
            city: u.city ?? null,
            phone: u.phone ?? null,
            frequency: u.frequency ?? null,
            nextExpectedISO: u.nextExpectedISO ?? null,
          },
        });
      });

      getInactiveCustomers(allCusts).forEach((c) => {
        list.push({
          id: `inactive-${c.id}`,
          text: t("quietDays", { name: c.name, days: c.daysSinceVisit }),
          type: "yellow",
          category: "inactive",
          href: `/customers?focus=${c.id}`,
        });
      });

      // מלאי נמוך
      const { data: inv } = await supabase
        .from("inventory")
        .select("name, quantity, min_stock")
        .eq("user_id", user.id);

      (inv || [])
        .filter((i) => Number(i.quantity) < Number(i.min_stock))
        .forEach((i) => {
          list.push({
            id: `inv-${i.name}`,
            text: t("unitsSuffix", { name: i.name, quantity: i.quantity }),
            type: "yellow",
            category: "inventory",
            href: "/inventory",
          });
        });

      setNotifs(list);
    }
    load();
    // Re-fetch whenever the route changes OR the tab regains focus. The
    // bell used to only load once (empty dep array) — so completing a job
    // on /schedule didn't refresh the Header still mounted on the layout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, notifTick]);

  // Window focus / visibility-change → trigger a refresh tick.
  useEffect(() => {
    function bump() { setNotifTick(t => t + 1); }
    function onVis() { if (document.visibilityState === "visible") bump(); }
    window.addEventListener("focus", bump);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", bump);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const dismiss = (id: string) => {
    // Find the notif first — some categories need to persist the
    // dismissal, not just hide it. Missed-visit rows reappear on every
    // refresh as long as the underlying cancelled job still carries a
    // "no_show"/"force_majeure" reason (see lib/missed-visits.ts). So
    // dismissing one rewrites that reason to a sentinel the matcher
    // ignores ("resolved") — the user's X means "I handled this".
    const target = notifs.find((n) => n.id === id);
    setNotifs((prev) => prev.filter((n) => n.id !== id));
    if (target?.missed) {
      const jobId = target.missed.jobId;
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { error } = await supabase
          .from("jobs")
          .update({ cancellation_reason: "resolved" })
          .eq("id", jobId)
          .eq("user_id", user.id);
        // On failure, re-fetch so the notif comes back rather than
        // silently staying hidden while the DB is unchanged — the same
        // silent-swallow bug class we fixed for payments.
        if (error) setNotifTick((t) => t + 1);
      })();
    }
  };
  // X-button entry point. Missed-visit dismissals are permanent (they
  // write to the DB), so route those through a confirm modal first.
  // Every other category is local-only and dismisses immediately.
  const requestDismiss = (n: Notif) => {
    if (n.missed) {
      setMissedConfirm({ id: n.id, text: n.text });
      return;
    }
    dismiss(n.id);
  };
  const dismissAll = () => setNotifs([]);

  const colorMap = {
    red: "bg-red-100 text-red-700",
    yellow: "bg-yellow-100 text-yellow-700",
    green: "bg-green-100 text-green-700",
    orange: "bg-orange-100 text-orange-700",
  };

  const iconMap = {
    red: <AlertCircle size={13} />,
    yellow: <Package size={13} />,
    green: <CheckCircle size={13} />,
    orange: <Calendar size={13} />,
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 gap-4 sticky top-0 z-30">
      {showBack && <BackButton />}
      {/* Title */}
      <div className="flex-1">
        <h2 className="text-lg font-bold text-gray-900 leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>

      {/* Search — fixed-width container so the dropdown doesn't stretch
          across the page when the parent has no width of its own. The
          inner field and the dropdown both live inside this w-72 wrapper
          so they line up exactly. */}
      <div ref={searchBoxRef} className="hidden md:block relative w-72">
        <div className={`flex items-center gap-2 bg-gray-50 border rounded-xl px-3 py-2 transition-colors ${
          showResults ? "border-green-400 bg-white" : "border-gray-200 hover:border-gray-300"
        }`}>
          <Search size={15} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            autoComplete="off"
            inputMode="search"
            placeholder={t("searchPlaceholder")}
            value={query}
            onChange={e => { setQuery(e.target.value); setShowResults(true); }}
            onFocus={() => { if (query.trim().length >= 2) setShowResults(true); }}
            className="bg-transparent text-sm text-gray-700 outline-none w-full placeholder:text-gray-400"
            dir={dir}
          />
          {searching && <Loader2 size={12} className="animate-spin text-gray-400 flex-shrink-0" />}
          {query && !searching && (
            <button
              onClick={() => { setQuery(""); setResults([]); }}
              aria-label={t("searchClear")}
              className="hit-44 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Results dropdown — z-50 so it sits above any sticky bars; bg-white
            with a solid shadow so nothing bleeds through; results grouped
            by type with a tiny header label between groups. */}
        {showResults && query.trim().length >= 2 && (
          <div className="absolute top-full mt-1.5 start-0 end-0 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[420px] overflow-y-auto" dir={dir}>
            {searching && results.length === 0 && (
              <div className="px-4 py-5 text-center text-xs text-gray-400">{t("searching")}</div>
            )}
            {!searching && results.length === 0 && (
              <div className="px-4 py-5 text-center text-xs text-gray-400">{t("noResults", { query })}</div>
            )}
            {results.length > 0 && (
              <ul className="py-1">
                {(["customer", "quote", "job"] as const).map(kind => {
                  const items = results.filter(r => r.kind === kind);
                  if (items.length === 0) return null;
                  const sectionLabel = kind === "customer" ? t("sectionCustomers") : kind === "quote" ? t("sectionQuotes") : t("sectionJobs");
                  return (
                    <li key={kind}>
                      <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {sectionLabel}
                      </p>
                      <ul>
                        {items.map(r => (
                          <li key={`${r.kind}-${r.id}`}>
                            <button
                              onClick={() => pickResult(r)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors text-start"
                            >
                              <span className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                                r.kind === "customer" ? "bg-blue-50 text-blue-600"
                                : r.kind === "quote"  ? "bg-purple-50 text-purple-600"
                                :                        "bg-green-50 text-green-600"
                              }`}>
                                {r.kind === "customer" ? <Users size={12} />
                                  : r.kind === "quote" ? <FileText size={12} />
                                  :                       <Calendar size={12} />}
                              </span>
                              <div className="flex-1 min-w-0">
                                {r.kind === "customer" && (
                                  <>
                                    <p className="text-[13px] font-semibold text-gray-900 truncate leading-tight">{r.name}</p>
                                    {(r.city || r.phone) && (
                                      <p className="text-[11px] text-gray-500 truncate leading-tight mt-0.5">
                                        {[r.city, r.phone].filter(Boolean).join(" · ")}
                                      </p>
                                    )}
                                  </>
                                )}
                                {r.kind === "quote" && (
                                  <>
                                    <p className="text-[13px] font-semibold text-gray-900 truncate leading-tight">
                                      {r.title || t("untitledQuote")}
                                      {r.quote_number && <span className="text-gray-400 text-[11px] mx-1">#{r.quote_number}</span>}
                                    </p>
                                    {r.customer_name && (
                                      <p className="text-[11px] text-gray-500 truncate leading-tight mt-0.5">{r.customer_name}</p>
                                    )}
                                  </>
                                )}
                                {r.kind === "job" && (
                                  <>
                                    <p className="text-[13px] font-semibold text-gray-900 truncate leading-tight">{r.customer_name}</p>
                                    <p className="text-[11px] text-gray-500 truncate leading-tight mt-0.5">
                                      {r.type ?? t("untitledJob")} · {r.job_date}
                                    </p>
                                  </>
                                )}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => setShowNotif(!showNotif)}
          aria-label={t("notificationsAria")}
          className="relative p-2 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <Bell size={20} className="text-gray-500" />
          {notifs.length > 0 && (
            <span className="absolute top-1.5 end-1.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
              {notifs.length}
            </span>
          )}
        </button>

        {showNotif && (() => {
          // Group notifs by category for the section-headed dropdown.
          // Order is fixed (CATEGORY_ORDER) — most actionable first.
          const grouped = new Map<NotifCategory, Notif[]>();
          for (const n of notifs) {
            const arr = grouped.get(n.category) ?? [];
            arr.push(n);
            grouped.set(n.category, arr);
          }
          // For the payment category, also compute the total amount so
          // it can be shown next to the count in the header.
          const paymentTotal = (grouped.get("payment") ?? [])
            .reduce((s, n) => s + (n.payment?.amount ?? 0), 0);

          return (
          <div className="absolute top-12 start-0 w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50" dir={dir}>
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h3 className="font-bold text-gray-800 text-sm">{t("notificationsAria")} {notifs.length > 0 && `(${notifs.length})`}</h3>
              {notifs.length > 0 && (
                <button onClick={dismissAll} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                  {t("clearAll")}
                </button>
              )}
            </div>

            <div className="px-3 pb-3 max-h-96 overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="py-6 text-center text-gray-400 text-sm">
                  <CheckCircle size={22} className="mx-auto mb-1.5 text-green-400" />
                  {t("noNotifications")}
                </div>
              ) : (
                CATEGORY_ORDER.map((cat) => {
                  const items = grouped.get(cat) ?? [];
                  if (items.length === 0) return null;
                  const meta = CATEGORY_META[cat];
                  const countLabel = cat === "payment" && paymentTotal > 0
                    ? `${items.length} · ₪${Math.round(paymentTotal).toLocaleString()}`
                    : String(items.length);
                  // Scheduling category gets its own renderer — sub-grouped
                  // by urgency tier, with city/cadence/date inline and a
                  // WhatsApp shortcut per row. Other categories use the
                  // simple list below.
                  if (cat === "scheduling") {
                    return (
                      <SchedulingSection
                        key={cat}
                        items={items}
                        countLabel={countLabel}
                        onItemClick={(href) => { setShowNotif(false); router.push(href); }}
                        onDismiss={dismiss}
                        t={t}
                      />
                    );
                  }
                  return (
                    <div key={cat} className="mt-3 first:mt-1">
                      <div className="flex items-center justify-between px-1 pb-1.5">
                        <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                          <span className="text-sm leading-none">{meta.emoji}</span>
                          {t(meta.labelKey)}
                        </p>
                        <span className="text-[11px] font-semibold text-gray-400 tabular-nums">{countLabel}</span>
                      </div>
                      <div className="space-y-1.5">
                        {items.map((n) => {
                          const isClickable = !!n.href || !!n.payment;
                          return (
                            <div
                              key={n.id}
                              onClick={() => {
                                if (n.payment) {
                                  setShowNotif(false);
                                  setPaymentConfirm(n.payment);
                                  return;
                                }
                                if (n.href) {
                                  setShowNotif(false);
                                  router.push(n.href);
                                }
                              }}
                              className={`flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2 ${isClickable ? "cursor-pointer hover:bg-gray-100" : ""} transition-colors`}
                            >
                              <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5 ${colorMap[n.type]}`}>
                                {iconMap[n.type]}
                              </span>
                              <p className="text-sm text-gray-700 flex-1 leading-snug">{n.text}</p>
                              <button
                                onClick={(e) => { e.stopPropagation(); requestDismiss(n); }}
                                aria-label={t("dismissAria")}
                                className="text-gray-300 hover:text-gray-500 flex-shrink-0 mt-0.5 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          );
        })()}
      </div>

      {/* Action button */}
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-sm"
        >
          <Plus size={16} />
          <span>{action.label}</span>
        </button>
      )}

      {/* Payment-confirm modal — opens when the user taps a debt
          notification. Two clear actions: mark as paid (writes
          status="paid" to the transaction + drops the notif) or
          dismiss (just closes). Backdrop click = dismiss. */}
      {paymentConfirm && (
        <div
          className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4"
          onClick={() => !savingPayment && setPaymentConfirm(null)}
          dir={dir}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-gray-900 mb-1.5">{t("paymentConfirmTitle")}</h3>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              {t("paymentConfirmBody", { name: paymentConfirm.customerName, amount: paymentConfirm.amount.toLocaleString() })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => markPaid(paymentConfirm.txIds)}
                disabled={savingPayment}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {savingPayment && <Loader2 size={14} className="animate-spin" />}
                {t("yesPaid")}
              </button>
              <button
                onClick={() => setPaymentConfirm(null)}
                disabled={savingPayment}
                className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-60 text-gray-700 text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                {t("notYetPaid")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Missed-visit dismiss confirm — this removal is permanent (it
          writes to the DB), so we ask before doing it. "כן, הסר" runs
          the real dismiss(); backdrop / "ביטול" just closes. */}
      {missedConfirm && (
        <div
          className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4"
          onClick={() => setMissedConfirm(null)}
          dir={dir}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-gray-900 mb-1.5">{t("missedConfirmTitle")}</h3>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              <strong className="text-gray-900">{missedConfirm.text}</strong>
              <br />
              {t("missedConfirmBody")}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { dismiss(missedConfirm.id); setMissedConfirm(null); }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                {t("confirmRemove")}
              </button>
              <button
                onClick={() => setMissedConfirm(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                {tc("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

// ── SchedulingSection ───────────────────────────────────────────────────────
// Bell-dropdown sub-grouped renderer for the "לקוחות לשריין" category.
// Splits the rows into three urgency tiers (red / amber / gray) with
// section sub-headers, sorts each tier by days-to-next-visit, and
// auto-collapses the "רחוקים" tier if it has more than 2 rows.
// Each row shows: cadence chip, city, the actual expected date, and
// a WhatsApp quick-action that opens chat pre-filled with a "let's
// schedule next visit" message.

interface UnbookedRowMeta {
  customerId: string;
  daysOverdue: number;
  futureCount: number;
  city: string | null;
  phone: string | null;
  frequency: string | null;
  nextExpectedISO: string | null;
}

type SchedulingTier = "urgent" | "thisWeek" | "distant";

function classifyScheduling(s: UnbookedRowMeta): SchedulingTier {
  // daysOverdue: positive = already overdue, negative = future visit.
  // Urgent = overdue OR no last_visit at all (9999) OR due within 3 days.
  if (s.daysOverdue >= -3 || s.daysOverdue === 9999) return "urgent";
  // This-week = 4..14 days out.
  if (s.daysOverdue >= -14) return "thisWeek";
  return "distant";
}

// labelKey resolves via header.tierUrgent / tierThisWeek / tierDistant
const TIER_META: Record<SchedulingTier, { labelKey: string; emoji: string; bg: string; text: string; border: string }> = {
  urgent:   { labelKey: "tierUrgent",   emoji: "🔴", bg: "bg-red-50",     text: "text-red-700",     border: "border-red-100" },
  thisWeek: { labelKey: "tierThisWeek", emoji: "⚠️", bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-100" },
  distant:  { labelKey: "tierDistant",  emoji: "📆", bg: "bg-gray-50",    text: "text-gray-600",    border: "border-gray-100" },
};

function fmtDayMonth(iso: string | null): string {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${Number(d)}/${Number(m)}`;
}

function normalisePhoneIL(raw: string | null | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  if (digits.length === 9) return "972" + digits;
  return digits;
}

function SchedulingSection(props: {
  items: Notif[];
  countLabel: string;
  onItemClick: (href: string) => void;
  onDismiss: (id: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const { t } = props;
  const [distantExpanded, setDistantExpanded] = useState(false);

  // Bucket by tier. Tiers iterate in fixed urgency order.
  const buckets: Record<SchedulingTier, Notif[]> = { urgent: [], thisWeek: [], distant: [] };
  for (const n of props.items) {
    if (!n.scheduling) continue;
    const tier = classifyScheduling(n.scheduling);
    buckets[tier].push(n);
  }
  // Within each tier sort by daysOverdue descending (most urgent first).
  for (const tier of Object.keys(buckets) as SchedulingTier[]) {
    buckets[tier].sort((a, b) => (b.scheduling?.daysOverdue ?? 0) - (a.scheduling?.daysOverdue ?? 0));
  }

  return (
    <div className="mt-3 first:mt-1">
      <div className="flex items-center justify-between px-1 pb-1.5">
        <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
          <span className="text-sm leading-none">📅</span>
          {t("categoryScheduling")}
        </p>
        <span className="text-[11px] font-semibold text-gray-400 tabular-nums">{props.countLabel}</span>
      </div>

      {(["urgent", "thisWeek", "distant"] as SchedulingTier[]).map((tier) => {
        const tierItems = buckets[tier];
        if (tierItems.length === 0) return null;
        const meta = TIER_META[tier];
        const visible = tier === "distant" && !distantExpanded ? tierItems.slice(0, 2) : tierItems;
        const hiddenCount = tier === "distant" && !distantExpanded ? Math.max(0, tierItems.length - 2) : 0;
        return (
          <div key={tier} className="mb-2 last:mb-0">
            <div className={`flex items-center justify-between px-2 py-1 rounded-md ${meta.bg} ${meta.text} mb-1`}>
              <p className="text-[10px] font-bold flex items-center gap-1">
                <span>{meta.emoji}</span>
                {t(meta.labelKey)}
              </p>
              <span className="text-[10px] font-bold tabular-nums opacity-80">{tierItems.length}</span>
            </div>
            <div className="space-y-1">
              {visible.map((n) => (
                <SchedulingRow
                  key={n.id}
                  notif={n}
                  onClick={() => n.href && props.onItemClick(n.href)}
                  onDismiss={() => props.onDismiss(n.id)}
                  t={t}
                />
              ))}
              {hiddenCount > 0 && (
                <button
                  onClick={() => setDistantExpanded(true)}
                  className="w-full text-[11px] text-gray-500 hover:text-gray-700 py-1 rounded hover:bg-gray-50 transition-colors"
                >
                  {t("showMore", { count: hiddenCount })}
                </button>
              )}
              {tier === "distant" && distantExpanded && tierItems.length > 2 && (
                <button
                  onClick={() => setDistantExpanded(false)}
                  className="w-full text-[11px] text-gray-400 hover:text-gray-600 py-1 rounded hover:bg-gray-50 transition-colors"
                >
                  {t("collapse")}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SchedulingRow(props: {
  notif: Notif;
  onClick: () => void;
  onDismiss: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const { t } = props;
  const s = props.notif.scheduling;
  if (!s) return null;

  // Compose the date/days line.
  const dateStr = fmtDayMonth(s.nextExpectedISO);
  const daysOverdue = s.daysOverdue;
  let dateLine: string;
  if (daysOverdue >= 9999) {
    dateLine = t("noPriorVisit");
  } else if (daysOverdue > 0) {
    dateLine = t("overdueBy", { date: dateStr, days: daysOverdue });
  } else if (daysOverdue === 0) {
    dateLine = t("today", { date: dateStr });
  } else {
    dateLine = t("inDays", { date: dateStr, days: Math.abs(daysOverdue) });
  }

  const intl = normalisePhoneIL(s.phone);
  const waMessage = t("whatsappMessage", { name: props.notif.text });
  const waHref = intl ? `https://api.whatsapp.com/send?phone=${intl}&text=${encodeURIComponent(waMessage)}` : null;

  return (
    <div
      onClick={props.onClick}
      className="bg-white border border-gray-100 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs font-semibold text-gray-900 truncate">{props.notif.text}</p>
            {s.frequency && (
              <span className="text-[9px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{s.frequency}</span>
            )}
          </div>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {dateLine}{s.city ? ` · ${s.city}` : ""}
          </p>
        </div>
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={t("whatsappTitle")}
            className="hit-44 w-7 h-7 flex items-center justify-center rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex-shrink-0"
          >
            <MessageSquare size={12} />
          </a>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); props.onDismiss(); }}
          aria-label={t("dismissAria")}
          className="hit-44 w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-500 flex-shrink-0"
        >
          <X size={11} />
        </button>
      </div>
    </div>
  );
}
