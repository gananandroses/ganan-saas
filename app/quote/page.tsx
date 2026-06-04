"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Plus, Loader2, Search, Trash2, Calendar, User as UserIcon,
  MessageSquare, Eye, Edit3, Copy, MoreHorizontal, Flame, Clock, AlertTriangle,
  Phone, Target, ChevronRight, XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast, confirmDialog } from "@/components/Toaster";
import QuoteCreatorModal from "@/components/QuoteCreatorModal";

interface Quote {
  id: string;
  title: string;
  customer_name: string;
  customer_phone: string | null;
  customer_id: string | null;
  customer_address: string | null;
  status: "draft" | "sent" | "accepted" | "rejected";
  total_with_vat: number;
  subtotal_before_vat: number;
  vat_amount: number;
  markup_percent: number;
  valid_until: string | null;
  created_at: string;
  sent_at?: string | null;
  quote_number: string | null;
  public_token?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  notes: string | null;
}

const STATUS_CONFIG: Record<Quote["status"], { label: string; chip: string; dot: string }> = {
  draft:    { label: "טיוטה",  chip: "bg-purple-50 text-purple-700",  dot: "bg-purple-400" },
  sent:     { label: "נשלחה",  chip: "bg-blue-50 text-blue-700",       dot: "bg-blue-400" },
  accepted: { label: "אושרה",  chip: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  rejected: { label: "נדחתה",  chip: "bg-red-50 text-red-700",         dot: "bg-red-400" },
};

// Thresholds — single source of truth so we can tune later
const STALE_SENT_DAYS = 7;     // sent quote — start of the gentle reminder window
const STALE_SENT_CAP_DAYS = 21; // …and the END. After this we STOP nagging — an
                                // unanswered quote past 3 weeks is effectively
                                // dead, and the user explicitly didn't want it
                                // to keep alerting / forcing manual cleanup.
const EXPIRING_SOON_DAYS = 3;  // quote about to expire
const OLD_DRAFT_DAYS = 5;      // draft sitting too long

function fmt(n: number) {
  return `₪${Math.round(n).toLocaleString("he-IL")}`;
}

function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function daysFromNow(iso: string | null | undefined): number {
  if (!iso) return Infinity;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function daysUntil(iso: string | null | undefined): number {
  if (!iso) return Infinity;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// Generate a personalised follow-up WhatsApp message — the heart of the
// "100/10" follow-up flow. The gardener clicks תזכורת, WhatsApp opens with
// this message ready to send. One tap.
function buildReminderMsg(quote: Quote, days: number, publicLink: string | null): string {
  const name = (quote.customer_name || "").split(" ")[0] || quote.customer_name;
  const titleStr = quote.title ? ` ל"${quote.title}"` : "";
  const total = fmt(quote.total_with_vat || 0);
  const linkLine = publicLink ? `\n\nצפייה בהצעה: ${publicLink}` : "";
  return `שלום ${name},
עברו ${days} ימים מאז ששלחתי לך את הצעת המחיר${titleStr} בסך ${total}.
רציתי לוודא שהכל ברור — אשמח לענות על כל שאלה.${linkLine}

תודה!`;
}

function whatsappUrl(phone: string | null | undefined, msg: string): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, "");
  const intl = cleaned.startsWith("0") ? "972" + cleaned.slice(1)
             : cleaned.startsWith("972") ? cleaned
             : cleaned;
  return `https://api.whatsapp.com/send?phone=${intl}&text=${encodeURIComponent(msg)}`;
}

function publicQuoteUrl(token: string | null | undefined): string | null {
  if (!token) return null;
  if (typeof window === "undefined") return null;
  return `${window.location.origin}/q/${token}`;
}

export default function QuotesListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "todo" | Quote["status"]>("all");
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    fetchQuotes();
  }, []);

  // Close menu when user mousedowns outside it. Critically: we must
  // check that the target ISN'T inside the menu (data-quote-menu)
  // before closing — otherwise pressing an item triggers this
  // listener via native bubbling, the menu unmounts, and the item's
  // onClick never fires. React's stopPropagation on the menu
  // container is not reliable here because the native event reaches
  // document regardless of React's synthetic handlers.
  useEffect(() => {
    if (!openMenuId) return;
    function onClick(e: MouseEvent) {
      const target = e.target as Element | null;
      if (target && target.closest('[data-quote-menu]')) return;
      setOpenMenuId(null);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [openMenuId]);

  async function fetchQuotes() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("quotes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setQuotes(data as Quote[]);
    setLoading(false);
  }

  async function handleDelete(id: string, title: string) {
    if (!await confirmDialog({ title: `למחוק את ההצעה "${title}"?`, confirmLabel: "מחק", destructive: true })) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // The old version of this function discarded the Supabase error,
    // optimistically removed the row from local state, and showed a
    // success toast. End result: when the DB rejected the delete
    // (FK constraint from related quote_items / quote_signatures,
    // RLS, etc.) the user saw "ההצעה נמחקה" but the quote came
    // back on the next refresh.
    const { error } = await supabase.from("quotes").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      // Foreign-key violations are the most common cause here. Tell
      // the user what's blocking the delete so they can clean it up.
      const isFk = /foreign key|violates/i.test(error.message);
      toast.error(
        "לא הצלחנו למחוק את ההצעה",
        isFk
          ? "יש לרשומה נתונים מקושרים (חתימה / חשבונית / תשלום). מחק קודם אותם, או סמן את ההצעה כ\"בוטלה\" במקום."
          : error.message,
      );
      return;
    }
    setQuotes(prev => prev.filter(q => q.id !== id));
    toast.success("ההצעה נמחקה");
  }

  // "לא יצא לפועל" — the graceful exit for a quote the customer didn't
  // approve (or never answered). Sets status to "rejected" which
  // immediately drops it out of every nag path (isStaleSent /
  // isExpiringSoon / isOldDraft all gate on sent/draft). One tap, no
  // confirmation dialog, no deletion — the quote stays for the
  // conversion-rate stats but stops bothering the user.
  async function markNotMaterialized(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("quotes")
      .update({ status: "rejected" })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      toast.error("לא הצלחנו לעדכן", error.message);
      return;
    }
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: "rejected" } : q));
    toast.success("סומן כלא יצא לפועל");
  }

  async function handleDuplicate(q: Quote) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentYear = new Date().getFullYear();
    const { data: lastQuotes } = await supabase
      .from("quotes")
      .select("quote_seq")
      .eq("user_id", user.id)
      .eq("quote_year", currentYear)
      .order("quote_seq", { ascending: false })
      .limit(1);
    const nextSeq = ((lastQuotes && lastQuotes[0]?.quote_seq) || 0) + 1;
    const quoteNumber = `${currentYear}-${String(nextSeq).padStart(3, "0")}`;
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    const publicToken = Array.from(arr).map(b => b.toString(36).padStart(2, "0")).join("").slice(0, 22);
    const pinCode = String(Math.floor(1000 + Math.random() * 9000));

    const { data: dupe } = await supabase.from("quotes").insert({
      user_id: user.id,
      customer_id: q.customer_id,
      customer_name: q.customer_name,
      customer_phone: q.customer_phone,
      customer_address: q.customer_address,
      title: `${q.title} (העתק)`,
      items: q.items,
      markup_percent: q.markup_percent,
      subtotal_before_vat: q.subtotal_before_vat,
      vat_amount: q.vat_amount,
      total_with_vat: q.total_with_vat,
      status: "draft",
      valid_until: q.valid_until,
      notes: q.notes,
      quote_number: quoteNumber,
      quote_year: currentYear,
      quote_seq: nextSeq,
      public_token: publicToken,
      pin_code: pinCode,
    }).select().single();

    if (dupe) {
      router.push(`/quote/${dupe.id}/edit`);
    }
  }

  // ── Customer history map: how many ACCEPTED quotes does each customer have?
  // Used to render "ללקוח X הצעות מאושרות בעבר" badges. Tracks both id and
  // name so legacy quotes without a customer_id still get matched.
  const customerHistory = useMemo(() => {
    const byId = new Map<string, number>();
    const byName = new Map<string, number>();
    quotes.forEach(q => {
      if (q.status !== "accepted") return;
      if (q.customer_id) byId.set(q.customer_id, (byId.get(q.customer_id) ?? 0) + 1);
      const key = (q.customer_name || "").trim().toLowerCase();
      if (key) byName.set(key, (byName.get(key) ?? 0) + 1);
    });
    return { byId, byName };
  }, [quotes]);

  function getAcceptedCount(q: Quote): number {
    // Don't count the quote itself if it's accepted — we want PRIOR accepted.
    const total = q.customer_id
      ? (customerHistory.byId.get(q.customer_id) ?? 0)
      : (customerHistory.byName.get((q.customer_name || "").trim().toLowerCase()) ?? 0);
    return q.status === "accepted" ? Math.max(0, total - 1) : total;
  }

  // ── Hot signals — derived per quote so we don't recompute in render
  function isStaleSent(q: Quote): boolean {
    if (q.status !== "sent") return false;
    // Only nag inside a WINDOW: from STALE_SENT_DAYS up to the cap.
    // Past the cap we go quiet — no more orange banner, no more
    // "send reminder" badge. The quote stays in the list under "נשלח"
    // but stops demanding attention. The user can mark it "לא יצא
    // לפועל" whenever they want (or just leave it).
    const days = daysFromNow(q.sent_at || q.created_at);
    return days >= STALE_SENT_DAYS && days <= STALE_SENT_CAP_DAYS;
  }
  function isExpiringSoon(q: Quote): boolean {
    if (q.status !== "sent" && q.status !== "draft") return false;
    if (!q.valid_until) return false;
    const d = daysUntil(q.valid_until);
    return d >= 0 && d <= EXPIRING_SOON_DAYS;
  }
  function isOldDraft(q: Quote): boolean {
    if (q.status !== "draft") return false;
    return daysFromNow(q.created_at) >= OLD_DRAFT_DAYS;
  }
  function needsAction(q: Quote): boolean {
    return isStaleSent(q) || isExpiringSoon(q) || isOldDraft(q);
  }

  const hot = useMemo(() => {
    const stale: Quote[] = [];
    const expiring: Quote[] = [];
    const oldDrafts: Quote[] = [];
    quotes.forEach(q => {
      if (isStaleSent(q)) stale.push(q);
      if (isExpiringSoon(q)) expiring.push(q);
      if (isOldDraft(q)) oldDrafts.push(q);
    });
    return { stale, expiring, oldDrafts };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotes]);

  const totalHot = hot.stale.length + hot.expiring.length + hot.oldDrafts.length;

  // Filtered quotes
  const filtered = quotes.filter(q => {
    if (activeFilter === "todo" && !needsAction(q)) return false;
    if (activeFilter !== "all" && activeFilter !== "todo" && q.status !== activeFilter) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return (q.title || "").toLowerCase().includes(s) || (q.customer_name || "").toLowerCase().includes(s);
    }
    return true;
  });

  // Stats
  const totals = {
    all: quotes.length,
    draft: quotes.filter(q => q.status === "draft").length,
    sent: quotes.filter(q => q.status === "sent").length,
    accepted: quotes.filter(q => q.status === "accepted").length,
    rejected: quotes.filter(q => q.status === "rejected").length,
  };
  const totalAccepted = quotes.filter(q => q.status === "accepted").reduce((s, q) => s + (q.total_with_vat || 0), 0);
  const totalSent = quotes.filter(q => q.status === "sent").reduce((s, q) => s + (q.total_with_vat || 0), 0);

  // Conversion analytics
  const decidedQuotes = totals.accepted + totals.rejected;
  const conversionRate = decidedQuotes > 0 ? Math.round((totals.accepted / decidedQuotes) * 100) : 0;
  const avgAcceptedValue = totals.accepted > 0
    ? Math.round(totalAccepted / totals.accepted)
    : 0;

  // ── Smart reminder action
  function handleSendReminder(q: Quote) {
    if (!q.customer_phone) {
      toast.error("אין טלפון ללקוח");
      return;
    }
    const days = daysFromNow(q.sent_at || q.created_at);
    const link = publicQuoteUrl(q.public_token);
    const msg = buildReminderMsg(q, days, link);
    const url = whatsappUrl(q.customer_phone, msg);
    if (url) {
      window.open(url, "_blank");
      toast.success("WhatsApp נפתח עם תזכורת מותאמת");
    }
  }

  // ── Status-aware primary CTA — what the gardener should do RIGHT NOW
  type CTA = { label: string; icon: React.ReactNode; onClick: () => void; cls: string };
  function getPrimaryCTA(q: Quote): CTA {
    if (q.status === "draft") {
      return {
        label: "ערוך טיוטה",
        icon: <Edit3 size={14} />,
        onClick: () => router.push(`/quote/${q.id}/edit`),
        cls: "bg-purple-600 hover:bg-purple-700 text-white",
      };
    }
    if (q.status === "sent" && isStaleSent(q)) {
      return {
        label: "שלח תזכורת",
        icon: <MessageSquare size={14} />,
        onClick: () => handleSendReminder(q),
        cls: "bg-orange-500 hover:bg-orange-600 text-white",
      };
    }
    if (q.status === "accepted") {
      return {
        label: "התקשר ללקוח",
        icon: <Phone size={14} />,
        onClick: () => { if (q.customer_phone) window.location.href = `tel:${q.customer_phone}`; },
        cls: "bg-emerald-600 hover:bg-emerald-700 text-white",
      };
    }
    if (q.status === "rejected") {
      return {
        label: "שכפל ונסה שוב",
        icon: <Copy size={14} />,
        onClick: () => handleDuplicate(q),
        cls: "bg-blue-600 hover:bg-blue-700 text-white",
      };
    }
    // Default — sent recent
    return {
      label: "צפייה",
      icon: <Eye size={14} />,
      onClick: () => router.push(`/quote/${q.id}`),
      cls: "bg-gray-900 hover:bg-gray-800 text-white",
    };
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#F7F8FA]">
      {/* Sticky header — always shows where you are + how to create new.
          /quote isn't in the BottomNav, so we keep an explicit back chevron
          to the dashboard on mobile (and on desktop too — sidebar is fine
          but having both costs nothing and matches /quote/[id] which has
          the same affordance). */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => router.push("/dashboard")}
              aria-label="חזרה לדשבורד"
              className="hit-44 w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <ChevronRight size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">הצעות מחיר</h1>
              <p className="text-xs text-gray-400 mt-0.5">{quotes.length} הצעות{totalHot > 0 ? ` · ${totalHot} דורשות פעולה` : ""}</p>
            </div>
          </div>
          <button
            onClick={() => setCreatorOpen(true)}
            className="hidden sm:flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold px-4 py-2 rounded-xl shadow-sm transition-colors"
          >
            <Plus size={15} /> הצעה חדשה
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-4 pb-32">

        {/* ── HOT ACTIONS — only when there's something on fire ── */}
        {!loading && totalHot > 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center">
                  <Flame size={16} className="text-orange-500" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">דורש ממך פעולה</h2>
                  <p className="text-[11px] text-gray-400">{totalHot} פריטים</p>
                </div>
              </div>
              <button
                onClick={() => setActiveFilter("todo")}
                className="text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                הצג הכל <ChevronRight size={12} />
              </button>
            </div>

            <div className="px-3 pb-3 pt-2 space-y-1.5">
              {hot.stale.length > 0 && (
                <button
                  onClick={() => setActiveFilter("todo")}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded-2xl bg-orange-50 hover:bg-orange-100 border border-orange-100 transition-colors text-right"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
                      <Clock size={16} className="text-orange-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-orange-700 leading-tight">תקועות בהמתנה</p>
                      <p className="text-[11px] text-orange-500 mt-0.5">נשלחו לפני {STALE_SENT_DAYS}+ ימים — שווה תזכורת</p>
                    </div>
                  </div>
                  <span className="text-2xl font-black text-orange-700 tabular-nums">{hot.stale.length}</span>
                </button>
              )}

              {hot.expiring.length > 0 && (
                <button
                  onClick={() => setActiveFilter("todo")}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-100 transition-colors text-right"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
                      <AlertTriangle size={16} className="text-red-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-red-700 leading-tight">פגות תוקף בקרוב</p>
                      <p className="text-[11px] text-red-500 mt-0.5">פגות ב-{EXPIRING_SOON_DAYS} ימים או פחות</p>
                    </div>
                  </div>
                  <span className="text-2xl font-black text-red-700 tabular-nums">{hot.expiring.length}</span>
                </button>
              )}

              {hot.oldDrafts.length > 0 && (
                <button
                  onClick={() => setActiveFilter("todo")}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded-2xl bg-purple-50 hover:bg-purple-100 border border-purple-100 transition-colors text-right"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
                      <Edit3 size={16} className="text-purple-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-purple-700 leading-tight">טיוטות ישנות</p>
                      <p className="text-[11px] text-purple-500 mt-0.5">לא נשלחו {OLD_DRAFT_DAYS}+ ימים</p>
                    </div>
                  </div>
                  <span className="text-2xl font-black text-purple-700 tabular-nums">{hot.oldDrafts.length}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── PERFORMANCE CARD — single consolidated metric strip ── */}
        {!loading && quotes.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Target size={16} className="text-emerald-500" />
              </div>
              <h2 className="text-sm font-bold text-gray-900">ביצועים</h2>
              {decidedQuotes > 0 && conversionRate >= 70 && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                  🔥 שיעור המרה מצוין
                </span>
              )}
              {decidedQuotes > 1 && conversionRate < 30 && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
                  ⚠ שווה לבדוק תמחור
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <p className="text-2xl sm:text-3xl font-black text-gray-900 tabular-nums">
                  {decidedQuotes > 0 ? `${conversionRate}%` : "—"}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">המרה</p>
                {decidedQuotes > 0 && (
                  <p className="text-[10px] text-gray-400 tabular-nums">{totals.accepted}/{decidedQuotes}</p>
                )}
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-emerald-600 tabular-nums">
                  {fmt(totalAccepted)}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">אושרו</p>
                <p className="text-[10px] text-gray-400 tabular-nums">{totals.accepted} הצעות</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-blue-600 tabular-nums">
                  {fmt(totalSent)}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">ממתינות</p>
                <p className="text-[10px] text-gray-400 tabular-nums">{totals.sent} הצעות</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-gray-700 tabular-nums">
                  {avgAcceptedValue > 0 ? fmt(avgAcceptedValue) : "—"}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">ערך ממוצע</p>
                <p className="text-[10px] text-gray-400">בעסקה שאושרה</p>
              </div>
            </div>
          </div>
        )}

        {/* ── FILTER BAR ── */}
        <div className="bg-white rounded-3xl border border-gray-100 p-3 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="חפש לפי כותרת או לקוח..."
              autoComplete="off"
              inputMode="search"
              className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 pr-9 text-sm focus:outline-none focus:bg-white focus:border-gray-200 transition-colors"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {totalHot > 0 && (
              <button
                onClick={() => setActiveFilter("todo")}
                className={`text-xs px-3 py-1.5 rounded-xl whitespace-nowrap font-semibold transition-colors flex items-center gap-1.5 ${
                  activeFilter === "todo"
                    ? "bg-orange-500 text-white"
                    : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                }`}
              >
                <Flame size={11} />
                לטיפול ({totalHot})
              </button>
            )}
            {([
              { k: "all" as const,      l: "הכל",     count: totals.all },
              { k: "draft" as const,    l: "טיוטות",  count: totals.draft },
              { k: "sent" as const,     l: "נשלחו",   count: totals.sent },
              { k: "accepted" as const, l: "אושרו",   count: totals.accepted },
              { k: "rejected" as const, l: "נדחו",    count: totals.rejected },
            ]).map(({ k, l, count }) => (
              <button
                key={k}
                onClick={() => setActiveFilter(k)}
                className={`text-xs px-3 py-1.5 rounded-xl whitespace-nowrap font-semibold transition-colors ${
                  activeFilter === k
                    ? "bg-gray-900 text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {l} ({count})
              </button>
            ))}
          </div>
        </div>

        {/* ── QUOTES LIST ── */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-gray-300" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center">
            <FileText size={40} className="mx-auto text-gray-200 mb-3" />
            <h3 className="font-bold text-gray-900">
              {activeFilter === "todo" ? "אין פעולות דחופות" : "אין הצעות מחיר"}
            </h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              {activeFilter === "todo" ? "הכל תחת שליטה 🌱" : "צור את הצעת המחיר הראשונה שלך"}
            </p>
            {activeFilter !== "todo" && (
              <button
                onClick={() => setCreatorOpen(true)}
                className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl"
              >
                <Plus size={16} /> הצעה חדשה
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(q => {
              const status = STATUS_CONFIG[q.status];
              const cta = getPrimaryCTA(q);
              const sentDays = q.status === "sent" ? daysFromNow(q.sent_at || q.created_at) : -1;
              const expiryDays = q.valid_until ? daysUntil(q.valid_until) : null;
              const accepted = getAcceptedCount(q);
              const isHot = needsAction(q);

              return (
                <div
                  key={q.id}
                  className={`bg-white border rounded-2xl p-4 transition-all ${
                    isHot ? "border-orange-200 shadow-sm" : "border-gray-100 hover:border-gray-200 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {q.quote_number && (
                          <span className="text-[11px] font-mono font-bold text-gray-400">#{q.quote_number}</span>
                        )}
                        <h3 className="font-bold text-gray-900 text-base truncate">{q.title || "ללא כותרת"}</h3>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${status.chip}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1"><UserIcon size={11} />{q.customer_name}</span>
                        <span className="flex items-center gap-1"><Calendar size={11} />{formatDate(q.created_at)}</span>
                      </div>

                      {/* Smart signals — only render the relevant ones */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {q.status === "sent" && sentDays >= 0 && (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            sentDays >= STALE_SENT_DAYS ? "bg-orange-50 text-orange-700" :
                            sentDays >= 3              ? "bg-amber-50 text-amber-700" :
                                                         "bg-gray-50 text-gray-500"
                          }`}>
                            <Clock size={10} />
                            {sentDays === 0 ? "נשלחה היום" : `נשלחה לפני ${sentDays} ימים`}
                          </span>
                        )}
                        {expiryDays !== null && expiryDays >= 0 && (q.status === "sent" || q.status === "draft") && (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            expiryDays <= EXPIRING_SOON_DAYS ? "bg-red-50 text-red-700" :
                            expiryDays <= 7                  ? "bg-amber-50 text-amber-700" :
                                                               "bg-gray-50 text-gray-500"
                          }`}>
                            <AlertTriangle size={10} />
                            {expiryDays === 0 ? "פגה היום" : `פגה בעוד ${expiryDays} ימים`}
                          </span>
                        )}
                        {expiryDays !== null && expiryDays < 0 && q.status !== "accepted" && q.status !== "rejected" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                            <AlertTriangle size={10} />
                            פג תוקף
                          </span>
                        )}
                        {accepted > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                            ✓ {accepted} הצעות מאושרות בעבר
                          </span>
                        )}
                        {q.markup_percent > 0 && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                            +{q.markup_percent}%
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-left flex-shrink-0">
                      <p className="text-lg font-black text-gray-900 tabular-nums">{fmt(q.total_with_vat)}</p>
                      <p className="text-[10px] text-gray-400">כולל מע״מ</p>
                    </div>
                  </div>

                  {/* Actions row — primary CTA + secondary view + overflow */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                    <button
                      onClick={cta.onClick}
                      className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl transition-colors ${cta.cls}`}
                    >
                      {cta.icon}
                      {cta.label}
                    </button>

                    {/* Secondary: view (or edit if primary is something else) */}
                    {q.status !== "draft" && (
                      <button
                        onClick={() => router.push(`/quote/${q.id}`)}
                        title="צפייה"
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                    )}
                    {q.status === "draft" && (
                      <button
                        onClick={() => router.push(`/quote/${q.id}`)}
                        title="צפייה"
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                    )}

                    {/* WhatsApp quick action — only if customer has phone and not the primary already */}
                    {q.customer_phone && !(q.status === "sent" && isStaleSent(q)) && (
                      <a
                        href={whatsappUrl(q.customer_phone, `שלום ${(q.customer_name || "").split(" ")[0]}, מצורפת הצעת המחיר${q.title ? ` "${q.title}"` : ""}.${publicQuoteUrl(q.public_token) ? `\n\nצפייה: ${publicQuoteUrl(q.public_token)}` : ""}`) ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        title="WhatsApp"
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
                      >
                        <MessageSquare size={14} />
                      </a>
                    )}

                    {/* Overflow menu — duplicate / delete.
                        Both the toggle button and the dropdown carry
                        data-quote-menu so the outside-click handler
                        (above) can `closest()`-skip them. Without
                        this, pressing an item would race the
                        document mousedown and unmount the menu
                        before the onClick fired. */}
                    <div className="relative" data-quote-menu>
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === q.id ? null : q.id); }}
                        title="עוד"
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      {openMenuId === q.id && (
                        <div
                          className="absolute left-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10"
                        >
                          {q.status !== "draft" && (
                            <button
                              onClick={() => { setOpenMenuId(null); router.push(`/quote/${q.id}/edit`); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 text-right"
                            >
                              <Edit3 size={13} /> ערוך
                            </button>
                          )}
                          <button
                            onClick={() => { setOpenMenuId(null); handleDuplicate(q); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 text-right"
                          >
                            <Copy size={13} /> שכפל
                          </button>
                          {/* "לא יצא לפועל" — graceful archive for an
                              unanswered/declined quote. Only shown while
                              it's still draft/sent (no point on already
                              accepted/rejected). */}
                          {(q.status === "draft" || q.status === "sent") && (
                            <button
                              onClick={() => { setOpenMenuId(null); markNotMaterialized(q.id); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 text-right"
                            >
                              <XCircle size={13} /> לא יצא לפועל
                            </button>
                          )}
                          <div className="border-t border-gray-100 my-1" />
                          <button
                            onClick={() => { setOpenMenuId(null); handleDelete(q.id, q.title); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 text-right"
                          >
                            <Trash2 size={13} /> מחק
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Mobile FAB — always-visible "create quote" */}
      <button
        onClick={() => setCreatorOpen(true)}
        aria-label="הצעה חדשה"
        className="sm:hidden fixed bottom-[max(80px,env(safe-area-inset-bottom))] left-5 z-30 w-14 h-14 rounded-2xl bg-gray-900 text-white shadow-lg flex items-center justify-center hover:bg-gray-800 active:scale-95 transition-all"
      >
        <Plus size={24} />
      </button>

      {creatorOpen && <QuoteCreatorModal onClose={() => setCreatorOpen(false)} />}
    </div>
  );
}
