import AppLayout from "@/components/AppLayout";
import FinanceTabs from "@/components/FinanceTabs";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout>
      <FinanceTabs />
      {children}
    </AppLayout>
  );
}
