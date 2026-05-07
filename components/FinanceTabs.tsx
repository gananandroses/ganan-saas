"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, User } from "lucide-react";

const tabs = [
  { href: "/finance",          label: "עסקי", icon: Briefcase },
  { href: "/finance/personal", label: "אישי", icon: User },
];

export default function FinanceTabs() {
  const pathname = usePathname();
  // /finance/personal must match itself (not /finance), so longest-prefix wins.
  const active = [...tabs].sort((a, b) => b.href.length - a.href.length)
    .find(t => pathname === t.href || pathname.startsWith(t.href + "/"))?.href ?? "/finance";

  return (
    <div className="bg-white border-b border-gray-100 px-4 sm:px-6" dir="rtl">
      <div className="max-w-screen-xl mx-auto flex items-center gap-1">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = active === href;
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "text-green-700"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <Icon size={15} className={isActive ? "text-green-600" : "text-gray-400"} />
              <span>{label}</span>
              {isActive && (
                <span className="absolute right-0 left-0 -bottom-px h-0.5 bg-green-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
