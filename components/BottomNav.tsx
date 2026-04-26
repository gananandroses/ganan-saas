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
  { href: "/schedule", label: "לוח זמנים", icon: Calendar },
  { href: "/finance", label: "פיננסים", icon: DollarSign },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 right-0 left-0 bg-white border-t border-gray-200 z-50 safe-area-pb">
        <div className="flex items-center justify-around px-2 py-2">
          {mainItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all"
              >
                <div className={`p-1.5 rounded-xl ${active ? "bg-green-100" : ""}`}>
                  <Icon
                    size={22}
                    className={active ? "text-green-600" : "text-gray-400"}
                  />
                </div>
                <span className={`text-xs font-medium ${active ? "text-green-600" : "text-gray-400"}`}>
                  {label}
                </span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all"
          >
            <div className="p-1.5 rounded-xl">
              <MoreHorizontal size={22} className="text-gray-400" />
            </div>
            <span className="text-xs font-medium text-gray-400">עוד</span>
          </button>
        </div>
      </nav>

      {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} />}
    </>
  );
}
