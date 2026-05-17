"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Calendar, DollarSign, MoreHorizontal,
} from "lucide-react";
import { useState } from "react";
import MobileMenu from "./MobileMenu";

const mainItems = [
  { href: "/dashboard", label: "דשבורד", icon: LayoutDashboard },
  { href: "/customers", label: "לקוחות", icon: Users },
  { href: "/schedule", label: "יומן", icon: Calendar },
  { href: "/finance", label: "פיננסים", icon: DollarSign },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 right-0 left-0 bg-white border-t border-gray-200 z-50 safe-area-pb">
        {/* Each tab now meets the iOS HIG 44×44 minimum: container is
            min-h-12 with vertical padding, and the icon chip itself is
            44×44. Previous py-1 layout produced ~24px tap targets. */}
        <div className="flex items-stretch justify-around px-1">
          {mainItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] rounded-xl transition-all active:bg-gray-50"
              >
                <div className={`w-11 h-11 flex items-center justify-center rounded-xl ${active ? "bg-green-100" : ""}`}>
                  <Icon
                    size={22}
                    className={active ? "text-green-600" : "text-gray-500"}
                  />
                </div>
                <span className={`text-[11px] font-medium leading-none ${active ? "text-green-600" : "text-gray-500"}`}>
                  {label}
                </span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="פתח תפריט נוסף"
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] rounded-xl transition-all active:bg-gray-50"
          >
            <div className="w-11 h-11 flex items-center justify-center rounded-xl">
              <MoreHorizontal size={22} className="text-gray-500" />
            </div>
            <span className="text-[11px] font-medium leading-none text-gray-500">עוד</span>
          </button>
        </div>
      </nav>

      {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} />}
    </>
  );
}
