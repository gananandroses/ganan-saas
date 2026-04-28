"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Plus,
  Package,
  Droplets,
  Leaf,
  Wrench,
  FlaskConical,
  Sprout,
  ShoppingCart,
  CheckCircle,
  XCircle,
  Clock,
  TrendingDown,
  DollarSign,
  BarChart3,
  CalendarCheck,
  Settings,
  Loader2,
  Pencil,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

// ===== TYPES =====

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minStock: number;
  lastUsed: string;
  pricePerUnit: number;
  supplier: string;
}

type Category =
  | "הכל"
  | "דשנים"
  | "ריסוסים"
  | "שתילים"
  | "ציוד"
  | "השקיה"
  | "חומרים";

interface EquipmentItem {
  id: string;
  name: string;
  icon: string;
  lastService: string;
  nextService: string;
  status: "תקין" | "דורש תחזוקה" | "מחוץ לשירות";
  hoursUsed: number;
}

interface StockMovement {
  id: string;
  date: string;
  item: string;
  amount: string;
  customer: string;
  type: "use" | "restock";
}

// ===== STATIC MOCK DATA (equipment & movements stay static) =====

const equipmentData: EquipmentItem[] = [
  {
    id: "eq1",
    name: "מכסחת הוסקוורנה",
    icon: "🚜",
    lastService: "2026-03-10",
    nextService: "2026-06-10",
    status: "תקין",
    hoursUsed: 142,
  },
  {
    id: "eq2",
    name: "גוזם שיחים Stihl",
    icon: "✂️",
    lastService: "2026-02-15",
    nextService: "2026-04-15",
    status: "דורש תחזוקה",
    hoursUsed: 210,
  },
  {
    id: "eq3",
    name: "מפוח עלים Makita",
    icon: "💨",
    lastService: "2026-04-01",
    nextService: "2026-07-01",
    status: "תקין",
    hoursUsed: 88,
  },
  {
    id: "eq4",
    name: "מכונת גיזום חשמלית",
    icon: "⚡",
    lastService: "2026-01-20",
    nextService: "2026-04-20",
    status: "דורש תחזוקה",
    hoursUsed: 175,
  },
];

const stockMovements: StockMovement[] = [
  {
    id: "sm1",
    date: "2026-04-24",
    item: "קוטל עשבים Roundup",
    amount: "1 ליטר",
    customer: "מלון פלאזה",
    type: "use",
  },
  {
    id: "sm2",
    date: "2026-04-22",
    item: "דשן NPK 20-20-20",
    amount: "3 ק\"ג",
    customer: "משפחת כהן",
    type: "use",
  },
  {
    id: "sm3",
    date: "2026-04-20",
    item: "שתילי ורדים",
    amount: "8 יח'",
    customer: "שרה אברהם",
    type: "use",
  },
  {
    id: "sm4",
    date: "2026-04-18",
    item: "אדמה מועשרת",
    amount: "2 שקים",
    customer: "נועה שפירא",
    type: "use",
  },
  {
    id: "sm5",
    date: "2026-04-15",
    item: "טפטפות Q2",
    amount: "15 יח'",
    customer: "מלון פלאזה",
    type: "use",
  },
];

// ===== HELPERS =====

const CATEGORIES: Category[] = [
  "הכל",
  "דשנים",
  "ריסוסים",
  "שתילים",
  "ציוד",
  "השקיה",
  "חומרים",
];

function getCategoryIcon(category: string) {
  switch (category) {
    case "דשנים":
      return <FlaskConical className="w-5 h-5 text-yellow-600" />;
    case "ריסוסים":
      return <Droplets className="w-5 h-5 text-blue-500" />;
    case "שתילים":
      return <Sprout className="w-5 h-5 text-green-600" />;
    case "ציוד":
      return <Wrench className="w-5 h-5 text-gray-600" />;
    case "השקיה":
      return <Droplets className="w-5 h-5 text-cyan-500" />;
    case "חומרים":
      return <Package className="w-5 h-5 text-orange-500" />;
    default:
      return <Leaf className="w-5 h-5 text-green-500" />;
  }
}

function getCategoryEmoji(category: string): string {
  switch (category) {
    case "דשנים":
      return "🧪";
    case "ריסוסים":
      return "💧";
    case "שתילים":
      return "🌱";
    case "ציוד":
      return "🔧";
    case "השקיה":
      return "🚿";
    case "חומרים":
      return "📦";
    default:
      return "🌿";
  }
}

