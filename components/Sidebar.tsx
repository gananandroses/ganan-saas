"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard, Users, UserCheck, Calendar, DollarSign,
  Package, BarChart3, FolderKanban,
  Settings, Leaf, LogOut, Camera, ClipboardList, FileText, BookOpen,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

// Sidebar nav — grouped by frequency-of-use rather than one flat list.
// Hick's Law: 15 items in one bucket forces every visitor to scan them
// all. Three labelled buckets (Daily / Tools / Knowledge & extras) lets
// a new gardener home in on the 4 they need most every day.
// Labels are resolved via useTranslations("nav") inside the component —
// this array only carries the structural (href/icon/group) shape.
const navGroups: { titleKey: string | null; items: { href: string; labelKey: string; icon: typeof LayoutDashboard }[] }[] = [
  {
    titleKey: null, // top group has no header — these are the daily core
    items: [
      { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
      { href: "/schedule",  labelKey: "schedule", icon: Calendar },
      { href: "/customers", labelKey: "customers", icon: Users },
      { href: "/finance",   labelKey: "finance", icon: DollarSign },
    ],
  },
  {
    // The quote→project pipeline, ordered as a sequence so it reads as
    // ONE flow instead of three unrelated tools: set up your catalog →
    // build a quote → it becomes a project. Numbered labels reinforce
    // the order.
    titleKey: "groupFromQuoteToProject",
    items: [
      { href: "/pricer",   labelKey: "pricer", icon: ClipboardList },
      { href: "/quote",    labelKey: "quotes", icon: FileText },
      { href: "/projects", labelKey: "projects", icon: FolderKanban },
    ],
  },
  {
    // The user's assets — people, gear, and the work they've shown off.
    // Replaces the old single-item "כלי עבודה" + the grab-bag "ידע ועוד":
    // inventory moved in here, and articles/analytics split out below.
    // (automations + AI + plants were retired earlier in the session.)
    titleKey: "groupMyResources",
    items: [
      { href: "/employees", labelKey: "employees", icon: UserCheck },
      { href: "/inventory", labelKey: "inventory", icon: Package },
      { href: "/portfolio", labelKey: "portfolio", icon: Camera },
    ],
  },
  {
    // Performance / decision-data. Split OUT of the old "תובנות וידע"
    // bucket: analytics is data you act on (a strategic, periodic job,
    // done by the owner) and deserves its own weight — it was getting
    // diluted sitting next to the articles "knowledge" content. We keep
    // it separate from פיננסים on purpose: finance is the daily
    // operational money job, analytics is the periodic decision job —
    // different cadence, different person as a business scales.
    titleKey: "groupPerformance",
    items: [
      { href: "/analytics", labelKey: "analytics", icon: BarChart3 },
    ],
  },
  {
    // Knowledge center stands alone at the bottom — it's "nice to have"
    // reference content, not core, so it gets the least prominence.
    titleKey: "groupKnowledge",
    items: [
      { href: "/articles", labelKey: "articles", icon: BookOpen },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const [userName, setUserName] = useState("");
  const [userInitial, setUserInitial] = useState("?");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "";
      setUserName(name);
      setUserInitial((name[0] || "?").toUpperCase());
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="fixed top-0 start-0 h-screen w-64 bg-white border-e border-gray-100 flex flex-col z-40 shadow-sm">
      {/* Logo — clicking returns to the dashboard (home) */}
      <div className="px-5 py-5 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-3 rounded-xl hover:opacity-80 transition-opacity" aria-label={tc("backToDashboard")}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-md">
            <Leaf size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-base leading-tight">{tc("appName")}</h1>
            <p className="text-xs text-gray-400">{tc("appTagline")}</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi === 0 ? "" : "mt-5"}>
            {group.titleKey && (
              <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {t(group.titleKey)}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ href, labelKey, icon: Icon }) => {
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
                    <span>{t(labelKey)}</span>
                    {active && (
                      <span className="ms-auto w-1.5 h-1.5 rounded-full bg-green-500" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-0.5 border-t border-gray-100 pt-3">
        <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all">
          <Settings size={18} className="text-gray-400" />
          <span>{tc("settingsNav")}</span>
        </Link>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all">
          <LogOut size={18} />
          <span>{tc("logout")}</span>
        </button>

        {/* User card */}
        <div className="mt-3 p-3 bg-green-50 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {userInitial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{userName || "..."}</p>
            <p className="text-xs text-gray-500 truncate">{tc("ownerLabel")}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
