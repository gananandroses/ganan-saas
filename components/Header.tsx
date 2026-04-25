"use client";
import { Bell, Search, Plus } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
}

export default function Header({ title, subtitle, action }: HeaderProps) {
  const [showNotif, setShowNotif] = useState(false);

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
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {showNotif && (
          <div className="absolute top-12 left-0 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50">
            <h3 className="font-bold text-gray-800 mb-3 text-sm">התראות</h3>
            <div className="space-y-3">
              {[
                { text: "דוד לוי לא שילם כבר 14 יום", color: "bg-red-100 text-red-700", time: "לפני שעה" },
                { text: "מלאי קוטל עשבים נמוך ממינימום", color: "bg-yellow-100 text-yellow-700", time: "לפני 3 שעות" },
                { text: "נועה שפירא אישרה את הפגישה מחר", color: "bg-green-100 text-green-700", time: "לפני 5 שעות" },
              ].map((n, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${n.color} flex-shrink-0 mt-0.5`}>!</span>
                  <div>
                    <p className="text-sm text-gray-700">{n.text}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))}
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