function getStockStatus(item: InventoryItem): {
  label: string;
  color: string;
  bgColor: string;
  barColor: string;
  textColor: string;
} {
  if (item.quantity === 0) {
    return {
      label: "אזל המלאי",
      color: "text-red-700",
      bgColor: "bg-red-100",
      barColor: "bg-red-500",
      textColor: "text-red-600",
    };
  }
  if (item.quantity < item.minStock) {
    return {
      label: "מלאי נמוך!",
      color: "text-red-600",
      bgColor: "bg-red-50",
      barColor: "bg-red-400",
      textColor: "text-red-600",
    };
  }
  if (item.quantity < item.minStock * 1.5) {
    return {
      label: "מלאי בינוני",
      color: "text-yellow-700",
      bgColor: "bg-yellow-50",
      barColor: "bg-yellow-400",
      textColor: "text-yellow-600",
    };
  }
  return {
    label: "מלאי תקין",
    color: "text-green-700",
    bgColor: "bg-green-50",
    barColor: "bg-green-500",
    textColor: "text-green-600",
  };
}

function getProgressPercentage(item: InventoryItem): number {
  const ratio = item.quantity / (item.minStock * 3);
  return Math.min(ratio * 100, 100);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function isServiceOverdue(nextService: string): boolean {
  return new Date(nextService) < new Date();
}

// ===== NEW ITEM MODAL =====

interface NewItemModalProps {
  onClose: () => void;
  onSaved: () => void;
}

function NewItemModal({ onClose, onSaved }: NewItemModalProps) {
  const [saving, setSaving] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [form, setForm] = useState({
    name: "",
    category: "דשנים",
    unit: "",
    quantity: "",
    min_stock: "",
    price_per_unit: "",
    supplier: "",
  });

  const handleSubmit = async () => {
    if (!form.name || !form.unit) return;
    setSaving(true);
    const finalCategory = form.category === "__other__" ? (customCategory || "אחר") : form.category;
    await supabase.from("inventory").insert({
      name: form.name,
      category: finalCategory,
      unit: form.unit,
      quantity: parseFloat(form.quantity) || 0,
      min_stock: parseFloat(form.min_stock) || 0,
      price_per_unit: parseFloat(form.price_per_unit) || 0,
      supplier: form.supplier,
      last_used: new Date().toISOString().split("T")[0],
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-md sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col" style={{maxHeight: '92dvh'}} dir="rtl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">פריט חדש</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <XCircle className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם הפריט</label>
            <input
              type="text"
              placeholder="לדוגמה: דשן אורגני..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">קטגוריה</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent bg-white"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.filter((c) => c !== "הכל").map((c) => (
                  <option key={c}>{c}</option>
                ))}
                <option value="__other__">אחר (כתוב בעצמך)</option>
              </select>
              {form.category === "__other__" && (
                <input
                  type="text"
                  placeholder="שם הקטגוריה..."
                  className="w-full mt-2 border border-green-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  autoFocus
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">יחידת מידה</label>
              <input
                type="text"
                placeholder='ק"ג, ליטר, יח...'
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">כמות התחלתית</label>
              <input
                type="number"
                placeholder="0"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">מלאי מינימלי</label>
              <input
                type="number"
                placeholder="0"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
                value={form.min_stock}
                onChange={(e) => setForm((f) => ({ ...f, min_stock: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">מחיר ליחידה (₪)</label>
              <input
                type="number"
                placeholder="0"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
                value={form.price_per_unit}
                onChange={(e) => setForm((f) => ({ ...f, price_per_unit: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ספק</label>
              <input
                type="text"
                placeholder="שם הספק..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
                value={form.supplier}
                onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Sticky buttons */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 flex-shrink-0 bg-white">
          <button onClick={onClose} className="flex-1 py-3.5 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-600">
            ביטול
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name || !form.unit}
            className="flex-1 py-3.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? "שומר..." : "הוסף פריט"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== EDIT ITEM MODAL =====

interface EditItemModalProps {
  item: InventoryItem;
  onClose: () => void;
  onSaved: () => void;
}

function EditItemModal({ item, onClose, onSaved }: EditItemModalProps) {
  const [saving, setSaving] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const knownCategories = CATEGORIES.filter(c => c !== "הכל") as string[];
  const [form, setForm] = useState({
    name: item.name,
    category: knownCategories.includes(item.category) ? item.category : "__other__",
    unit: item.unit,
    quantity: String(item.quantity),
    min_stock: String(item.minStock),
    price_per_unit: String(item.pricePerUnit),
    supplier: item.supplier,
  });

  // If category was custom, pre-fill the text field
  useState(() => {
    if (!knownCategories.includes(item.category)) {
      setCustomCategory(item.category);
    }
  });

  const handleSave = async () => {
    if (!form.name || !form.unit) return;
    setSaving(true);
    const finalCategory = form.category === "__other__" ? (customCategory || "אחר") : form.category;
    await supabase.from("inventory").update({
      name: form.name,
      category: finalCategory,
      unit: form.unit,
      quantity: parseFloat(form.quantity) || 0,
      min_stock: parseFloat(form.min_stock) || 0,
      price_per_unit: parseFloat(form.price_per_unit) || 0,
      supplier: form.supplier,
    }).eq("id", item.id);
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-md sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col" style={{maxHeight: '92dvh'}} dir="rtl">
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">עריכת פריט</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם הפריט</label>
            <input type="text"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">קטגוריה</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 bg-white"
                value={form.category}
                onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.filter(c => c !== "הכל").map(c => <option key={c}>{c}</option>)}
                <option value="__other__">אחר (כתוב בעצמך)</option>
              </select>
              {form.category === "__other__" && (
                <input type="text" placeholder="שם הקטגוריה..."
                  className="w-full mt-2 border border-green-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)} />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">יחידת מידה</label>
              <input type="text"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                value={form.unit}
                onChange={(e) => setForm(f => ({ ...f, unit: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">כמות</label>
              <input type="number"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                value={form.quantity}
                onChange={(e) => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">מינימום מלאי</label>
              <input type="number"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                value={form.min_stock}
                onChange={(e) => setForm(f => ({ ...f, min_stock: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">מחיר ליחידה (₪)</label>
              <input type="number"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                value={form.price_per_unit}
                onChange={(e) => setForm(f => ({ ...f, price_per_unit: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ספק</label>
              <input type="text"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                value={form.supplier}
                onChange={(e) => setForm(f => ({ ...f, supplier: e.target.value }))} />
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-600">ביטול</button>
          <button onClick={handleSave} disabled={saving || !form.name || !form.unit}
            className="flex-1 py-3.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-2xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? "שומר..." : "שמור שינויים"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN COMPONENT =====

export default function InventoryPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category>("הכל");
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [schedulingEquipment, setSchedulingEquipment] = useState<EquipmentItem | null>(null);
  const [maintenanceDate, setMaintenanceDate] = useState("");
  const [schedulingSaving, setSchedulingSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  async function handleScheduleMaintenance() {
    if (!schedulingEquipment || !maintenanceDate) return;
    setSchedulingSaving(true);
    await supabase.from("jobs").insert({
      customer_name: "תחזוקה פנימית",
      type: `תחזוקת ציוד — ${schedulingEquipment.name}`,
      job_date: maintenanceDate,
      job_time: "08:00",
      status: "pending",
      priority: "high",
      notes: `תחזוקה מתוכננת: ${schedulingEquipment.name}`,
    });
    setSchedulingSaving(false);
    setSchedulingEquipment(null);
    setMaintenanceDate("");
    alert(`✅ תחזוקה נוספה ליומן בתאריך ${maintenanceDate}`);
  }

  const fetchInventory = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("inventory")
      .select("*")
      .order("category");

    if (data) {
      const mapped: InventoryItem[] = data.map((row) => ({
        id: String(row.id),
        name: row.name ?? "",
        category: row.category ?? "",
        quantity: Number(row.quantity ?? 0),
        unit: row.unit ?? "",
        minStock: Number(row.min_stock ?? 0),
        lastUsed: row.last_used ?? "",
        pricePerUnit: Number(row.price_per_unit ?? 0),
        supplier: row.supplier ?? "",
      }));
      setInventoryItems(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleUse = async (item: InventoryItem) => {
    if (item.quantity <= 0) return;
    const newQty = item.quantity - 1;
    await supabase.from("inventory").update({ quantity: newQty }).eq("id", item.id);
    setInventoryItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i))
    );
  };

  const handleRestock = async (item: InventoryItem) => {
    const newQty = item.quantity + item.minStock;
    await supabase.from("inventory").update({ quantity: newQty }).eq("id", item.id);
    setInventoryItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i))
    );
  };

  // Filter items
  const filteredItems =
    selectedCategory === "הכל"
      ? inventoryItems
      : inventoryItems.filter((item) => item.category === selectedCategory);

  // Low stock items
  const lowStockItems = inventoryItems.filter(
    (item) => item.quantity < item.minStock
  );

  // Summary stats
  const totalItems = inventoryItems.length;
  const totalInventoryValue = inventoryItems.reduce(
    (sum, item) => sum + item.quantity * item.pricePerUnit,
    0
  );
  const itemsNeedingRestock = lowStockItems.length;
  const equipmentValue = equipmentData.length * 2500; // approximate

  return (
    <div dir="rtl" className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ציוד ומלאי</h1>
          <p className="text-sm text-gray-500 mt-0.5">ניהול מלאי, ציוד ותחזוקה</p>
        </div>
        <button
          onClick={() => setShowNewItemModal(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          פריט חדש +
        </button>
      </div>

      {/* ===== SUMMARY STATS ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">סה&quot;כ פריטים</p>
              <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">שווי מלאי כולל</p>
              <p className="text-2xl font-bold text-gray-900">
                ₪{totalInventoryValue.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">פריטים למלאי</p>
              <p className="text-2xl font-bold text-red-600">{itemsNeedingRestock}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">שווי כלים</p>
              <p className="text-2xl font-bold text-gray-900">
                ₪{equipmentValue.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== ALERT BANNER ===== */}
      {lowStockItems.length > 0 && (
        <div className="bg-gradient-to-l from-red-50 to-orange-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-red-800 text-sm">
              ⚠️ {lowStockItems.length} פריטים במלאי נמוך — יש לטפל בדחיפות!
            </p>
            <p className="text-red-600 text-sm mt-0.5">
              {lowStockItems.map((item) => item.name).join(" • ")}
            </p>
          </div>
          <button className="text-xs text-red-600 hover:text-red-800 font-medium border border-red-300 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
            <ShoppingCart className="w-3 h-3" />
            הזמן הכל
          </button>
        </div>
      )}

      {/* ===== CATEGORY FILTER TABS ===== */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => {
          const count =
            cat === "הכל"
              ? inventoryItems.length
              : inventoryItems.filter((i) => i.category === cat).length;
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-green-600 text-white shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              {cat}
              <span
                className={`mr-1.5 text-xs ${
                  isActive ? "text-green-200" : "text-gray-400"
                }`}
              >
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* ===== INVENTORY CARDS GRID ===== */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const stockStatus = getStockStatus(item);
            const progressPct = getProgressPercentage(item);
            const totalValue = item.quantity * item.pricePerUnit;
            const isLow = item.quantity < item.minStock;
            const isZero = item.quantity === 0;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl shadow-sm border transition-shadow hover:shadow-md ${
                  isZero
                    ? "border-red-300"
                    : isLow
                    ? "border-red-200"
                    : "border-gray-100"
                }`}
              >
                {/* Card Header */}
                <div className="p-4 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${stockStatus.bgColor}`}
                      >
                        {getCategoryEmoji(item.category)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                          {item.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {getCategoryIcon(item.category)}
                          <span className="text-xs text-gray-500">{item.category}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stock Level Badge + Edit Button */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-semibold ${stockStatus.bgColor} ${stockStatus.color}`}
                      >
                        {stockStatus.label}
                      </span>
                      <button
                        onClick={() => setEditingItem(item)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quantity + Progress */}
                <div className="px-4 pb-3">
                  <div className="flex items-end justify-between mb-1.5">
                    <div>
                      <span className={`text-3xl font-bold ${stockStatus.textColor}`}>
                        {item.quantity}
                      </span>
                      <span className="text-sm text-gray-500 mr-1">{item.unit}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      מינימום: {item.minStock} {item.unit}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${stockStatus.barColor}`}
                      style={{ width: `${Math.max(progressPct, 3)}%` }}
                    />
                  </div>
                </div>

                {/* Details */}
                <div className="px-4 pb-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      שימוש אחרון: {item.lastUsed ? formatDate(item.lastUsed) : "—"}
                    </span>
                    <span className="text-gray-700 font-medium">ספק: {item.supplier}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      מחיר ליח&apos;:{" "}
                      <span className="text-gray-700 font-medium">₪{item.pricePerUnit}</span>
                    </span>
                    <span className="text-gray-500">
                      שווי כולל:{" "}
                      <span className="text-green-700 font-semibold">
                        ₪{totalValue.toLocaleString()}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <div className="px-4 pb-4">
                  {isLow || isZero ? (
                    <button
                      onClick={() => handleRestock(item)}
                      className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 hover:border-red-300 rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      הזמן עכשיו
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUse(item)}
                      className="w-full bg-gray-50 hover:bg-green-50 text-gray-700 hover:text-green-700 border border-gray-200 hover:border-green-200 rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      השתמש
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && !loading && (
            <div className="col-span-full py-12 text-center text-gray-400 text-sm">
              אין פריטים בקטגוריה זו
            </div>
          )}
        </div>
      )}

      {/* ===== EQUIPMENT MAINTENANCE SECTION ===== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Settings className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">תחזוקת ציוד</h2>
              <p className="text-xs text-gray-500">מעקב שירות ותחזוקה מתוזמנת</p>
            </div>
          </div>
          <span className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-lg font-medium">
            {equipmentData.filter((e) => e.status === "דורש תחזוקה").length} דורשים טיפול
          </span>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {equipmentData.map((eq) => {
            const overdue = isServiceOverdue(eq.nextService);
            const needsMaintenance = eq.status === "דורש תחזוקה";
            const isOut = eq.status === "מחוץ לשירות";

            const statusColor = isOut
              ? "bg-gray-100 text-gray-600"
              : needsMaintenance || overdue
              ? "bg-orange-100 text-orange-700"
              : "bg-green-100 text-green-700";

            const borderColor = isOut
              ? "border-gray-200"
              : needsMaintenance || overdue
              ? "border-orange-200"
              : "border-gray-100";

            return (
              <div
                key={eq.id}
                className={`border rounded-xl p-4 flex items-start gap-3 ${borderColor}`}
              >
                <div className="text-3xl">{eq.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 text-sm">{eq.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-xs font-semibold flex-shrink-0 ${statusColor}`}
                    >
                      {eq.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <CalendarCheck className="w-3 h-3" />
                      <span>שירות אחרון: {formatDate(eq.lastService)}</span>
                    </div>
                    <div
                      className={`flex items-center gap-1.5 ${
                        overdue ? "text-red-600 font-medium" : "text-gray-500"
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>
                        {overdue ? "⚠️ עבר: " : "שירות הבא: "}
                        {formatDate(eq.nextService)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{eq.hoursUsed} שעות שימוש</span>
                    <button
                      onClick={() => { setSchedulingEquipment(eq); setMaintenanceDate(""); }}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        needsMaintenance || overdue
                          ? "bg-orange-600 hover:bg-orange-700 text-white"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                    >
                      תזמן תחזוקה
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== STOCK MOVEMENT HISTORY ===== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">היסטוריית תנועת מלאי</h2>
            <p className="text-xs text-gray-500">5 פעולות אחרונות</p>
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {stockMovements.map((movement) => (
            <div
              key={movement.id}
              className="px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{movement.item}</p>
                <p className="text-xs text-gray-500 mt-0.5">{movement.customer}</p>
              </div>
              <div className="text-left flex-shrink-0">
                <p className="text-sm font-semibold text-red-600">-{movement.amount}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(movement.date)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-3 border-t border-gray-50">
          <button className="text-sm text-green-600 hover:text-green-700 font-medium transition-colors">
            הצג היסטוריה מלאה ←
          </button>
        </div>
      </div>

      {/* ===== MAINTENANCE SCHEDULE MODAL ===== */}
      {schedulingEquipment && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={() => setSchedulingEquipment(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" dir="rtl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900">תזמן תחזוקה</h3>
            <p className="text-sm text-gray-500">{schedulingEquipment.icon} {schedulingEquipment.name}</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תאריך תחזוקה</label>
              <input
                type="date"
                value={maintenanceDate}
                onChange={e => setMaintenanceDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setSchedulingEquipment(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">
                ביטול
              </button>
              <button onClick={handleScheduleMaintenance} disabled={!maintenanceDate || schedulingSaving}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                {schedulingSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                {schedulingSaving ? "שומר..." : "הוסף ליומן"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== EDIT ITEM MODAL ===== */}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={fetchInventory}
        />
      )}

      {/* ===== NEW ITEM MODAL ===== */}
      {showNewItemModal && (
        <NewItemModal
          onClose={() => setShowNewItemModal(false)}
          onSaved={fetchInventory}
        />
      )}
    </div>
  );
}
