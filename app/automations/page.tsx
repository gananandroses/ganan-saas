"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase/client";
import {
  Calendar,
  CreditCard,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  X,
  Loader2,
  Inbox,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type ActionType = "tomorrow_visit" | "open_debt" | "completed_today" | "inactive_customer";

interface ActionItem {
  id: string;
  type: ActionType;
  customerId: string;
  customerName: string;
  phone: string;
  meta: Record<string, string | number>;
  message: string; // pre-built WhatsApp message
}

interface JobRow {
  id: string;
  customer_id: string | null;
  customer_name: string;
  job_date: string;
  job_time: string | null;
  status: string;
  type: string | null;
  address: string | null;
  price: number;
  price_before_vat: boolean;
}

interface TxRow {
  id: string;
  customer_id: string | null;
  customer_name: string;
  amount: number;
  status: string;
  type: string;
  description: string;
  transaction_date: string;
}

interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  last_visit: string | null;
}

interface PaymentSettings {
  bitPhone: string;
  payboxPhone: string;
  bankName: string;
  bankBranch: string;
  bankAccount: string;
  businessName: string;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function daysAgo(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function buildPaymentBlock(settings: PaymentSettings): string {
  const lines: string[] = [];
  if (settings.bitPhone) lines.push(`• Bit: ${settings.bitPhone}`);
  if (settings.payboxPhone) lines.push(`• PayBox: ${settings.payboxPhone}`);
  if (settings.bankName || settings.bankAccount) {
    const bankLine = `• העברה בנקאית: ${settings.bankName || ""}${settings.bankBranch ? ` סניף ${settings.bankBranch}` : ""}${settings.bankAccount ? ` חשבון ${settings.bankAccount}` : ""}`.trim();
    lines.push(bankLine);
  }
  if (lines.length === 0) return "";
  return "\n\nאמצעי תשלום:\n" + lines.join("\n");
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  if (digits.startsWith("972")) return digits;
  if (digits.length === 9) return "972" + digits;
  return digits;
}

// ─────────────────────────────────────────────────────────────
// Templates per action type
// ─────────────────────────────────────────────────────────────

function buildTomorrowVisitMsg(name: string, time: string, type: string, businessName: string): string {
  const greeting = `שלום ${name},`;
  const body = `אנחנו מגיעים אליך מחר${time ? ` בשעה ${time}` : ""}${type ? ` ל${type}` : ""}.`;
  const ask = `יש שינוי או הערה? נשמח לדעת מראש 🌿`;
  const sig = businessName ? `\n\n${businessName}` : "";
  return `${greeting}\n${body}\n${ask}${sig}`;
}

function buildDebtReminderMsg(name: string, amount: number, description: string, days: number, settings: PaymentSettings): string {
  const greeting = `שלום ${name},`;
  const body = `יש לך תשלום פתוח של ₪${amount.toLocaleString()} עבור ${description || "שירותי גינון"}${days > 0 ? ` (${days} ימים)` : ""}.`;
  const ask = `נשמח לסידור התשלום 🌿`;
  const payment = buildPaymentBlock(settings);
  const sig = settings.businessName ? `\n\n${settings.businessName}` : "";
  return `${greeting}\n${body}\n${ask}${payment}${sig}`;
}

function buildCompletedTodayMsg(name: string, type: string, settings: PaymentSettings): string {
  const greeting = `שלום ${name},`;
  const body = `סיימנו את ${type || "העבודה"} היום. תודה שבחרתם בנו! 🌿`;
  const ask = `אם הכל מצא חן בעיניך — נשמח לדירוג / המלצה.`;
  const payment = buildPaymentBlock(settings);
  const sig = settings.businessName ? `\n\n${settings.businessName}` : "";
  return `${greeting}\n${body}\n${ask}${payment}${sig}`;
}

function buildInactiveCustomerMsg(name: string, daysSince: number, businessName: string): string {
  const greeting = `שלום ${name},`;
  const body = `מזמן לא נפגשנו! עברו ${daysSince} ימים מאז הביקור האחרון.`;
  const ask = `רוצה לקבוע ביקור או טיפול עונתי? כתוב לי כאן 🌸`;
  const sig = businessName ? `\n\n${businessName}` : "";
  return `${greeting}\n${body}\n${ask}${sig}`;
}

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────

const DEBT_THRESHOLD_DAYS = 7;
const INACTIVE_THRESHOLD_DAYS = 30;
const DISMISSED_KEY = "automations_dismissed";

export default function AutomationsPage() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [settings, setSettings] = useState<PaymentSettings>({
    bitPhone: "", payboxPhone: "", bankName: "", bankBranch: "", bankAccount: "", businessName: "",
  });
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Modal state
  const [waModal, setWaModal] = useState<null | { phone: string; message: string; actionId: string }>(null);

  // Section collapse state
  const [collapsed, setCollapsed] = useState<Record<ActionType, boolean>>({
    tomorrow_visit: false,
    open_debt: false,
    completed_today: false,
    inactive_customer: false,
  });

  useEffect(() => {
    // Load dismissed list from localStorage
    if (typeof window !== "undefined") {
      const today = todayISO();
      const stored = localStorage.getItem(DISMISSED_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as { date: string; ids: string[] };
          if (parsed.date === today) {
            setDismissed(new Set(parsed.ids));
          } else {
            // New day — clear stale dismissals
            localStorage.removeItem(DISMISSED_KEY);
          }
        } catch {}
      }
    }

    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [jobsRes, txRes, custRes, profileRes] = await Promise.all([
      supabase.from("jobs").select("id, customer_id, customer_name, job_date, job_time, status, type, address, price, price_before_vat").eq("user_id", user.id),
      supabase.from("transactions").select("id, customer_id, customer_name, amount, status, type, description, transaction_date").eq("user_id", user.id),
      supabase.from("customers").select("id, name, phone, last_visit").eq("user_id", user.id),
      supabase.from("user_profile").select("business_name, bit_phone, paybox_phone, bank_name, bank_branch, bank_account").eq("user_id", user.id).single(),
    ]);

    if (jobsRes.data) setJobs(jobsRes.data as JobRow[]);
    if (txRes.data) setTransactions(txRes.data as TxRow[]);
    if (custRes.data) setCustomers(custRes.data as CustomerRow[]);
    if (profileRes.data) {
      setSettings({
        businessName: profileRes.data.business_name ?? "",
        bitPhone: profileRes.data.bit_phone ?? "",
        payboxPhone: profileRes.data.paybox_phone ?? "",
        bankName: profileRes.data.bank_name ?? "",
        bankBranch: profileRes.data.bank_branch ?? "",
        bankAccount: profileRes.data.bank_account ?? "",
      });
    }
    setLoading(false);
  }

  function dismissAction(actionId: string) {
    const next = new Set(dismissed);
    next.add(actionId);
    setDismissed(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify({ date: todayISO(), ids: Array.from(next) }));
    }
  }

