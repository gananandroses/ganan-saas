"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";

import { supabase } from "@/lib/supabase/client";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  MessageSquare,
  Plus,
  X,
  ChevronDown,
  Printer,
  Send,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

type TabKey = "all" | "income" | "expense" | "pending";

type PaymentStatus = "paid" | "pending" | "overdue";

interface Transaction {
  id: string;
  date: string;
  customerId: string;
  customerName: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  status: PaymentStatus;
  method: "cash" | "credit" | "bit" | "transfer";
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SERVICES = [
  { id: "s1", label: "כיסוח דשא", price: 150 },
  { id: "s2", label: "גיזום עצים / שיחים", price: 200 },
  { id: "s3", label: "שתילה", price: 300 },
  { id: "s4", label: "השקיה + תחזוקה", price: 180 },
  { id: "s5", label: "ריסוס", price: 120 },
  { id: "s6", label: "תכנון גינה", price: 500 },
  { id: "s7", label: "תאורת גינה", price: 350 },
  { id: "s8", label: "עיצוב נוף", price: 800 },
];

const METHOD_LABELS: Record<string, string> = {
  cash: "מזומן",
  credit: "אשראי",
  bit: "ביט",
  transfer: "העברה",
};

const METHOD_COLORS: Record<string, string> = {
  cash: "bg-green-100 text-green-700",
  credit: "bg-blue-100 text-blue-700",
  bit: "bg-purple-100 text-purple-700",
  transfer: "bg-gray-100 text-gray-700",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  highlight?: string;
  sub?: string;
}

function KpiCard({ icon, iconBg, label, value, highlight, sub }: KpiCardProps) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm p-5 border flex flex-col gap-2 ${highlight ?? "border-gray-100"}`}>
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-400 border-t border-gray-50 pt-1.5">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  if (status === "paid")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
        <CheckCircle size={11} /> שולם
      </span>
    );
  if (status === "pending")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
        <Clock size={11} /> ממתין
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
      <XCircle size={11} /> פגה תוקף
    </span>
  );
}

// Custom tooltip for charts
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-sm" dir="rtl">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name === "income" ? "הכנסות" : "הוצאות"}: ₪{p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// ─── New Transaction Modal ────────────────────────────────────────────────────

interface NewTransactionModalProps {
  onClose: () => void;
  onSaved: () => void;
}

function NewTransactionModal({ onClose, onSaved }: NewTransactionModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    amount: "",
    description: "",
    method: "cash" as "cash" | "credit" | "bit" | "transfer",
  });

  const handleSubmit = async () => {
    if (!form.customer_name || !form.amount) return;
    setSaving(true);
    await supabase.from("transactions").insert({
      customer_name: form.customer_name,
      type: "income",
      amount: parseFloat(form.amount),
      description: form.description,
      method: form.method,
      status: "pending",
      transaction_date: new Date().toISOString().split("T")[0],
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-md sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col" style={{maxHeight: '92dvh'}} dir="rtl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
              <Plus size={16} className="text-green-600" />
            </div>
            <h2 className="text-base font-bold text-gray-900">תנועה חדשה</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable fields */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">שם לקוח</label>
            <input type="text"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="שם הלקוח..."
              value={form.customer_name}
              onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">סכום (₪)</label>
            <input type="number"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="0"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">תיאור</label>
            <input type="text"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="תיאור השירות..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">אמצעי תשלום</label>
            <div className="relative">
              <select
                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-300"
                value={form.method}
                onChange={(e) => setForm((f) => ({ ...f, method: e.target.value as "cash" | "credit" | "bit" | "transfer" }))}
              >
                <option value="cash">מזומן</option>
                <option value="credit">אשראי</option>
                <option value="bit">ביט</option>
                <option value="transfer">העברה</option>
              </select>
              <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Sticky buttons */}
        <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0 bg-white flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-600">
            ביטול
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.customer_name || !form.amount}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {saving ? "שומר..." : "שמור"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Invoice Generator Panel ──────────────────────────────────────────────────

interface InvoiceState {
  customerId: string;
  selectedServices: string[];
  extraAmount: string;
  note: string;
}

function InvoicePanel({ onClose, customers }: { onClose: () => void; customers: {id: string; name: string; city: string; phone: string}[] }) {
  const [step, setStep] = useState<"form" | "preview">("form");
  const [form, setForm] = useState<InvoiceState>({
    customerId: "",
    selectedServices: [],
    extraAmount: "",
    note: "",
  });

  const selectedCustomer = customers.find((c) => c.id === form.customerId);
  const servicesTotal = SERVICES.filter((s) => form.selectedServices.includes(s.id)).reduce(
    (sum, s) => sum + s.price,
    0
  );
  const extra = parseFloat(form.extraAmount) || 0;
  const total = servicesTotal + extra;

  const toggleService = (id: string) => {
    setForm((f) => ({
      ...f,
      selectedServices: f.selectedServices.includes(id)
        ? f.selectedServices.filter((s) => s !== id)
        : [...f.selectedServices, id],
    }));
  };

  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(
    Math.floor(Math.random() * 900) + 100
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        {/* Panel header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <FileText size={18} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {step === "form" ? "הפקת חשבונית חדשה" : "תצוגה מקדימה"}
              </h2>
              <p className="text-xs text-gray-400">{invoiceNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100"
          >
            <X size={16} />
          </button>
        </div>

        {step === "form" ? (
          <div className="p-6 space-y-5">
            {/* Customer selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">לקוח</label>
              <div className="relative">
                <select
                  className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-300"
                  value={form.customerId}
                  onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
                >
                  <option value="">-- בחר לקוח --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.city}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Services checklist */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">שירותים</label>
              <div className="grid grid-cols-2 gap-2">
                {SERVICES.map((s) => {
                  const selected = form.selectedServices.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleService(s.id)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all ${
                        selected
                          ? "border-green-400 bg-green-50 text-green-800"
                          : "border-gray-200 bg-white text-gray-700 hover:border-green-200"
                      }`}
                    >
                      <span>{s.label}</span>
                      <span
                        className={`text-xs font-semibold ${selected ? "text-green-600" : "text-gray-400"}`}
                      >
                        ₪{s.price}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Extra amount */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">סכום נוסף (₪)</label>
                <input
                  type="number"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                  placeholder="0"
                  value={form.extraAmount}
                  onChange={(e) => setForm((f) => ({ ...f, extraAmount: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">סה&quot;כ</label>
                <div className="w-full bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm font-bold text-green-700">
                  ₪{total.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">הערה</label>
              <textarea
                rows={2}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-300"
                placeholder="הוסף הערה לחשבונית..."
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>

            <button
              onClick={() => {
                if (!form.customerId) return;
                setStep("preview");
              }}
              disabled={!form.customerId}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <FileText size={16} />
              הפק חשבונית
            </button>
          </div>
        ) : (
          /* ── Invoice Preview ── */
          <div className="p-6">
            <div className="border-2 border-gray-200 rounded-2xl overflow-hidden">
              {/* Invoice top */}
              <div className="bg-gradient-to-l from-green-600 to-green-700 text-white p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-bold">חשבונית</h3>
                    <p className="text-green-100 text-sm mt-0.5">{invoiceNumber}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-lg">גינן ירוק בע&quot;מ</p>
                    <p className="text-green-100 text-xs">שירותי גינון מקצועיים</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Details row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">לקוח</p>
                    <p className="font-semibold text-gray-900">{selectedCustomer?.name}</p>
                    <p className="text-xs text-gray-500">{selectedCustomer?.city}</p>
                    <p className="text-xs text-gray-500">{selectedCustomer?.phone}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-gray-400 mb-0.5">תאריך הפקה</p>
                    <p className="font-semibold text-gray-900">
                      {new Date().toLocaleDateString("he-IL")}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">תאריך תשלום</p>
                    <p className="text-xs font-semibold text-gray-700">
                      {new Date(Date.now() + 14 * 86400000).toLocaleDateString("he-IL")}
                    </p>
                  </div>
                </div>

                {/* Line items */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400">
                      <th className="text-right pb-2">שירות</th>
                      <th className="text-left pb-2">סכום</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SERVICES.filter((s) => form.selectedServices.includes(s.id)).map((s) => (
                      <tr key={s.id} className="border-b border-gray-50">
                        <td className="py-2 text-gray-700">{s.label}</td>
                        <td className="py-2 text-left font-medium text-gray-900">
                          ₪{s.price.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {extra > 0 && (
                      <tr className="border-b border-gray-50">
                        <td className="py-2 text-gray-700">סכום נוסף</td>
                        <td className="py-2 text-left font-medium text-gray-900">
                          ₪{extra.toLocaleString()}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="pt-3 font-bold text-gray-900">סה&quot;כ לתשלום</td>
                      <td className="pt-3 text-left font-bold text-green-700 text-lg">
                        ₪{total.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {form.note && (
                  <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600">
                    <span className="font-semibold">הערה: </span>
                    {form.note}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  <button className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                    <Send size={15} /> שלח ללקוח
                  </button>
                  <button className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                    <Printer size={15} /> הדפס
                  </button>
                  <button
                    onClick={() => setStep("form")}
                    className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
                  >
                    <X size={15} /> ערוך
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [showInvoice, setShowInvoice] = useState(false);
  const [showNewTransaction, setShowNewTransaction] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbCustomers, setDbCustomers] = useState<{id: string; name: string; city: string; phone: string}[]>([]);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .order("transaction_date", { ascending: false });

    if (data) {
      const mapped: Transaction[] = data.map((row) => ({
        id: String(row.id),
        date: row.transaction_date ?? "",
        customerId: String(row.customer_id ?? ""),
        customerName: row.customer_name ?? "",
        type: row.type as "income" | "expense",
        amount: Number(row.amount),
        description: row.description ?? "",
        status: (row.status as PaymentStatus) ?? "pending",
        method: (row.method as "cash" | "credit" | "bit" | "transfer") ?? "cash",
      }));
      setTransactions(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
    supabase.from("customers").select("id, name, city, phone").order("name").then(({data}) => {
      if (data) setDbCustomers(data.map(c => ({id: String(c.id), name: String(c.name), city: String(c.city||''), phone: String(c.phone||'')})));
    });
  }, []);

  // Chart data from real transactions
  const chartData = Array.from({length: 6}, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5 + i);
    const month = d.toISOString().slice(0, 7);
    const label = new Date(month + "-01").toLocaleDateString("he-IL", { month: "short" });
    const income = transactions.filter(t => t.type === "income" && t.date.startsWith(month)).reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === "expense" && t.date.startsWith(month)).reduce((s, t) => s + t.amount, 0);
    return { month: label, income, expense };
  });

  // Filtered transactions
  const filteredTx = transactions.filter((t) => {
    if (activeTab === "income") return t.type === "income";
    if (activeTab === "expense") return t.type === "expense";
    if (activeTab === "pending")
      return t.status === "pending" || t.status === "overdue";
    return true;
  });

  // Overdue / pending payments
  const alerts = transactions.filter(
    (t) => t.type === "income" && (t.status === "pending" || t.status === "overdue")
  );

  // Top 5 customers by revenue
  const customerRevenueMap: Record<string, { name: string; total: number }> = {};
  transactions
    .filter((t) => t.type === "income")
    .forEach((t) => {
      if (!customerRevenueMap[t.customerName]) {
        customerRevenueMap[t.customerName] = { name: t.customerName, total: 0 };
      }
      customerRevenueMap[t.customerName].total += t.amount;
    });
  const customerRevenue = Object.values(customerRevenueMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  const maxCustomerRevenue = Math.max(...customerRevenue.map((c) => c.total), 1);

  // KPI calculations
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const netProfit = totalIncome - totalExpense;
  const openDebt = transactions
    .filter((t) => t.type === "income" && (t.status === "pending" || t.status === "overdue"))
    .reduce((s, t) => s + t.amount, 0);

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "all", label: "הכל", count: transactions.length },
    {
      key: "income",
      label: "הכנסות",
      count: transactions.filter((t) => t.type === "income").length,
    },
    {
      key: "expense",
      label: "הוצאות",
      count: transactions.filter((t) => t.type === "expense").length,
    },
    { key: "pending", label: "ממתינים", count: alerts.length },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <Header title="פיננסים וחיובים" subtitle="ניהול הכנסות, הוצאות וחשבוניות" />

      {showInvoice && <InvoicePanel onClose={() => setShowInvoice(false)} customers={dbCustomers} />}
      {showNewTransaction && (
        <NewTransactionModal
          onClose={() => setShowNewTransaction(false)}
          onSaved={fetchTransactions}
        />
      )}

      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">

        {/* ── Page title row ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">פיננסים וחיובים</h1>
            <p className="text-sm text-gray-500 mt-0.5">אפריל 2026</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewTransaction(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <Plus size={16} />
              חשבונית חדשה +
            </button>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            icon={<TrendingUp size={19} className="text-green-600" />}
            iconBg="bg-green-50"
            label="סה״כ הכנסות"
            value={`₪${totalIncome.toLocaleString()}`}
            sub="כל הזמנים"
          />
          <KpiCard
            icon={<TrendingDown size={19} className="text-orange-500" />}
            iconBg="bg-orange-50"
            label="סה״כ הוצאות"
            value={`₪${totalExpense.toLocaleString()}`}
            sub="ציוד + חומרים"
          />
          <KpiCard
            icon={<DollarSign size={19} className="text-blue-600" />}
            iconBg="bg-blue-50"
            label="רווח נקי"
            value={`₪${netProfit.toLocaleString()}`}
            highlight="border-green-200 ring-1 ring-green-100"
            sub={totalIncome > 0 ? `שולי רווח ${Math.round((netProfit / totalIncome) * 100)}%` : undefined}
          />
          <KpiCard
            icon={<AlertCircle size={19} className="text-red-500" />}
            iconBg="bg-red-50"
            label="חוב פתוח"
            value={`₪${openDebt.toLocaleString()}`}
            highlight="border-red-200 ring-1 ring-red-100"
            sub={`${alerts.length} לקוחות עם חוב פתוח`}
          />
        </div>

        {/* ── Charts row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Area chart — revenue over time */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-gray-900">הכנסות לאורך זמן</h2>
                <p className="text-xs text-gray-400 mt-0.5">6 חודשים אחרונים</p>
              </div>
              <span className="bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                ₪{totalIncome.toLocaleString()} סה&quot;כ
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`}
                  width={46}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#22c55e"
                  strokeWidth={2.5}
                  fill="url(#incomeGrad)"
                  dot={{ r: 4, fill: "#22c55e", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bar chart — income vs expenses */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-gray-900">הכנסות מול הוצאות</h2>
                <p className="text-xs text-gray-400 mt-0.5">השוואה חודשית</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                  הכנסות
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />
                  הוצאות
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`}
                  width={46}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  formatter={(value) => (value === "income" ? "הכנסות" : "הוצאות")}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                />
                <Bar
                  dataKey="income"
                  fill="#22c55e"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="expense"
                  fill="#fb923c"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Transactions table + side panels ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* Transactions table — spans 2 cols on xl */}
          <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

            {/* Tabs */}
            <div className="flex items-center gap-1 p-4 pb-0 border-b border-gray-100">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-t-xl border-b-2 transition-all ${
                    activeTab === tab.key
                      ? "border-green-500 text-green-700 bg-green-50/50"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        activeTab === tab.key
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={28} className="animate-spin text-green-500" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 text-xs">
                      <th className="text-right py-3 px-5 font-medium">תאריך</th>
                      <th className="text-right py-3 px-4 font-medium">לקוח</th>
                      <th className="text-right py-3 px-4 font-medium">תיאור</th>
                      <th className="text-right py-3 px-4 font-medium">סכום</th>
                      <th className="text-right py-3 px-4 font-medium">אמצעי תשלום</th>
                      <th className="text-right py-3 px-4 font-medium">סטטוס</th>
                      <th className="py-3 px-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredTx.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-5 text-gray-500 whitespace-nowrap">
                          {tx.date ? formatDate(tx.date) : "—"}
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-900 whitespace-nowrap">
                          {tx.customerName}
                        </td>
                        <td className="py-3 px-4 text-gray-500 max-w-[180px] truncate">
                          {tx.description}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`font-bold ${
                              tx.type === "income" ? "text-green-600" : "text-red-500"
                            }`}
                          >
                            {tx.type === "income" ? "+" : "-"}₪{tx.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              METHOD_COLORS[tx.method] ?? "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {METHOD_LABELS[tx.method] ?? tx.method}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={tx.status} />
                        </td>
                        <td className="py-3 px-4">
                          {tx.status === "pending" || tx.status === "overdue" ? (
                            <button
                              onClick={() => {
                                const c = dbCustomers.find(x => x.name === tx.customerName);
                                const num = c?.phone?.replace(/\D/g, "") || "";
                                const intl = num.startsWith("0") ? "972" + num.slice(1) : num;
                                const msg = encodeURIComponent(`שלום ${tx.customerName}, יש לך תשלום פתוח של ₪${tx.amount} עבור ${tx.description}. נשמח לסידור התשלום.`);
                                window.open(`https://wa.me/${intl}?text=${msg}`, "_blank");
                              }}
                              className="flex items-center gap-1 text-xs text-purple-600 font-semibold hover:text-purple-800 whitespace-nowrap">
                              <MessageSquare size={12} />
                              שלח תזכורת
                            </button>
                          ) : (
                            <button
                              onClick={() => setShowInvoice(true)}
                              className="flex items-center gap-1 text-xs text-gray-500 font-semibold hover:text-gray-700 whitespace-nowrap"
                            >
                              <FileText size={12} />
                              צור חשבונית
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredTx.length === 0 && (
                  <div className="py-12 text-center text-gray-400 text-sm">אין עסקאות להצגה</div>
                )}
              </div>
            )}
          </div>

          {/* Right column: alerts + customer stats */}
          <div className="flex flex-col gap-4">

            {/* Payment alerts */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                  <AlertCircle size={16} className="text-red-500" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">התראות תשלום</h2>
                  <p className="text-xs text-gray-400">{alerts.length} תשלומים פתוחים</p>
                </div>
              </div>

              <div className="space-y-3">
                {alerts.map((tx) => (
                  <div
                    key={tx.id}
                    className={`rounded-xl p-3.5 border ${
                      tx.status === "overdue"
                        ? "border-red-200 bg-red-50/50"
                        : "border-yellow-200 bg-yellow-50/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{tx.customerName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{tx.description}</p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-bold ${
                            tx.status === "overdue" ? "text-red-600" : "text-yellow-700"
                          }`}
                        >
                          ₪{tx.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{tx.date ? formatDate(tx.date) : "—"}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const c = dbCustomers.find(x => x.name === tx.customerName);
                        const num = c?.phone?.replace(/\D/g, "") || "";
                        const intl = num.startsWith("0") ? "972" + num.slice(1) : num;
                        const msg = encodeURIComponent(`שלום ${tx.customerName}, יש לך תשלום פתוח של ₪${tx.amount} עבור ${tx.description}. נשמח לסידור התשלום.`);
                        window.open(`https://wa.me/${intl}?text=${msg}`, "_blank");
                      }}
                      className="w-full flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
                      <MessageSquare size={12} />
                      שלח תזכורת WhatsApp
                    </button>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="py-6 text-center text-gray-400 text-xs">
                    <CheckCircle size={24} className="mx-auto mb-1.5 text-green-400" />
                    כל התשלומים עדכניים
                  </div>
                )}
              </div>
            </div>

            {/* Quick stats: top 5 customers by revenue */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <TrendingUp size={16} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">הכנסות לפי לקוח</h2>
                  <p className="text-xs text-gray-400">טופ 5 לקוחות</p>
                </div>
              </div>

              <div className="space-y-3">
                {customerRevenue.map((c, idx) => {
                  const pct = Math.round((c.total / maxCustomerRevenue) * 100);
                  const barColors = [
                    "bg-green-500",
                    "bg-blue-500",
                    "bg-purple-500",
                    "bg-orange-400",
                    "bg-pink-400",
                  ];
                  return (
                    <div key={c.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700 truncate max-w-[130px]">
                          {c.name}
                        </span>
                        <span className="text-xs font-bold text-gray-900">
                          ₪{c.total.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColors[idx] ?? "bg-gray-400"} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {customerRevenue.length === 0 && !loading && (
                  <p className="text-xs text-gray-400 text-center py-4">אין נתונים להצגה</p>
                )}
              </div>

              {/* Summary */}
              <div className="mt-4 pt-3 border-t border-gray-50 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "הכנסות", value: `₪${totalIncome.toLocaleString()}`, color: "text-green-600" },
                  { label: "הוצאות", value: `₪${totalExpense.toLocaleString()}`, color: "text-orange-500" },
                  { label: "רווח", value: `₪${netProfit.toLocaleString()}`, color: "text-blue-600" },
                ].map((s) => (
                  <div key={s.label}>
                    <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
