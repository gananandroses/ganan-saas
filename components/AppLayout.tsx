import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50" dir="rtl">
      {/* Sidebar - desktop only */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="flex-1 md:mr-64 min-h-screen overflow-x-hidden pb-20 md:pb-0">
        {children}
      </main>

      {/* Bottom nav - mobile only */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
