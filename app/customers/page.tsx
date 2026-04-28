"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Plus,
  Phone,
  MessageCircle,
  Navigation,
  X,
  RefreshCw,
  Star,
  Users,
  TrendingUp,
  Clock,
  CreditCard,
  MapPin,
  Mail,
  Calendar,
  Tag,
  FileText,
  History,
  DollarSign,
  StickyNote,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Pencil,
  Save,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Customer, CustomerStatus } from "@/lib/mock-data";

// ===== HELPERS =====

const statusConfig: Record<
  CustomerStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  vip: {
    label: "VIP",
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    dot: "bg-yellow-400",
  },
  active: {
    label: "פעיל",
    bg: "bg-green-100",
    text: "text-green-800",
    dot: "bg-green-500",
  },
  inactive: {
    label: "לא פעיל",
    bg: "bg-gray-100",
    text: "text-gray-600",
    dot: "bg-gray-400",
  },
  new: {
    label: "חדש",
    bg: "bg-blue-100",
    text: "text-blue-800",
    dot: "bg-blue-500",
  },
};

const tagColors = [
  "bg-green-100 text-green-700",
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
];

function getTagColor(tag: string, index: number) {
  return tagColors[index % tagColors.length];
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  return `₪${amount.toLocaleString("he-IL")}`;
}

// ===== STAT CARD =====

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  sub?: string;
}

