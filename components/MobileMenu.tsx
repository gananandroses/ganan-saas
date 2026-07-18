"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, UserCheck, Calendar, DollarSign,
  Package, BarChart3, FolderKanban,
  Settings, LogOut, X, Leaf, Camera, Tag, FileText, BookOpen,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// Same group structure as the desktop Sidebar so the mental model stays
// consistent across breakpoints. Daily core has no header, the rest do.
type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };
const navGroups: { title: string | null; items: NavItem[] }[] = [
  {
    title: null,
    items: [
      { href: "/dashboard", label: "דשבורד", icon: LayoutDashboard },
      { href: "/schedule",  label: "יומן", icon: Calendar },
      { href: "/customers", label: "לקוחות", icon: Users },
      { href: "/finance",   label: "פיננסים", icon: DollarSign },
    ],
  },
  {
    // The quote→project pipeline as one ordered flow (see Sidebar.tsx).
    title: "מהצעה לביצוע",
    items: [
      { href: "/pricer",   label: "1 · מחירון", icon: Tag },
      { href: "/quote",    label: "2 · הצעות מחיר", icon: FileText },
      { href: "/projects", label: "3 · פרויקטים", icon: FolderKanban },
    ],
  },
  {
    // Mirror of Sidebar.tsx — see the reasoning there. People/gear/
    // portfolio = "my resources"; analytics/knowledge + settings live
    // in the final group.
    title: "המשאבים שלי",
    items: [
      { href: "/employees", label: "עובדים + GPS", icon: UserCheck },
      { href: "/inventory", label: "ציוד ומלאי", icon: Package },
      { href: "/portfolio", label: "תיק עבודות", icon: Camera },
    ],
  },
  {
    // Mirror of Sidebar.tsx — analytics split out into its own
    // "ביצועים" group (decision-data, owner's periodic job) so it isn't
    // buried next to the knowledge content.
    title: "ביצועים",
    items: [
      { href: "/analytics", label: "אנליטיקה", icon: BarChart3 },
    ],
  },
  {
    // Knowledge + settings live at the bottom — least-used housekeeping.
    title: "ידע והגדרות",
    items: [
      { href: "/articles",  label: "מרכז ידע", icon: BookOpen },
      { href: "/settings",  label: "הגדרות", icon: Settings },
    ],
  },
];

export default function MobileMenu({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="fixed inset-0 z-50" dir="rtl" role="dialog" aria-modal="true">
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
          <Link href="/dashboard" onClick={onClose} className="flex items-center gap-3 hover:opacity-80 transition-opacity" aria-label="חזרה לדשבורד">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center">
              <Leaf size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900">גנן Pro</span>
          </Link>
          <button onClick={onClose} aria-label="סגור" className="p-2 rounded-xl hover:bg-gray-100">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Nav groups — header → 3-column grid, repeated per group */}
        <div className="px-4 py-3 space-y-4">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {group.title && (
                <div className="px-1 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {group.title}
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                {group.items.map(({ href, label, icon: Icon }) => {
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
            </div>
          ))}
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
