"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Plus, ChevronRight, Loader2, Search, Trash2, Calendar, User as UserIcon, MessageSquare, Eye, Edit3,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface Quote {
  id: string;
  title: string;
  customer_name: string;
  customer_phone: string | null;
  status: "draft" | "sent" | "accepted" | "rejected";
  total_with_vat: number;
  markup_percent: number;
  valid_until: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<Quote["status"], { label: string; bg: string; text: string }> = {
  draft:    { label: "טיוטה",  bg: "bg-purple-100", text: "text-purple-700" },
  sent:     { label: "נשלחה",  bg: "bg-blue-100",   text: "text-blue-700" },
  accepted: { label: "אושרה",  bg: "bg-green-100",  text: "text-green-700" },
  rejected: { label: "נדחתה",  bg: "bg-red-100",    text: "text-red-700" },
};

function fmt(n: number) {
  return `₪${Math.round(n).toLocaleString("he-IL")}`;
}

function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function QuotesListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | Quote["status"]>("all");

  useEffect(() => {
    fetchQuotes();
  }, []);

  async function fetchQuotes() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("quotes")
      .select("id, title, customer_name, customer_phone, status, total_with_vat, markup_percent, valid_until, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setQuotes(data as Quote[]);
    setLoading(false);
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`למחוק את ההצעה "${title}"?`)) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("quotes").delete().eq("id", id).eq("user_id", user.id);
    setQuotes(prev => prev.filter(q => q.id !== id));
  }

  // Filtered quotes
  const filtered = quotes.filter(q => {
    if (activeFilter !== "all" && q.status !== activeFilter) return false;
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

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <div className="px-4 py-5 max-w-4xl mx-auto space-y-4 pb-24">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-100">
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">הצעות מחיר</h1>
              <p className="text-xs text-gray-500">{quotes.length} הצעות סה״כ</p>
            </div>
          </div>
          <button onClick={() => router.push("/quote/new")}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm">
            <Plus size={16} /> הצעה חדשה
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3">
            <p className="text-2xl font-black text-purple-700">{totals.draft}</p>
            <p className="text-xs text-purple-600 font-medium mt-0.5">טיוטות</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3">
            <p className="text-2xl font-black text-blue-700">{totals.sent}</p>
            <p className="text-xs text-blue-600 font-medium mt-0.5">נשלחו · {fmt(totalSent)}</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-2xl p-3">
            <p className="text-2xl font-black text-green-700">{totals.accepted}</p>
            <p className="text-xs text-green-600 font-medium mt-0.5">אושרו · {fmt(totalAccepted)}</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-3">
            <p className="text-2xl font-black text-red-700">{totals.rejected}</p>
            <p className="text-xs text-red-600 font-medium mt-0.5">נדחו</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-3 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חפש לפי כותרת או לקוח..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {([
              { k: "all" as const, l: "הכל" },
              { k: "draft" as const, l: "טיוטות" },
              { k: "sent" as const, l: "נשלחו" },
              { k: "accepted" as const, l: "אושרו" },
              { k: "rejected" as const, l: "נדחו" },
            ]).map(({ k, l }) => (
              <button key={k} onClick={() => setActiveFilter(k)}
                className={`text-xs px-3 py-1.5 rounded-xl whitespace-nowrap font-semibold transition-colors ${activeFilter === k ? "bg-green-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}>
                {l} ({k === "all" ? totals.all : totals[k]})
              </button>
            ))}
          </div>
        </div>

        {/* Quotes list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
            <FileText size={40} className="mx-auto text-gray-300 mb-3" />
            <h3 className="font-bold text-gray-900">אין הצעות מחיר עדיין</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">צור את הצעת המחיר הראשונה שלך</p>
            <button onClick={() => router.push("/quote/new")}
              className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl">
              <Plus size={16} /> הצעה חדשה
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(q => {
              const status = STATUS_CONFIG[q.status];
              return (
                <div key={q.id} className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 text-base">{q.title || "ללא כותרת"}</h3>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                          {status.label}
                        </span>
                        {q.markup_percent > 0 && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            +{q.markup_percent}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1"><UserIcon size={11} />{q.customer_name}</span>
                        <span className="flex items-center gap-1"><Calendar size={11} />{formatDate(q.created_at)}</span>
                        {q.valid_until && <span className="text-amber-600">תקף עד: {formatDate(q.valid_until)}</span>}
                      </div>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <p className="text-lg font-black text-green-700">{fmt(q.total_with_vat)}</p>
                      <p className="text-[10px] text-gray-400">כולל מע״מ</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                    <button onClick={() => router.push(`/quote/${q.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-semibold py-2 rounded-xl hover:bg-blue-100">
                      <Eye size={13} /> צפייה
                    </button>
                    <button onClick={() => router.push(`/quote/${q.id}/edit`)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-purple-50 text-purple-700 text-xs font-semibold py-2 rounded-xl hover:bg-purple-100">
                      <Edit3 size={13} /> {q.status === "draft" ? "ערוך טיוטה" : "ערוך"}
                    </button>
                    {q.customer_phone && (
                      <a href={`https://api.whatsapp.com/send?phone=${(() => {
                        const cleaned = (q.customer_phone || "").replace(/\D/g, "");
                        if (cleaned.startsWith("0")) return "972" + cleaned.slice(1);
                        if (cleaned.startsWith("972")) return cleaned;
                        return cleaned;
                      })()}`} target="_blank" rel="noreferrer"
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500 hover:bg-green-600 text-white" title="WhatsApp">
                        <MessageSquare size={13} />
                      </a>
                    )}
                    <button onClick={() => handleDelete(q.id, q.title)}
                      className="flex items-center justify-center w-8 h-8 rounded-lg border border-red-200 text-red-400 hover:bg-red-50" title="מחק">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
