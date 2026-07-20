"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  LayoutDashboard, Users, UserCheck, Calendar, DollarSign,
  Package, BarChart3, FolderKanban,
  Settings, LogOut, X, Leaf, Camera, Tag, FileText, BookOpen,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getDirection, type Locale } from "@/lib/locale";

// Same group structure as the desktop Sidebar so the mental model stays
// consistent across breakpoints. Daily core has no header, the rest do.
// Labels resolved via useTranslations("nav") — see Sidebar.tsx for the
// same pattern/reasoning.
type NavItem = { href: string; labelKey: string; icon: typeof LayoutDashboard };
const navGroups: { titleKey: string | null; items: NavItem[] }[] = [
  {
    titleKey: null,
    items: [
      { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
      { href: "/schedule",  labelKey: "schedule", icon: Calendar },
      { href: "/customers", labelKey: "customers", icon: Users },
      { href: "/finance",   labelKey: "finance", icon: DollarSign },
    ],
  },
  {
    // The quote→project pipeline as one ordered flow (see Sidebar.tsx).
    titleKey: "groupFromQuoteToProject",
    items: [
      { href: "/pricer",   labelKey: "pricer", icon: Tag },
      { href: "/quote",    labelKey: "quotes", icon: FileText },
      { href: "/projects", labelKey: "projects", icon: FolderKanban },
    ],
  },
  {
    // Mirror of Sidebar.tsx — see the reasoning there. People/gear/
    // portfolio = "my resources"; analytics/knowledge + settings live
    // in the final group.
    titleKey: "groupMyResources",
    items: [
      { href: "/employees", labelKey: "employees", icon: UserCheck },
      { href: "/inventory", labelKey: "inventory", icon: Package },
      { href: "/portfolio", labelKey: "portfolio", icon: Camera },
    ],
  },
  {
    // Mirror of Sidebar.tsx — analytics split out into its own
    // "ביצועים" group (decision-data, owner's periodic job) so it isn't
    // buried next to the knowledge content.
    titleKey: "groupPerformance",
    items: [
      { href: "/analytics", labelKey: "analytics", icon: BarChart3 },
    ],
  },
  {
    // Knowledge + settings live at the bottom — least-used housekeeping.
    titleKey: "groupKnowledgeAndSettings",
    items: [
      { href: "/articles",  labelKey: "articles", icon: BookOpen },
      { href: "/settings",  labelKey: "settingsNav", icon: Settings },
    ],
  },
];

export default function MobileMenu({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const dir = getDirection(locale);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="fixed inset-0 z-50" dir={dir} role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="absolute bottom-0 start-0 end-0 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <Link href="/dashboard" onClick={onClose} className="flex items-center gap-3 hover:opacity-80 transition-opacity" aria-label={tc("backToDashboard")}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center">
              <Leaf size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900">{tc("appName")}</span>
          </Link>
          <button onClick={onClose} aria-label={tc("close")} className="p-2 rounded-xl hover:bg-gray-100">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Nav groups — header → 3-column grid, repeated per group */}
        <div className="px-4 py-3 space-y-4">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {group.titleKey && (
                <div className="px-1 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {t(group.titleKey)}
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                {group.items.map(({ href, labelKey, icon: Icon }) => {
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
                      <span className="text-xs font-medium text-center leading-tight">{t(labelKey)}</span>
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
            {tc("logout")}
          </button>
        </div>
      </div>
    </div>
  );
}
