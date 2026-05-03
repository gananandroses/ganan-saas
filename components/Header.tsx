"use client";
import { Bell, Search, Plus, X, AlertCircle, Package, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
}

interface Notif {
  id: string;
  text: string;
  type: "red" | "yellow" | "green";
}

export default function Header({ title, subtitle, action }: HeaderProps) {
  const [showNotif, setShowNotif] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const list: Notif[] = [];

      // חובות פתוחים
      const { data: pending } = await supabase
        .from("transactions")
        .select("customer_name, amount")
        .eq("user_id", user.id)
        .eq("type", "income")
        .in("status", ["pending", "overdue"]);

      (pending || []).forEach((t) => {
        list.push({
          id: `tx-${t.customer_name}`,
          text: `${t.customer_name} — חוב פתוח של ₪${Number(t.amount).toLocaleString()}`,
          type: "red",
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
          });
        });

      setNotifs(list);
    }
    load();
  }, []);

  const dismiss = (id: string) => setNotifs((prev) => prev.filter((n) => n.id !== id));
  const dismissAll = () => setNotifs([]);

  const colorMap = {
    red: "bg-red-100 text-red-700",
    yellow: "bg-yellow-100 text-yellow-700",
    green: "bg-green-100 text-green-700",
  };

  const iconMap = {
    red: <AlertCircle size={13} />,
    yellow: <Package size={13} />,
    green: <CheckCircle size={13} />,
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 gap-4 sticky top-0 z-30">
      {/* Title */}
      <div className="flex-1">
        <h2 className="text-lg font-bold text-gray-900 leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-56">
        <Search size={15} className="text-gray-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="חיפוש..."
          className="bg-transparent text-sm text-gray-600 outline-none w-full placeholder:text-gray-400"
          dir="rtl"
        />
      </div>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => setShowNotif(!showNotif)}
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
                notifs.map((n) => (
                  <div key={n.id} className="flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5 ${colorMap[n.type]}`}>
                      {iconMap[n.type]}
                    </span>
                    <p className="text-sm text-gray-700 flex-1 leading-snug">{n.text}</p>
                    <button
                      onClick={() => dismiss(n.id)}
                      className="text-gray-300 hover:text-gray-500 flex-shrink-0 mt-0.5 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
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
    </header>
  );
}
