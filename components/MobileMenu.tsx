"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, UserCheck, Calendar, DollarSign,
  Package, Sparkles, BarChart3, Zap, FolderKanban,
  Settings, LogOut, X, Leaf, Camera,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const allItems = [
  { href: "/dashboard", label: "דשבורד", icon: LayoutDashboard },
  { href: "/customers", label: "לקוחות (CRM)", icon: Users },
  { href: "/employees", label: "עובדים + GPS", icon: UserCheck },
  { href: "/schedule", label: "לוח זמנים", icon: Calendar },
  { href: "/finance", label: "פיננסים", icon: DollarSign },
  { href: "/inventory", label: "ציוד ומלאי", icon: Package },
  { href: "/projects", label: "פרויקטים", icon: FolderKanban },
  { href: "/portfolio", label: "תיק עבודות", icon: Camera },
  { href: "/analytics", label: "אנליטיקה BI", icon: BarChart3 },
  { href: "/ai-tools", label: "כלי AI", icon: Sparkles },
  { href: "/automations", label: "אוטומציות", icon: Zap },
  { href: "/settings", label: "הגדרות", icon: Settings },
];

export default function MobileMenu({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="fixed inset-0 z-50" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="absolute bottom-0 right-0 left-0 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center">
              <Leaf size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900">גנן Pro</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Nav items */}
        <div className="px-4 py-3 grid grid-cols-3 gap-2">
          {allItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${
                  active ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-600"
                }`}
              >
                <Icon size={22} className={active ? "text-green-600" : "text-gray-400"} />
                <span className="text-xs font-medium text-center leading-tight">{label}</span>
              </Link>
            );
          })}
        </div>

        {/* Logout */}
        <div className="px-4 pb-8 pt-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-50 text-red-500 font-medium"
          >
            <LogOut size={18} />
            יציאה
          </button>
        </div>
      </div>
    </div>
  );
}
