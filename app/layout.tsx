import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "גנן Pro — ניהול עסק גינון",
  description: "מערכת SaaS מתקדמת לניהול עסק גינון",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full bg-slate-50">{children}</body>
    </html>
  );
}
