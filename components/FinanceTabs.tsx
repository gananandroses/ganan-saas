"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, User } from "lucide-react";

const tabs = [
  { href: "/finance",          label: "עסקי", icon: Briefcase },
  { href: "/finance/personal", label: "אישי", icon: User },
];

// A prominent segmented-pill switcher. Cash-flow management is the core of
// running a service business, so the business/personal context switch has
// to read as a real, clickable surface — not a quiet underline that gets
// lost under the page header.
export default function FinanceTabs() {
  const pathname = usePathname();
  // /finance/personal must match itself (not /finance), so longest-prefix wins.
  const active = [...tabs].sort((a, b) => b.href.length - a.href.length)
    .find(t => pathname === t.href || pathname.startsWith(t.href + "/"))?.href ?? "/finance";

  return (
    <div className="bg-gray-50 px-4 sm:px-6 pt-4 pb-3 border-b border-gray-100" dir="rtl">
      <div className="max-w-screen-xl mx-auto">
        <div
          role="tablist"
          aria-label="הקשר פיננסי"
          className="inline-flex w-full sm:w-auto items-stretch bg-white border border-gray-200 rounded-2xl p-1 shadow-sm"
        >
          {tabs.map(({ href, label, icon: Icon }) => {
            const isActive = active === href;
            return (
              <Link
                key={href}
                href={href}
                role="tab"
                aria-selected={isActive}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 sm:px-7 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? "bg-green-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                <Icon size={16} className={isActive ? "text-white" : "text-gray-400"} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