  // Lookup helpers
  function findCustomer(customerId: string | null, customerName: string): CustomerRow | undefined {
    if (customerId) {
      const byId = customers.find(c => c.id === customerId);
      if (byId) return byId;
    }
    return customers.find(c => c.name.trim() === customerName.trim());
  }

  // ─────────────────────────────────────────────────────────────
  // Compute action items
  // ─────────────────────────────────────────────────────────────

  const actions = useMemo(() => {
    const tom = tomorrowISO();
    const today = todayISO();

    const items: { type: ActionType; list: ActionItem[] }[] = [];

    // 1) Tomorrow visits
    const tomorrowVisits: ActionItem[] = jobs
      .filter(j => j.job_date === tom && j.status !== "cancelled" && j.status !== "completed")
      .map(j => {
        const c = findCustomer(j.customer_id, j.customer_name);
        const time = (j.job_time ?? "").slice(0, 5);
        return {
          id: `visit:${j.id}`,
          type: "tomorrow_visit" as ActionType,
          customerId: c?.id ?? "",
          customerName: j.customer_name,
          phone: c?.phone ?? "",
          meta: { time, type: j.type ?? "" },
          message: buildTomorrowVisitMsg(j.customer_name, time, j.type ?? "", settings.businessName),
        };
      });

    // 2) Open debts > X days
    const openDebts: ActionItem[] = transactions
      .filter(t => t.type === "income" && (t.status === "pending" || t.status === "overdue"))
      .filter(t => daysAgo(t.transaction_date) >= DEBT_THRESHOLD_DAYS)
      .map(t => {
        const c = findCustomer(t.customer_id, t.customer_name);
        const days = daysAgo(t.transaction_date);
        return {
          id: `debt:${t.id}`,
          type: "open_debt" as ActionType,
          customerId: c?.id ?? "",
          customerName: t.customer_name,
          phone: c?.phone ?? "",
          meta: { amount: t.amount, days, description: t.description },
          message: buildDebtReminderMsg(t.customer_name, t.amount, t.description, days, settings),
        };
      });

    // 3) Completed today
    const completedToday: ActionItem[] = jobs
      .filter(j => j.status === "completed" && j.job_date === today)
      .map(j => {
        const c = findCustomer(j.customer_id, j.customer_name);
        return {
          id: `done:${j.id}`,
          type: "completed_today" as ActionType,
          customerId: c?.id ?? "",
          customerName: j.customer_name,
          phone: c?.phone ?? "",
          meta: { type: j.type ?? "" },
          message: buildCompletedTodayMsg(j.customer_name, j.type ?? "", settings),
        };
      });

    // 4) Inactive customers (last_visit > 30 days)
    const inactive: ActionItem[] = customers
      .filter(c => {
        if (!c.last_visit) return false;
        return daysAgo(c.last_visit) >= INACTIVE_THRESHOLD_DAYS;
      })
      .map(c => {
        const days = daysAgo(c.last_visit!);
        return {
          id: `inactive:${c.id}`,
          type: "inactive_customer" as ActionType,
          customerId: c.id,
          customerName: c.name,
          phone: c.phone ?? "",
          meta: { daysSince: days },
          message: buildInactiveCustomerMsg(c.name, days, settings.businessName),
        };
      });

    items.push({ type: "tomorrow_visit", list: tomorrowVisits });
    items.push({ type: "open_debt", list: openDebts });
    items.push({ type: "completed_today", list: completedToday });
    items.push({ type: "inactive_customer", list: inactive });

    return items;
  }, [jobs, transactions, customers, settings]);

