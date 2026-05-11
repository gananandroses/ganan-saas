"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import { toast, confirmDialog } from "@/components/Toaster";
import { supabase } from "@/lib/supabase/client";
import { pendingMissedVisits } from "@/lib/missed-visits";
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

type ActionType = "tomorrow_visit" | "open_debt" | "completed_today" | "inactive_customer" | "missed_visit";

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
  cancellation_reason?: string | null;
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
// Templates per action type — with editable placeholders
// ─────────────────────────────────────────────────────────────

const DEFAULT_TEMPLATES: Record<ActionType, string> = {
  tomorrow_visit:
    "שלום {name},\nאנחנו מגיעים אליך מחר בשעה {time} ל{type}.\nיש שינוי או הערה? נשמח לדעת מראש 🌿\n\n{businessName}",
  open_debt:
    "שלום {name},\nיש לך תשלום פתוח של ₪{amount} עבור {description} ({days} ימים).\nנשמח לסידור התשלום 🌿{paymentBlock}\n\n{businessName}",
  completed_today:
    "שלום {name},\nסיימנו את {type} היום. תודה שבחרתם בנו! 🌿\nאם הכל מצא חן בעיניך — נשמח לדירוג / המלצה.{paymentBlock}\n\n{businessName}",
  inactive_customer:
    "שלום {name},\nמזמן לא נפגשנו! עברו {days} ימים מאז הביקור האחרון.\nרוצה לקבוע ביקור או טיפול עונתי? כתוב לי כאן 🌸\n\n{businessName}",
  missed_visit:
    "שלום {name},\nהביקור המתוכנן ב-{date} לא יצא לפועל ({reason}).\nמתי נוח לך לתאם תאריך חדש? 📅\n\n{businessName}",
};

const TEMPLATE_KEY_PREFIX = "automation_template_";

function loadTemplate(type: ActionType): string {
  if (typeof window === "undefined") return DEFAULT_TEMPLATES[type];
  const stored = localStorage.getItem(TEMPLATE_KEY_PREFIX + type);
  return stored || DEFAULT_TEMPLATES[type];
}

