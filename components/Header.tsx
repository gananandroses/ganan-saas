"use client";
import { Bell, Search, Plus, X, AlertCircle, Package, CheckCircle, Calendar, Users, FileText, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { pendingMissedVisits } from "@/lib/missed-visits";
import BackButton from "@/components/BackButton";

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
  showBack?: boolean;
}

interface Notif {
  id: string;
  text: string;
  type: "red" | "yellow" | "green" | "orange";
  href?: string;
  // When set, clicking the notif opens an inline payment-confirm modal
  // instead of navigating. Used for open-debt notifications so the user
  // can mark "paid / not paid" in one tap without leaving the page.
  payment?: { txId: string; customerName: string; amount: number };
}

// Search result types ─ a single dropdown shows three buckets
interface SearchResultCustomer { kind: "customer"; id: string; name: string; phone: string | null; city: string | null }
interface SearchResultQuote    { kind: "quote";    id: string; title: string; customer_name: string; quote_number: string | null }
interface SearchResultJob      { kind: "job";      id: string; customer_name: string; type: string | null; job_date: string }
type SearchResult = SearchResultCustomer | SearchResultQuote | SearchResultJob;

export default function Header({ title, subtitle, action, showBack = false }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showNotif, setShowNotif] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [notifTick, setNotifTick] = useState(0);

  // Pending payment-confirm modal — set when the user taps a debt
  // notification; cleared on close or after marking as paid.
  const [paymentConfirm, setPaymentConfirm] = useState<
    { txId: string; customerName: string; amount: number } | null
  >(null);
  const [savingPayment, setSavingPayment] = useState(false);

  async function markPaid(txId: string) {
    setSavingPayment(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("transactions")
        .update({ status: "paid" })
        .eq("id", txId)
        .eq("user_id", user.id);
      setNotifs((prev) => prev.filter((n) => n.payment?.txId !== txId));
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
        const reasonLabel = j.cancellation_reason === "no_show" ? "לא הופיע" : "בלת״מ";
        list.push({
          id: `missed-${j.id}`,
          text: `🔥 ${j.customer_name} — דרוש תיאום מחדש (${reasonLabel} · ${j.job_date})`,
          type: "orange",
          href: "/automations",
        });
      });

      // חובות פתוחים
      const { data: pending } = await supabase
        .from("transactions")
        .select("id, customer_name, amount")
        .eq("user_id", user.id)
        .eq("type", "income")
        .in("status", ["pending", "overdue"]);

      (pending || []).forEach((t) => {
        list.push({
          id: `tx-${t.id}`,
          text: `${t.customer_name} — חוב פתוח של ₪${Number(t.amount).toLocaleString()}`,
          type: "red",
          payment: {
            txId: t.id,
            customerName: t.customer_name,
            amount: Number(t.amount),
          },
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
            text: `מלאי נמוך: ${i.name} (${i.quantity} יחידות)`,
            type: "yellow",
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

  const dismiss = (id: string) => setNotifs((prev) => prev.filter((n) => n.id !== id));
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
            placeholder="חיפוש לקוח, הצעה, עבודה..."
            value={query}
            onChange={e => { setQuery(e.target.value); setShowResults(true); }}
            onFocus={() => { if (query.trim().length >= 2) setShowResults(true); }}
            className="bg-transparent text-sm text-gray-700 outline-none w-full placeholder:text-gray-400"
            dir="rtl"
          />
          {searching && <Loader2 size={12} className="animate-spin text-gray-400 flex-shrink-0" />}
          {query && !searching && (
            <button onClick={() => { setQuery(""); setResults([]); }} aria-label="נקה" className="text-gray-400 hover:text-gray-600 flex-shrink-0">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Results dropdown — z-50 so it sits above any sticky bars; bg-white
            with a solid shadow so nothing bleeds through; results grouped
            by type with a tiny header label between groups. */}
        {showResults && query.trim().length >= 2 && (
          <div className="absolute top-full mt-1.5 right-0 left-0 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[420px] overflow-y-auto" dir="rtl">
            {searching && results.length === 0 && (
              <div className="px-4 py-5 text-center text-xs text-gray-400">מחפש...</div>
            )}
            {!searching && results.length === 0 && (
              <div className="px-4 py-5 text-center text-xs text-gray-400">לא נמצאו תוצאות עבור &quot;{query}&quot;</div>
            )}
            {results.length > 0 && (
              <ul className="py-1">
                {(["customer", "quote", "job"] as const).map(kind => {
                  const items = results.filter(r => r.kind === kind);
                  if (items.length === 0) return null;
                  const sectionLabel = kind === "customer" ? "לקוחות" : kind === "quote" ? "הצעות מחיר" : "עבודות";
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
                              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors text-right"
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
                                      {r.title || "הצעת מחיר"}
                                      {r.quote_number && <span className="text-gray-400 text-[11px] mr-1">#{r.quote_number}</span>}
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
                                      {r.type ?? "עבודה"} · {r.job_date}
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
          aria-label="התראות"
          className="relative p-2 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <Bell size={20} className="text-gray-500" />
          {notifs.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
              {notifs.length}
            </span>
          )}
        </button>

        {showNotif && (
          <div className="absolute top-12 left-0 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50" dir="rtl">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h3 className="font-bold text-gray-800 text-sm">התראות {notifs.length > 0 && `(${notifs.length})`}</h3>
              {notifs.length > 0 && (
                <button onClick={dismissAll} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                  נקה הכל
                </button>
              )}
            </div>

            <div className="px-3 pb-3 space-y-2 max-h-72 overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="py-6 text-center text-gray-400 text-sm">
                  <CheckCircle size={22} className="mx-auto mb-1.5 text-green-400" />
                  אין התראות חדשות
                </div>
              ) : (
                notifs.map((n) => {
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
                    className={`flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2.5 ${isClickable ? "cursor-pointer hover:bg-gray-100" : ""} transition-colors`}
                  >
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5 ${colorMap[n.type]}`}>
                      {iconMap[n.type]}
                    </span>
                    <p className="text-sm text-gray-700 flex-1 leading-snug">{n.text}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                      aria-label="סגור התראה"
                      className="text-gray-300 hover:text-gray-500 flex-shrink-0 mt-0.5 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  );
                })
              )}
            </div>
          </div>
        )}
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
          dir="rtl"
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-gray-900 mb-1.5">אישור תשלום</h3>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              האם <strong className="text-gray-900">{paymentConfirm.customerName}</strong> שילם ₪{paymentConfirm.amount.toLocaleString()}?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => markPaid(paymentConfirm.txId)}
                disabled={savingPayment}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {savingPayment && <Loader2 size={14} className="animate-spin" />}
                כן, שילם
              </button>
              <button
                onClick={() => setPaymentConfirm(null)}
                disabled={savingPayment}
                className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-60 text-gray-700 text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                לא, עדיין לא
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