  // Filter out dismissed
  const visibleActions = actions.map(group => ({
    ...group,
    list: group.list.filter(a => !dismissed.has(a.id)),
  }));

  const totalPending = visibleActions.reduce((s, g) => s + g.list.length, 0);

  // ─────────────────────────────────────────────────────────────
  // Send WhatsApp
  // ─────────────────────────────────────────────────────────────

  function openSend(action: ActionItem) {
    const intl = normalizePhone(action.phone);
    if (!intl) {
      alert(`לא נמצא טלפון ללקוח "${action.customerName}".\nודא שהלקוח רשום ב-CRM עם טלפון תקין.`);
      return;
    }
    setWaModal({ phone: intl, message: action.message, actionId: action.id });
  }

  function confirmSend() {
    if (!waModal) return;
    const url = `https://api.whatsapp.com/send?phone=${waModal.phone}&text=${encodeURIComponent(waModal.message)}`;
    window.open(url, "_blank");
    dismissAction(waModal.actionId);
    setWaModal(null);
  }

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────

  const sectionConfig: Record<ActionType, { title: string; icon: React.ReactNode; color: string; bgColor: string; emptyText: string }> = {
    tomorrow_visit: {
      title: "ביקורים מחר",
      icon: <Calendar size={18} />,
      color: "text-blue-700",
      bgColor: "bg-blue-50 border-blue-200",
      emptyText: "אין ביקורים מתוזמנים למחר",
    },
    open_debt: {
      title: `חובות פתוחים (מעל ${DEBT_THRESHOLD_DAYS} ימים)`,
      icon: <CreditCard size={18} />,
      color: "text-amber-700",
      bgColor: "bg-amber-50 border-amber-200",
      emptyText: "אין חובות פתוחים מעבר לסף",
    },
    completed_today: {
      title: "עבודות שהושלמו היום",
      icon: <CheckCircle2 size={18} />,
      color: "text-green-700",
      bgColor: "bg-green-50 border-green-200",
      emptyText: "טרם הושלמו עבודות היום",
    },
    inactive_customer: {
      title: `לקוחות לא פעילים (${INACTIVE_THRESHOLD_DAYS}+ ימים)`,
      icon: <Sparkles size={18} />,
      color: "text-pink-700",
      bgColor: "bg-pink-50 border-pink-200",
      emptyText: "כל הלקוחות פעילים",
    },
  };

