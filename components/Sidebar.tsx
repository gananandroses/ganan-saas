"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, UserCheck, Calendar, DollarSign,
  Package, Sparkles, BarChart3, Zap, FolderKanban,
  Settings, ChevronLeft, Leaf, Bell, LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", label: "דשבורד", icon: LayoutDashboard },
  { href: "/customers", label: "לקוחות (CRM)", icon: Users },
  { href: "/employees", label: "עובדים + GPS", icon: UserCheck },
  { href: "/schedule", label: "לוח זמנים", icon: Calendar },
  { href: "/finance", label: "פיננסים", icon: DollarSign },
  { href: "/inventory", label: "ציוד ומלאי", icon: Package },
  { href: "/projects", label: "פרויקטים", icon: FolderKanban },
  { href: "/analytics", label: "אנליטיקה BI", icon: BarChart3 },
  { href: "/ai-tools", label: "כלי AI", icon: Sparkles },
  { href: "/automations", label: "אוטומציות", icon: Zap },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="fixed top-0 right-0 h-screen w-64 bg-white border-l border-gray-100 flex flex-col z-40 shadow-sm">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-md">
            <Leaf size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-base leading-tight">גנן Pro</h1>
            <p className="text-xs text-gray-400">ניהול עסק גינון</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                active
                  ? "bg-green-50 text-green-700 shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon
                size={18}
                className={active ? "text-green-600" : "text-gray-400 group-hover:text-gray-600"}
              />
              <span>{label}</span>
              {active && (
                <span className="mr-auto w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-0.5 border-t border-gray-100 pt-3">
        <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all">
          <Settings size={18} className="text-gray-400" />
          <span>הגדרות</span>
        </Link>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all">
          <LogOut size={18} />
          <span>יציאה</span>
        </button>

        {/* User card */}
        <div className="mt-3 p-3 bg-green-50 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            א
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">אריאל חסין</p>
            <p className="text-xs text-gray-500 truncate">בעל עסק</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