function saveTemplate(type: ActionType, template: string) {
  if (typeof window === "undefined") return;
  if (template === DEFAULT_TEMPLATES[type]) {
    localStorage.removeItem(TEMPLATE_KEY_PREFIX + type);
  } else {
    localStorage.setItem(TEMPLATE_KEY_PREFIX + type, template);
  }
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, val] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${key}\\}`, "g"), val);
  }
  // Clean up empty placeholders that weren't filled
  out = out.replace(/\{[a-zA-Z]+\}/g, "");
  // Clean up double newlines from empty business name
  out = out.replace(/\n{3,}/g, "\n\n").trim();
  return out;
}

function buildTomorrowVisitMsg(name: string, time: string, type: string, businessName: string): string {
  return applyTemplate(loadTemplate("tomorrow_visit"), {
    name,
    time: time || "",
    type: type || "ביקור",
    businessName: businessName || "",
  });
}

function buildDebtReminderMsg(name: string, amount: number, description: string, days: number, settings: PaymentSettings): string {
  return applyTemplate(loadTemplate("open_debt"), {
    name,
    amount: amount.toLocaleString(),
    description: description || "שירותי גינון",
    days: String(days),
    paymentBlock: buildPaymentBlock(settings),
    businessName: settings.businessName || "",
  });
}

function buildCompletedTodayMsg(name: string, type: string, settings: PaymentSettings): string {
  return applyTemplate(loadTemplate("completed_today"), {
    name,
    type: type || "העבודה",
    paymentBlock: buildPaymentBlock(settings),
    businessName: settings.businessName || "",
  });
}

function buildInactiveCustomerMsg(name: string, daysSince: number, businessName: string): string {
  return applyTemplate(loadTemplate("inactive_customer"), {
    name,
    days: String(daysSince),
    businessName: businessName || "",
  });
}

function buildMissedVisitMsg(name: string, date: string, reasonLabel: string, businessName: string): string {
  return applyTemplate(loadTemplate("missed_visit"), {
    name,
    date: date || "",
    reason: reasonLabel || "ביטול",
    businessName: businessName || "",
  });
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

  // Wizard state — for "send all" sequential flow
  const [wizard, setWizard] = useState<null | { actions: ActionItem[]; index: number; editedMessage: string }>(null);

  // Templates editor state
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<Record<ActionType, string>>({
    tomorrow_visit: DEFAULT_TEMPLATES.tomorrow_visit,
    open_debt: DEFAULT_TEMPLATES.open_debt,
    completed_today: DEFAULT_TEMPLATES.completed_today,
    inactive_customer: DEFAULT_TEMPLATES.inactive_customer,
    missed_visit: DEFAULT_TEMPLATES.missed_visit,
  });
  const [templateRefresh, setTemplateRefresh] = useState(0); // bump to re-render actions

  function openTemplatesEditor() {
    setTemplates({
      tomorrow_visit: loadTemplate("tomorrow_visit"),
      open_debt: loadTemplate("open_debt"),
      completed_today: loadTemplate("completed_today"),
      inactive_customer: loadTemplate("inactive_customer"),
      missed_visit: loadTemplate("missed_visit"),
    });
    setShowTemplates(true);
  }

  function saveAllTemplates() {
    (Object.keys(templates) as ActionType[]).forEach(type => {
      saveTemplate(type, templates[type]);
    });
    setShowTemplates(false);
    setTemplateRefresh(n => n + 1); // trigger recompute
  }

  function resetTemplate(type: ActionType) {
    setTemplates(prev => ({ ...prev, [type]: DEFAULT_TEMPLATES[type] }));
  }

  // Section collapse state
  const [collapsed, setCollapsed] = useState<Record<ActionType, boolean>>({
    tomorrow_visit: false,
    open_debt: false,
    completed_today: false,
    inactive_customer: false,
    missed_visit: false,
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
      supabase.from("jobs").select("id, customer_id, customer_name, job_date, job_time, status, type, address, price, price_before_vat, cancellation_reason").eq("user_id", user.id),
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

    // 5) Missed visits — single source of truth in lib/missed-visits.ts.
    const missedVisits: ActionItem[] = pendingMissedVisits(jobs)
      .sort((a, b) => (b.job_date || "").localeCompare(a.job_date || ""))
      .map(j => {
        const c = findCustomer(j.customer_id, j.customer_name);
        const reasonLabel = j.cancellation_reason === "no_show" ? "לקוח לא הופיע" : "בלת״מ";
        return {
          id: `missed:${j.id}`,
          type: "missed_visit" as ActionType,
          customerId: c?.id ?? "",
          customerName: j.customer_name,
          phone: c?.phone ?? "",
          meta: { date: j.job_date ?? "", reasonLabel, reason: j.cancellation_reason ?? "" },
          message: buildMissedVisitMsg(j.customer_name, j.job_date ?? "", reasonLabel, settings.businessName),
        };
      });

    items.push({ type: "missed_visit", list: missedVisits });
    items.push({ type: "tomorrow_visit", list: tomorrowVisits });
    items.push({ type: "open_debt", list: openDebts });
    items.push({ type: "completed_today", list: completedToday });
    items.push({ type: "inactive_customer", list: inactive });

    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, transactions, customers, settings, templateRefresh]);

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
      toast.error(`לא נמצא טלפון ללקוח "${action.customerName}".`, "ודא שהלקוח רשום ב-CRM עם טלפון תקין.");
      return;
    }
    // Rebuild message fresh from action's own data — defensively per-click
    // (not from memoized action.message which could be stale)
    const freshMessage = rebuildMessage(action);
    setWaModal({ phone: intl, message: freshMessage, actionId: action.id });
  }

  // Rebuild message fresh from action's own data — defensively per click
  function rebuildMessage(action: ActionItem): string {
    switch (action.type) {
      case "tomorrow_visit":
        return buildTomorrowVisitMsg(
          action.customerName,
          (action.meta.time as string) || "",
          (action.meta.type as string) || "",
          settings.businessName
        );
      case "open_debt":
        return buildDebtReminderMsg(
          action.customerName,
          action.meta.amount as number,
          (action.meta.description as string) || "",
          action.meta.days as number,
          settings
        );
      case "completed_today":
        return buildCompletedTodayMsg(
          action.customerName,
          (action.meta.type as string) || "",
          settings
        );
      case "inactive_customer":
        return buildInactiveCustomerMsg(
          action.customerName,
          action.meta.daysSince as number,
          settings.businessName
        );
      case "missed_visit":
        return buildMissedVisitMsg(
          action.customerName,
          (action.meta.date as string) || "",
          (action.meta.reasonLabel as string) || "ביטול",
          settings.businessName
        );
      default:
        return action.message;
    }
  }

  function confirmSend() {
    if (!waModal) return;
    const url = `https://api.whatsapp.com/send?phone=${waModal.phone}&text=${encodeURIComponent(waModal.message)}`;
    window.open(url, "_blank");
    dismissAction(waModal.actionId);
    setWaModal(null);
  }

  // ─── Wizard (send all) ─────────────────────────────────────────
  function startWizard() {
    const allActions = visibleActions.flatMap(g => g.list).filter(a => !!normalizePhone(a.phone));
    if (allActions.length === 0) {
      toast.info("אין פעולות זמינות לשליחה (רק ללקוחות עם טלפון רשום).");
      return;
    }
    setWizard({ actions: allActions, index: 0, editedMessage: rebuildMessage(allActions[0]) });
  }

  function wizardSendAndAdvance() {
    if (!wizard) return;
    const current = wizard.actions[wizard.index];
    const intl = normalizePhone(current.phone);
    const url = `https://api.whatsapp.com/send?phone=${intl}&text=${encodeURIComponent(wizard.editedMessage)}`;
    window.open(url, "_blank");
    dismissAction(current.id);
    advanceWizard();
  }

  function advanceWizard() {
    if (!wizard) return;
    const nextIdx = wizard.index + 1;
    if (nextIdx >= wizard.actions.length) {
      setWizard(null); // done
    } else {
      setWizard({ actions: wizard.actions, index: nextIdx, editedMessage: rebuildMessage(wizard.actions[nextIdx]) });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────

  // Sections used to live in five different colored cards (red / blue /
  // amber / green / pink). All neutral now — the title carries the urgency,
  // not the entire surface. Only "missed_visit" keeps a soft tinted icon
  // chip because that's the truly urgent category.
  const sectionConfig: Record<ActionType, { title: string; icon: React.ReactNode; iconBg: string; iconColor: string; emptyText: string }> = {
    missed_visit: {
      title: "דרושים תיאום מחדש",
      icon: <Calendar size={16} />,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
      emptyText: "אין ביקורים שצריכים תיאום מחדש",
    },
    tomorrow_visit: {
      title: "ביקורים מחר",
      icon: <Calendar size={16} />,
      iconBg: "bg-gray-50",
      iconColor: "text-gray-500",
      emptyText: "אין ביקורים מתוזמנים למחר",
    },
    open_debt: {
      title: `חובות פתוחים (מעל ${DEBT_THRESHOLD_DAYS} ימים)`,
      icon: <CreditCard size={16} />,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
      emptyText: "אין חובות פתוחים מעבר לסף",
    },
    completed_today: {
      title: "עבודות שהושלמו היום",
      icon: <CheckCircle2 size={16} />,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-500",
      emptyText: "טרם הושלמו עבודות היום",
    },
    inactive_customer: {
      title: `לקוחות לא פעילים (${INACTIVE_THRESHOLD_DAYS}+ ימים)`,
      icon: <Sparkles size={16} />,
      iconBg: "bg-gray-50",
      iconColor: "text-gray-500",
      emptyText: "כל הלקוחות פעילים",
    },
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#F7F8FA]">
      <Header title="אוטומציות" subtitle="תור פעולות יומי — לחץ לבצע" showBack />

      <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-4 max-w-4xl mx-auto">

        {/* ── Hero — single white card. The previous violet→indigo gradient
              was loud relative to the rest of the app's quiet palette.
              Now: white card, gray icon chip, gray-900 brand CTA. ── */}
        <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                <Inbox size={20} className="text-gray-500" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">תור פעולות היום</h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  {loading ? "טוען..." : totalPending > 0 ? `${totalPending} פעולות ממתינות` : "אין פעולות ממתינות 🎉"}
                </p>
              </div>
            </div>
            <div className="text-left flex-shrink-0">
              <p className="text-3xl sm:text-4xl font-black text-gray-900 tabular-nums">{totalPending}</p>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">לטיפול</p>
            </div>
          </div>

          {!loading && (
            <div className="flex gap-2">
              {totalPending > 0 && (
                <button
                  onClick={startWizard}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-2xl py-3 text-sm shadow-sm transition-colors"
                >
                  <MessageSquare size={16} />
                  שלח לכולם — אשף ({totalPending})
                </button>
              )}
              <button
                onClick={openTemplatesEditor}
                title="ערוך תבניות הודעה"
                className="flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 font-semibold rounded-2xl px-4 py-3 text-sm transition-colors"
              >
                ערוך תבניות
              </button>
            </div>
          )}
        </div>

        {/* ── Sections — all white cards, hairline border, gray icon chip
              (except missed_visit which keeps a soft red icon chip since
              that's the genuinely urgent bucket). Section header carries
              the urgency, not the entire surface. ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-gray-300" />
          </div>
        ) : (
          visibleActions.map(({ type, list }) => {
            const cfg = sectionConfig[type];
            const isCollapsed = collapsed[type];
            return (
              <div key={type} className="bg-white border border-gray-100 rounded-3xl overflow-hidden">
                <button
                  onClick={() => setCollapsed(p => ({ ...p, [type]: !p[type] }))}
                  className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.iconBg} ${cfg.iconColor}`}>
                      {cfg.icon}
                    </div>
                    <div className="text-right min-w-0">
                      <h2 className="font-bold text-sm text-gray-900 truncate">{cfg.title}</h2>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {list.length === 0 ? cfg.emptyText : `${list.length} פעולות`}
                      </p>
                    </div>
                  </div>
                  {isCollapsed ? <ChevronDown size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />}
                </button>

                {!isCollapsed && (
                  <div className="px-5 pb-4 space-y-2 border-t border-gray-100 pt-3">
                    {list.length === 0 ? (
                      <div className="bg-gray-50 rounded-xl px-4 py-3 text-center text-xs text-gray-500">
                        {cfg.emptyText}
                      </div>
                    ) : (
                      list.map(action => (
                        <ActionRow key={action.id} action={action} onSend={() => openSend(action)} onDismiss={() => dismissAction(action.id)} />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {!loading && totalPending === 0 && (
          <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center">
            <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-3" />
            <h3 className="font-bold text-gray-900">הכל מסודר</h3>
            <p className="text-xs text-gray-500 mt-1">כשיהיו פעולות ממתינות הן יופיעו כאן</p>
          </div>
        )}
      </div>

      {/* Wizard Modal — Send All */}
      {wizard && (() => {
        const current = wizard.actions[wizard.index];
        const total = wizard.actions.length;
        const progress = ((wizard.index + 1) / total) * 100;
        const sectionLabel = sectionConfig[current.type].title;
        return (
          <div className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && setWizard(null)}>
            <div className="bg-white w-full sm:max-w-md sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh]" dir="rtl">
              {/* Progress bar */}
              <div className="h-1.5 bg-gray-100 rounded-t-3xl overflow-hidden flex-shrink-0">
                <div className="h-full bg-gray-900 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>

              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <div>
                  <p className="text-xs text-gray-500 font-semibold tabular-nums">אשף שליחה · {wizard.index + 1} מתוך {total}</p>
                  <h2 className="text-base font-bold text-gray-900 mt-0.5">{current.customerName}</h2>
                  <p className="text-xs text-gray-400">{sectionLabel}</p>
                </div>
                <button onClick={() => setWizard(null)} aria-label="סגור" className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">הודעה</label>
                  <textarea
                    rows={9}
                    autoComplete="off"
                    value={wizard.editedMessage}
                    onChange={(e) => setWizard({ ...wizard, editedMessage: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
                  />
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-gray-600 leading-relaxed">
                  💡 לחיצה על &quot;פתח ב-WhatsApp&quot; תפתח טאב עם השיחה. שלח שם, וחזור לכאן ולחץ על &quot;הבא&quot;. כל הודעה נשלחת בנפרד כדי לא לעורר חסימת דפדפן.
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0 space-y-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <button
                  onClick={wizardSendAndAdvance}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors"
                >
                  <MessageSquare size={16} />
                  פתח ב-WhatsApp ועבור להבא
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={advanceWizard}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50"
                  >
                    דלג ←
                  </button>
                  <button
                    onClick={() => setWizard(null)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50"
                  >
                    סיים אשף
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Templates Editor Modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && setShowTemplates(false)}>
          <div className="bg-white w-full sm:max-w-2xl sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh]" dir="rtl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900">עריכת תבניות הודעה</h2>
                <p className="text-xs text-gray-500 mt-0.5">השינויים יחולו על כל ההודעות העתידיות</p>
              </div>
              <button onClick={() => setShowTemplates(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              {/* Variables help */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-gray-700 space-y-1">
                <p className="font-semibold">💡 משתנים זמינים בתבניות (יוחלפו אוטומטית בכל לקוח):</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 mt-1.5 font-mono text-[11px]">
                  <span><code className="bg-white px-1 rounded">{"{name}"}</code> — שם לקוח</span>
                  <span><code className="bg-white px-1 rounded">{"{time}"}</code> — שעת ביקור</span>
                  <span><code className="bg-white px-1 rounded">{"{type}"}</code> — סוג עבודה</span>
                  <span><code className="bg-white px-1 rounded">{"{amount}"}</code> — סכום</span>
                  <span><code className="bg-white px-1 rounded">{"{description}"}</code> — תיאור</span>
                  <span><code className="bg-white px-1 rounded">{"{days}"}</code> — מספר ימים</span>
                  <span><code className="bg-white px-1 rounded">{"{paymentBlock}"}</code> — פרטי תשלום</span>
                  <span><code className="bg-white px-1 rounded">{"{businessName}"}</code> — שם העסק</span>
                </div>
              </div>

              {/* Templates */}
              {([
                { type: "tomorrow_visit" as ActionType, title: "📅 תזכורת ביקור מחר", color: "blue" },
                { type: "open_debt" as ActionType, title: "💰 תזכורת תשלום (חוב פתוח)", color: "amber" },
                { type: "completed_today" as ActionType, title: "✅ סיכום עבודה שהושלמה", color: "green" },
                { type: "inactive_customer" as ActionType, title: "🌸 לקוח לא פעיל", color: "pink" },
                { type: "missed_visit" as ActionType, title: "🔥 תיאום מחדש (לא הופיע / בלת״מ)", color: "red" },
              ]).map(({ type, title }) => {
                const isCustom = templates[type] !== DEFAULT_TEMPLATES[type];
                return (
                  <div key={type} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-gray-800">{title}</label>
                      {isCustom && (
                        <button
                          onClick={() => resetTemplate(type)}
                          className="text-xs text-gray-500 hover:text-red-600 font-medium"
                        >
                          איפוס לברירת מחדל ↺
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={6}
                      autoComplete="off"
                      value={templates[type]}
                      onChange={(e) => setTemplates(p => ({ ...p, [type]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none font-normal"
                    />
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0 flex gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button onClick={() => setShowTemplates(false)} className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors">
                ביטול
              </button>
              <button onClick={saveAllTemplates} className="flex-[2] py-3 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold transition-colors">
                שמור תבניות
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {waModal && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && setWaModal(null)}>
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
                autoComplete="off"
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
  } else if (action.type === "missed_visit") {
    subtitle = `${action.meta.reasonLabel} · ${action.meta.date}`;
  }

  return (
    <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between gap-3 border border-gray-100">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">{action.customerName}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onSend}
          disabled={!hasPhone}
          className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
            hasPhone
              ? "bg-emerald-500 hover:bg-emerald-600 text-white"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          <MessageSquare size={12} />
          {hasPhone ? "שלח" : "אין טלפון"}
        </button>
        <button
          onClick={onDismiss}
          title="התעלם להיום"
          className="hit-44 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