  return (
    <div dir="rtl">
      <Header title="אוטומציות" subtitle="תור פעולות יומי — לחץ לבצע" />

      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Hero */}
        <div className="bg-gradient-to-l from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-5 sm:p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
              <Inbox size={22} className="text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">תור פעולות היום</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {loading ? "טוען..." : totalPending > 0 ? `${totalPending} פעולות ממתינות` : "אין פעולות ממתינות 🎉"}
              </p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-3xl sm:text-4xl font-black text-violet-700">{totalPending}</p>
            <p className="text-xs text-violet-500 font-medium">לטיפול</p>
          </div>
        </div>

        {/* Sections */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-gray-400" />
          </div>
        ) : (
          visibleActions.map(({ type, list }) => {
            const cfg = sectionConfig[type];
            const isCollapsed = collapsed[type];
            return (
              <div key={type} className={`rounded-2xl border ${cfg.bgColor}`}>
                <button
                  onClick={() => setCollapsed(p => ({ ...p, [type]: !p[type] }))}
                  className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-black/[0.02] rounded-t-2xl"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center ${cfg.color}`}>
                      {cfg.icon}
                    </div>
                    <div className="text-right">
                      <h2 className={`font-bold text-sm ${cfg.color}`}>{cfg.title}</h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {list.length === 0 ? cfg.emptyText : `${list.length} פעולות`}
                      </p>
                    </div>
                  </div>
                  {list.length > 0 && (isCollapsed ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronUp size={18} className="text-gray-400" />)}
                </button>

                {!isCollapsed && list.length > 0 && (
                  <div className="px-5 pb-4 space-y-2">
                    {list.map(action => (
                      <ActionRow key={action.id} action={action} onSend={() => openSend(action)} onDismiss={() => dismissAction(action.id)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Tip */}
        {!loading && totalPending === 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
            <CheckCircle2 size={36} className="mx-auto text-green-500 mb-3" />
            <h3 className="font-bold text-gray-900">הכל מסודר 👌</h3>
            <p className="text-sm text-gray-500 mt-1">כשיהיו פעולות ממתינות הן יופיעו כאן.</p>
          </div>
        )}
      </div>

      {/* WhatsApp Modal */}
      {waModal && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center" onClick={(e) => e.target === e.currentTarget && setWaModal(null)}>
          <div className="bg-white w-full sm:max-w-md sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh]" dir="rtl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                  <MessageSquare size={16} className="text-green-600" />
                </div>
                <h2 className="text-base font-bold text-gray-900">תצוגה מקדימה</h2>
              </div>
              <button onClick={() => setWaModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              <textarea
                rows={10}
                value={waModal.message}
                onChange={(e) => setWaModal({ ...waModal, message: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
              />
              <p className="text-xs text-gray-400">
                ⓘ אחרי שליחה — הפעולה תוסר מהתור היום. למחר תופיע מחדש (אם רלוונטי).
              </p>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0 flex gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button onClick={() => setWaModal(null)} className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50">
                ביטול
              </button>
              <button onClick={confirmSend} className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold">
                <MessageSquare size={16} />
                פתח ב-WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Action row
// ─────────────────────────────────────────────────────────────

function ActionRow({ action, onSend, onDismiss }: { action: ActionItem; onSend: () => void; onDismiss: () => void }) {
  const hasPhone = !!normalizePhone(action.phone);

  // Build subtitle per type
  let subtitle = "";
  if (action.type === "tomorrow_visit") {
    const time = action.meta.time as string;
    const type = action.meta.type as string;
    subtitle = [time, type].filter(Boolean).join(" · ") || "ביקור";
  } else if (action.type === "open_debt") {
    subtitle = `₪${(action.meta.amount as number).toLocaleString()} · ${action.meta.days} ימים`;
  } else if (action.type === "completed_today") {
    subtitle = (action.meta.type as string) || "עבודה הושלמה";
  } else if (action.type === "inactive_customer") {
    subtitle = `${action.meta.daysSince} ימים מאז ביקור אחרון`;
  }

  return (
    <div className="bg-white rounded-xl px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">{action.customerName}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onSend}
          disabled={!hasPhone}
          className={`flex items-center gap-1 text-white text-xs font-semibold px-3 py-1.5 rounded-lg ${hasPhone ? "bg-green-500 hover:bg-green-600" : "bg-gray-300 cursor-not-allowed"}`}
        >
          <MessageSquare size={12} />
          {hasPhone ? "שלח" : "אין טלפון"}
        </button>
        <button
          onClick={onDismiss}
          title="התעלם להיום"
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