function StatCard({ title, value, icon, accent, sub }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500">{title}</p>
        <p className="text-xl font-bold text-gray-800">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

// ===== CUSTOMER CARD =====

interface CustomerCardProps {
  customer: Customer;
  onClick: () => void;
}

function CustomerCard({ customer, onClick }: CustomerCardProps) {
  const status = statusConfig[customer.status];

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `tel:${customer.phone}`;
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const num = customer.phone.replace(/\D/g, "");
    const intl = num.startsWith("0") ? "972" + num.slice(1) : num;
    window.open(`https://wa.me/${intl}`, "_blank");
  };

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(
      `https://waze.com/ul?q=${encodeURIComponent(customer.address)}`,
      "_blank"
    );
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-green-200 transition-all cursor-pointer group relative"
    >
      {/* Status badge */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-gray-900 text-base group-hover:text-green-700 transition-colors">
            {customer.name}
          </h3>
          <div className="flex items-center gap-1 mt-0.5 text-gray-400 text-xs">
            <MapPin size={11} />
            <span>{customer.city}</span>
          </div>
        </div>
        <span
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>

      {/* Price & Frequency */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-green-700 font-bold text-lg">
          {formatCurrency(customer.monthlyPrice)}
          <span className="text-xs text-gray-400 font-normal mr-1">/חודש</span>
        </div>
        <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
          {customer.frequency}
        </span>
      </div>

      {/* Phone */}
      <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-3">
        <Phone size={12} />
        <span dir="ltr">{customer.phone}</span>
      </div>

      {/* Visit info */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="bg-gray-50 rounded-xl p-2">
          <p className="text-gray-400 mb-0.5">ביקור אחרון</p>
          <p className="text-gray-700 font-medium">{formatDate(customer.lastVisit)}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-2">
          <p className="text-gray-400 mb-0.5">ביקור הבא</p>
          <p className="text-green-700 font-medium">{formatDate(customer.nextVisit)}</p>
        </div>
      </div>

      {/* Balance badge */}
      {customer.balance > 0 && (
        <div className="flex items-center gap-1.5 mb-3 text-xs bg-red-50 text-red-700 px-2.5 py-1.5 rounded-xl">
          <AlertCircle size={12} />
          <span>חוב פתוח: {formatCurrency(customer.balance)}</span>
        </div>
      )}

      {/* Tags */}
      {customer.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {customer.tags.slice(0, 3).map((tag, i) => (
            <span
              key={tag}
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTagColor(tag, i)}`}
            >
              {tag}
            </span>
          ))}
          {customer.tags.length > 3 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">
              +{customer.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-2 pt-2 border-t border-gray-50">
        <button
          onClick={handleNavigate}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
        >
          <Navigation size={13} />
          <span>נווט</span>
        </button>
        <button
          onClick={handleCall}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs text-green-600 bg-green-50 hover:bg-green-100 transition-colors"
        >
          <Phone size={13} />
          <span>התקשר</span>
        </button>
        <button
          onClick={handleWhatsApp}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
        >
          <MessageCircle size={13} />
          <span>WhatsApp</span>
        </button>
      </div>

      {/* Hover arrow */}
      <div className="absolute top-1/2 left-3 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight size={16} className="text-green-400" />
      </div>
    </div>
  );
}

// ===== DETAIL MODAL =====

type DetailTab = "details" | "history" | "payments" | "notes";

const tabConfig: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
  { id: "details", label: "פרטים", icon: <FileText size={15} /> },
  { id: "history", label: "היסטוריה", icon: <History size={15} /> },
  { id: "payments", label: "תשלומים", icon: <CreditCard size={15} /> },
  { id: "notes", label: "הערות", icon: <StickyNote size={15} /> },
];

interface CustomerModalProps {
  customer: Customer;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, data: Partial<Customer>) => Promise<void>;
}

function CustomerModal({ customer, onClose, onDelete, onUpdate }: CustomerModalProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("details");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: customer.name,
    phone: customer.phone,
    email: customer.email || "",
    city: customer.city,
    address: customer.address,
    monthly_price: String(customer.monthlyPrice),
    frequency: customer.frequency,
    status: customer.status,
    notes: customer.notes || "",
  });
  const status = statusConfig[customer.status];

  async function handleDelete() {
    setDeleting(true);
    await onDelete(customer.id);
    setDeleting(false);
  }

  async function handleSave() {
    setSaving(true);
    await onUpdate(customer.id, {
      name: editForm.name,
      phone: editForm.phone,
      email: editForm.email || undefined,
      city: editForm.city,
      address: editForm.address,
      monthlyPrice: parseFloat(editForm.monthly_price) || 0,
      frequency: editForm.frequency,
      status: editForm.status as CustomerStatus,
      notes: editForm.notes,
    });
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col" dir="rtl">
      {/* Sticky top nav */}
      <div className="sticky top-0 bg-white border-b border-gray-100 flex items-center px-4 py-3 z-10 flex-shrink-0">
        {editing ? (
          <>
            <button onClick={() => setEditing(false)} className="text-sm text-gray-500 font-medium min-w-[40px]">ביטול</button>
            <div className="flex-1 text-center"><span className="font-bold text-gray-900">עריכת לקוח</span></div>
            <button onClick={handleSave} disabled={saving}
              className="text-sm font-semibold text-green-600 disabled:opacity-50 flex items-center gap-1 min-w-[40px] justify-end">
              {saving ? <Loader2 size={14} className="animate-spin" /> : "שמור"}
            </button>
          </>
        ) : (
          <>
            <button onClick={onClose} className="text-sm text-gray-500 font-medium min-w-[40px]">סגור</button>
            <div className="flex-1 text-center"><span className="font-bold text-gray-900">{customer.name}</span></div>
            <div className="flex items-center gap-3 min-w-[40px] justify-end">
              <button onClick={() => setEditing(true)}><Pencil size={17} className="text-gray-400" /></button>
              <button onClick={() => setConfirmDelete(c => !c)}><Trash2 size={17} className="text-red-400" /></button>
            </div>
          </>
        )}
      </div>

      {/* Delete confirmation bar */}
      {!editing && confirmDelete && (
        <div className="bg-red-50 border-b border-red-100 px-4 py-2 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-red-700 font-medium">למחוק את {customer.name}?</span>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-500">ביטול</button>
            <button onClick={handleDelete} disabled={deleting}
              className="text-xs font-semibold text-red-600 disabled:opacity-50 flex items-center gap-1">
              {deleting ? <Loader2 size={12} className="animate-spin" /> : null}
              {deleting ? "מוחק..." : "כן, מחק"}
            </button>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* ===== EDIT FORM ===== */}
        {editing && (
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא *</label>
              <input value={editForm.name} onChange={e => setEditForm(p => ({...p, name: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">טלפון *</label>
                <input value={editForm.phone} onChange={e => setEditForm(p => ({...p, phone: e.target.value}))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">עיר</label>
                <input value={editForm.city} onChange={e => setEditForm(p => ({...p, city: e.target.value}))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">כתובת</label>
              <input value={editForm.address} onChange={e => setEditForm(p => ({...p, address: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
              <input type="email" value={editForm.email} onChange={e => setEditForm(p => ({...p, email: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">מחיר חודשי (₪)</label>
                <input type="number" value={editForm.monthly_price} onChange={e => setEditForm(p => ({...p, monthly_price: e.target.value}))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">סטטוס</label>
                <select value={editForm.status} onChange={e => setEditForm(p => ({...p, status: e.target.value as CustomerStatus}))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white">
                  <option value="new">חדש</option>
                  <option value="active">פעיל</option>
                  <option value="vip">VIP</option>
                  <option value="inactive">לא פעיל</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תדירות</label>
              <select value={editForm.frequency} onChange={e => setEditForm(p => ({...p, frequency: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white">
                {["פעם בשבוע","פעמיים בחודש","פעם בחודש","פעם בחודשיים","פעם ב-3 חודשים"].map(f => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">הערות</label>
              <textarea value={editForm.notes} onChange={e => setEditForm(p => ({...p, notes: e.target.value}))}
                rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500 resize-none" />
            </div>
            <button onClick={handleSave} disabled={saving}
              className="w-full py-3 rounded-xl bg-green-600 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "שומר..." : "שמור שינויים"}
            </button>
          </div>
        )}

        {/* Green header */}
        {!editing && (<>
        <div className="bg-gradient-to-br from-green-600 to-green-700 p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold flex-shrink-0">
              {customer.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold">{customer.name}</h2>
                {customer.status === "vip" && (
                  <Star size={16} className="text-yellow-300 fill-yellow-300" />
                )}
              </div>
              <p className="text-green-100 text-sm mt-0.5">{customer.city}</p>
              <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-bold">{formatCurrency(customer.monthlyPrice)}</p>
              <p className="text-green-100 text-xs">לחודש</p>
              <p className="text-green-100 text-xs mt-1">{customer.frequency}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <a href={`tel:${customer.phone}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-sm">
              <Phone size={14} /><span>התקשר</span>
            </a>
            <button onClick={() => { const num = customer.phone.replace(/\D/g,""); const intl = num.startsWith("0")?"972"+num.slice(1):num; window.open(`https://wa.me/${intl}`,"_blank"); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-sm">
              <MessageCircle size={14} /><span>WhatsApp</span>
            </button>
            <button onClick={() => window.open(`https://waze.com/ul?q=${encodeURIComponent(customer.address)}`,"_blank")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-sm">
              <Navigation size={14} /><span>נווט</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-4 pt-2 bg-white sticky top-0 z-[5]">
          {tabConfig.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5">
          {activeTab === "details" && (
            <div className="space-y-4">
              {/* Contact info */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  פרטי קשר
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Phone size={15} className="text-gray-400 flex-shrink-0" />
                    <span dir="ltr" className="text-gray-700">
                      {customer.phone}
                    </span>
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail size={15} className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-700">{customer.email}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin size={15} className="text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{customer.address}</span>
                  </div>
                </div>
              </div>

              {/* Service info */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  פרטי שירות
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">תדירות</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">
                      {customer.frequency}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">מחיר חודשי</p>
                    <p className="text-sm font-semibold text-green-700 mt-0.5">
                      {formatCurrency(customer.monthlyPrice)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">ביקור אחרון</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">
                      {formatDate(customer.lastVisit)}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">ביקור הבא</p>
                    <p className="text-sm font-semibold text-green-700 mt-0.5">
                      {formatDate(customer.nextVisit)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  תאריכים
                </h4>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={15} className="text-gray-400" />
                  <span className="text-gray-500">הצטרף:</span>
                  <span className="text-gray-700 font-medium">
                    {formatDate(customer.joinDate)}
                  </span>
                </div>
              </div>

              {/* Tags */}
              {customer.tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Tag size={12} />
                    תגיות
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {customer.tags.map((tag, i) => (
                      <span
                        key={tag}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getTagColor(tag, i)}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Balance */}
              {customer.balance > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3">
                  <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">חוב פתוח</p>
                    <p className="text-xs text-red-500">
                      {formatCurrency(customer.balance)} ממתין לתשלום
                    </p>
                  </div>
                </div>
              )}

            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <History size={15} />
                <span>היסטוריית ביקורים ופעילות</span>
              </div>

              {/* Timeline items */}
              {[
                {
                  date: customer.lastVisit,
                  title: "ביקור אחרון",
                  desc: "תחזוקה שוטפת",
                  color: "bg-green-500",
                  done: true,
                },
                {
                  date: customer.nextVisit,
                  title: "ביקור הבא מתוכנן",
                  desc: customer.frequency,
                  color: "bg-blue-400",
                  done: false,
                },
                {
                  date: customer.joinDate,
                  title: "הצטרף כלקוח",
                  desc: "לקוח חדש נרשם במערכת",
                  color: "bg-purple-400",
                  done: true,
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${item.color}`}
                    />
                    {i < 2 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(item.date)}</p>
                  </div>
                </div>
              ))}

              <div className="mt-4 bg-gray-50 rounded-xl p-4 text-center text-sm text-gray-400">
                <History size={20} className="mx-auto mb-1.5 opacity-40" />
                היסטוריה מלאה תהיה זמינה בגרסה הבאה
              </div>
            </div>
          )}

          {activeTab === "payments" && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">סה"כ שולם</p>
                  <p className="text-xl font-bold text-green-700">
                    {formatCurrency(customer.totalPaid)}
                  </p>
                </div>
                <div
                  className={`rounded-xl p-4 text-center ${
                    customer.balance > 0 ? "bg-red-50" : "bg-gray-50"
                  }`}
                >
                  <p className="text-xs text-gray-500 mb-1">יתרה</p>
                  <p
                    className={`text-xl font-bold ${
                      customer.balance > 0 ? "text-red-600" : "text-gray-700"
                    }`}
                  >
                    {formatCurrency(customer.balance)}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div
                className={`flex items-center gap-3 rounded-xl p-3 ${
                  customer.balance > 0
                    ? "bg-red-50 text-red-700"
                    : "bg-green-50 text-green-700"
                }`}
              >
                {customer.balance > 0 ? (
                  <AlertCircle size={18} className="flex-shrink-0" />
                ) : (
                  <CheckCircle size={18} className="flex-shrink-0" />
                )}
                <p className="text-sm font-medium">
                  {customer.balance > 0
                    ? `חוב פתוח של ${formatCurrency(customer.balance)} ממתין לגבייה`
                    : "חשבון מסולק — אין חובות פתוחים"}
                </p>
              </div>

              {/* Monthly breakdown placeholder */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  פירוט חיוב
                </h4>
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const label = d.toLocaleDateString("he-IL", {
                      month: "long",
                      year: "numeric",
                    });
                    const paid = i < 2 || customer.balance === 0;
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-xl"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              paid ? "bg-green-500" : "bg-red-400"
                            }`}
                          />
                          <span className="text-sm text-gray-700">{label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-800">
                            {formatCurrency(customer.monthlyPrice)}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              paid
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {paid ? "שולם" : "ממתין"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === "notes" && (
            <div className="space-y-4">
              {/* Main note */}
              <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <StickyNote size={15} className="text-yellow-600" />
                  <span className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">
                    הערות לקוח
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {customer.notes || "אין הערות"}
                </p>
              </div>

              {/* Tags as notes context */}
              {customer.tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    תגיות
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {customer.tags.map((tag, i) => (
                      <span
                        key={tag}
                        className={`px-3 py-1.5 rounded-xl text-sm font-medium ${getTagColor(tag, i)}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Add note placeholder */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  הוסף הערה
                </h4>
                <textarea
                  rows={3}
                  placeholder="כתוב הערה חדשה..."
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
                />
                <button className="mt-2 w-full py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors">
                  שמור הערה
                </button>
              </div>
            </div>
          )}
        </div>
        </>)}
      </div>

    </div>
  );
}

// ===== FILTER TYPES =====

type FilterType = "all" | CustomerStatus;

const filterButtons: { id: FilterType; label: string }[] = [
  { id: "all", label: "הכל" },
  { id: "active", label: "פעיל" },
  { id: "vip", label: "VIP" },
  { id: "inactive", label: "לא פעיל" },
  { id: "new", label: "חדש" },
];

// ===== MAIN PAGE =====

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [viewMode, setViewMode] = useState<"list" | "city">("list");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Load from Supabase
  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
      if (!error && data) {
        // Map snake_case DB fields to camelCase
        setCustomers(data.map((c: Record<string, unknown>) => ({
          id: c.id as string,
          name: c.name as string,
          city: c.city as string || "",
          address: c.address as string || "",
          phone: c.phone as string || "",
          email: c.email as string || undefined,
          monthlyPrice: c.monthly_price as number || 0,
          frequency: c.frequency as string || "",
          status: c.status as CustomerStatus || "active",
          joinDate: c.join_date as string || "",
          lastVisit: c.last_visit as string || "",
          nextVisit: c.next_visit as string || "",
          notes: c.notes as string || "",
          tags: c.tags as string[] || [],
          totalPaid: c.total_paid as number || 0,
          balance: c.balance as number || 0,
          lat: c.lat as number || 0,
          lng: c.lng as number || 0,
        })));
      }
      setLoading(false);
    }
    load();
  }, []);

  // Stats
  const totalCustomers = customers.length;
  const vipCount = customers.filter((c) => c.status === "vip").length;
  const monthlyRevenue = customers
    .filter((c) => c.status !== "inactive")
    .reduce((sum, c) => sum + c.monthlyPrice, 0);
  const avgClose = customers.length ? Math.round(
    customers.reduce((sum, c) => {
      const join = new Date(c.joinDate);
      const now = new Date();
      const months =
        (now.getFullYear() - join.getFullYear()) * 12 +
        (now.getMonth() - join.getMonth());
      return sum + months;
    }, 0) / customers.length
  ) : 0;

  // Filtered list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesFilter = filter === "all" || c.status === filter;
      const matchesSearch =
        !search ||
        c.name.includes(search) ||
        c.city?.includes(search) ||
        c.phone?.includes(search) ||
        c.address?.includes(search);
      return matchesFilter && matchesSearch;
    });
  }, [search, filter, customers]);

  const activeCount = customers.filter(
    (c) => c.status === "active" || c.status === "vip"
  ).length;

  // City grouping
  const cityGroups = useMemo(() => {
    const map: Record<string, Customer[]> = {};
    filteredCustomers.forEach(c => {
      const city = c.city?.trim() || "לא ידוע";
      if (!map[city]) map[city] = [];
      map[city].push(c);
    });
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [filteredCustomers]);

  const cityViewCustomers = useMemo(() => {
    if (!selectedCity) return filteredCustomers;
    return filteredCustomers.filter(c => (c.city?.trim() || "לא ידוע") === selectedCity);
  }, [filteredCustomers, selectedCity]);

  // Add customer form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [newCustomer, setNewCustomer] = useState({
    name: "", city: "", address: "", phone: "", email: "",
    monthly_price: "", frequency: "פעם בחודש", status: "active", notes: "",
  });

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.phone) return;
    setSaving(true);
    setSaveError("");

    const { error } = await supabase.from("customers").insert([{
      name: newCustomer.name,
      city: newCustomer.city,
      address: newCustomer.address,
      phone: newCustomer.phone,
      email: newCustomer.email || null,
      monthly_price: parseFloat(newCustomer.monthly_price) || 0,
      frequency: newCustomer.frequency,
      status: newCustomer.status,
      notes: newCustomer.notes,
      tags: [],
      balance: 0,
      total_paid: 0,
      join_date: new Date().toISOString().split("T")[0],
    }]);

    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }

    // reload full list
    const { data: fresh } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
    if (fresh) {
      setCustomers(fresh.map((c: Record<string, unknown>) => ({
        id: c.id as string,
        name: c.name as string,
        city: c.city as string || "",
        address: c.address as string || "",
        phone: c.phone as string || "",
        email: c.email as string || undefined,
        monthlyPrice: c.monthly_price as number || 0,
        frequency: c.frequency as string || "",
        status: c.status as CustomerStatus || "active",
        joinDate: c.join_date as string || "",
        lastVisit: c.last_visit as string || "",
        nextVisit: c.next_visit as string || "",
        notes: c.notes as string || "",
        tags: c.tags as string[] || [],
        totalPaid: c.total_paid as number || 0,
        balance: c.balance as number || 0,
        lat: c.lat as number || 0,
        lng: c.lng as number || 0,
      })));
    }

    setShowAddModal(false);
    setNewCustomer({ name: "", city: "", address: "", phone: "", email: "", monthly_price: "", frequency: "פעם בחודש", status: "active", notes: "" });
    setSaving(false);
  }

  async function handleDeleteCustomer(id: string) {
    // Also delete the customer's jobs (find name first)
    const customerToDelete = customers.find(c => c.id === id);
    await supabase.from("customers").delete().eq("id", id);
    if (customerToDelete) {
      await supabase.from("jobs").delete().eq("customer_name", customerToDelete.name);
    }
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    setSelectedCustomer(null);
  }

  async function handleUpdateCustomer(id: string, data: Partial<Customer>) {
    await supabase.from("customers").update({
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      city: data.city,
      address: data.address,
      monthly_price: data.monthlyPrice,
      frequency: data.frequency,
      status: data.status,
      notes: data.notes,
    }).eq("id", id);
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    setSelectedCustomer(prev => prev ? { ...prev, ...data } : null);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="animate-spin text-green-600" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ===== HEADER ===== */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ניהול לקוחות</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {activeCount} לקוחות פעילים
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setLoading(true);
                supabase.from("customers").select("*").order("created_at", { ascending: false }).then(({ data }) => {
                  if (data) setCustomers(data.map((c: Record<string, unknown>) => ({
                    id: c.id as string, name: c.name as string, city: c.city as string || "",
                    address: c.address as string || "", phone: c.phone as string || "",
                    email: c.email as string || undefined, monthlyPrice: c.monthly_price as number || 0,
                    frequency: c.frequency as string || "", status: (c.status as string || "active") as import("@/lib/mock-data").CustomerStatus,
                    joinDate: c.join_date as string || "", lastVisit: c.last_visit as string || "",
                    nextVisit: c.next_visit as string || "", notes: c.notes as string || "",
                    tags: c.tags as string[] || [], totalPaid: c.total_paid as number || 0,
                    balance: c.balance as number || 0, lat: c.lat as number || 0, lng: c.lng as number || 0,
                  })));
                  setLoading(false);
                });
              }}
              className="p-2.5 rounded-xl bg-gray-100 text-gray-500 active:bg-gray-200"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus size={16} />
              לקוח חדש +
            </button>
          </div>
        </div>

        {/* ===== STATS ROW ===== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            title='סה"כ לקוחות'
            value={String(totalCustomers)}
            icon={<Users size={22} className="text-green-600" />}
            accent="bg-green-100"
            sub={`${activeCount} פעילים`}
          />
          <StatCard
            title="לקוחות VIP"
            value={String(vipCount)}
            icon={<Star size={22} className="text-yellow-500 fill-yellow-500" />}
            accent="bg-yellow-100"
            sub="לקוחות מובחרים"
          />
          <StatCard
            title="הכנסה חודשית"
            value={formatCurrency(monthlyRevenue)}
            icon={<TrendingUp size={22} className="text-blue-600" />}
            accent="bg-blue-100"
            sub="לקוחות פעילים"
          />
          <StatCard
            title="ממוצע לסגירה"
            value={`${avgClose} חודשים`}
            icon={<Clock size={22} className="text-purple-600" />}
            accent="bg-purple-100"
            sub="ממוצע לקוח"
          />
        </div>

        {/* ===== FILTER BAR ===== */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם, עיר, טלפון..."
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter buttons */}
          <div className="flex gap-1.5 flex-wrap">
            {filterButtons.map((btn) => {
              const count =
                btn.id === "all"
                  ? customers.length
                  : customers.filter((c) => c.status === btn.id).length;
              return (
                <button
                  key={btn.id}
                  onClick={() => setFilter(btn.id)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    filter === btn.id
                      ? "bg-green-600 text-white shadow-sm"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-green-300 hover:text-green-700"
                  }`}
                >
                  {btn.label}
                  <span
                    className={`text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold ${
                      filter === btn.id
                        ? "bg-white/20 text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
            {/* City view toggle */}
            <button
              onClick={() => { setViewMode(v => v === "city" ? "list" : "city"); setSelectedCity(null); }}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === "city"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-700"
              }`}
            >
              <MapPin size={13} /> לפי עיר
            </button>
          </div>
        </div>

        {/* ===== CUSTOMERS GRID ===== */}
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">לא נמצאו לקוחות</p>
            <p className="text-sm mt-1">נסה לשנות את החיפוש או הסינון</p>
          </div>
        ) : viewMode === "city" ? (
          /* ── City view ── */
          <div className="space-y-5">
            {/* City pills */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCity(null)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                  selectedCity === null ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                }`}
              >
                <MapPin size={13} /> הכל
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${selectedCity === null ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                  {filteredCustomers.length}
                </span>
              </button>
              {cityGroups.map(([city, list]) => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city === selectedCity ? null : city)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                    selectedCity === city ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-700"
                  }`}
                >
                  {city}
                  <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${selectedCity === city ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                    {list.length}
                  </span>
                </button>
              ))}
            </div>

            {/* Grouped or filtered */}
            {selectedCity ? (
              <div>
                <p className="text-sm text-gray-500 mb-3">{cityViewCustomers.length} לקוחות ב{selectedCity}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cityViewCustomers.map(customer => (
                    <CustomerCard key={customer.id} customer={customer} onClick={() => setSelectedCustomer(customer)} />
                  ))}
                </div>
              </div>
            ) : (
              cityGroups.map(([city, list]) => (
                <div key={city}>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={14} className="text-blue-500" />
                    <h3 className="text-sm font-bold text-gray-700">{city}</h3>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{list.length} לקוחות</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {list.map(customer => (
                      <CustomerCard key={customer.id} customer={customer} onClick={() => setSelectedCustomer(customer)} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>
                מציג {filteredCustomers.length} מתוך {customers.length} לקוחות
              </span>
              {filter !== "all" && (
                <button
                  onClick={() => setFilter("all")}
                  className="text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                >
                  <X size={13} />
                  נקה סינון
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  onClick={() => setSelectedCustomer(customer)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ===== CUSTOMER DETAIL MODAL ===== */}
      {selectedCustomer && (
        <CustomerModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onDelete={handleDeleteCustomer}
          onUpdate={handleUpdateCustomer}
        />
      )}

      {/* ===== ADD CUSTOMER MODAL ===== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">לקוח חדש</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא *</label>
                  <input required value={newCustomer.name} onChange={e => setNewCustomer(p => ({...p, name: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="משפחת כהן" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">טלפון *</label>
                  <input required value={newCustomer.phone} onChange={e => setNewCustomer(p => ({...p, phone: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="054-0000000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">עיר</label>
                  <input value={newCustomer.city} onChange={e => setNewCustomer(p => ({...p, city: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="רעננה" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">כתובת</label>
                  <input value={newCustomer.address} onChange={e => setNewCustomer(p => ({...p, address: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="רחוב הורד 12" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">מחיר חודשי (₪)</label>
                  <input type="number" value={newCustomer.monthly_price} onChange={e => setNewCustomer(p => ({...p, monthly_price: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">תדירות</label>
                  <select value={newCustomer.frequency} onChange={e => setNewCustomer(p => ({...p, frequency: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    {["פעם בשבוע","פעמיים בחודש","פעם בחודש","פעם בחודשיים","פעם ב-3 חודשים"].map(f => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">סטטוס</label>
                  <select value={newCustomer.status} onChange={e => setNewCustomer(p => ({...p, status: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    <option value="new">חדש</option>
                    <option value="active">פעיל</option>
                    <option value="vip">VIP</option>
                    <option value="inactive">לא פעיל</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
                  <input type="email" value={newCustomer.email} onChange={e => setNewCustomer(p => ({...p, email: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="email@example.com" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">הערות</label>
                  <textarea value={newCustomer.notes} onChange={e => setNewCustomer(p => ({...p, notes: e.target.value}))}
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    placeholder="הערות מיוחדות, דרישות, שעות עדיפות..." />
                </div>
              </div>
              {saveError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  שגיאה: {saveError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  ביטול
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {saving ? "שומר..." : "הוסף לקוח"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
