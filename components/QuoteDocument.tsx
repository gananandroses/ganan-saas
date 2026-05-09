"use client";

// Shared "this is what a quote looks like" — same component renders the
// owner's preview (/quote/[id]), the public link the customer sees
// (/q/[token]), and what comes out of window.print() as a PDF.
//
// Design reference: SUMIT order #1074 the owner shared. Key elements:
//   • Logo + business name top-right; tagline underneath
//   • Contact row: phone · email · biz license · address · website
//   • Document number + "חתום דיגיטלית" pill on the left, date column
//   • "לכבוד:" + customer name (bold)
//   • Big quote title (e.g. "שיפוץ גינה")
//   • Table: name (bold) → multi-line description below in gray
//   • Quantity / unit price / total columns
//   • Bottom totals: סה״כ ללא מע״מ, מע״מ 18%, סה״כ כולל מע״מ (bold)
//   • Footer: produced by גנן Pro + page numbers (print only)
//
// This component is purely presentational — it doesn't fetch, it doesn't
// mutate. Pass it the data and it draws.

import { Phone, Mail, Building2, MapPin, Globe, BadgeCheck } from "lucide-react";

export interface QuoteDocItem {
  id: string;
  name: string;
  unit: string;
  qty: number;
  // Final per-unit price (custom or base)
  unitPrice: number;
  description?: string;
}

export interface QuoteDocBusiness {
  businessName?: string;
  tagline?: string;
  phone?: string;
  email?: string;
  licenseNumber?: string;
  address?: string;
  website?: string;
  logoUrl?: string;
}

export interface QuoteDocCustomer {
  name: string;
  phone?: string | null;
  address?: string | null;
}

export interface QuoteDocProps {
  /** "הזמנה" / "הצעת מחיר" — what to call the document */
  documentLabel?: string;
  /** Document number, e.g. "1074" */
  number?: string | number | null;
  /** ISO yyyy-mm-dd; falls back to today */
  createdAt?: string | null;
  /** "מקור" tag shown next to the date */
  copyLabel?: string;
  /** Whether to render the green "חתום דיגיטלית" pill next to the number */
  digitallySigned?: boolean;
  customer: QuoteDocCustomer;
  /** Big bold project title under the customer ("שיפוץ גינה") */
  title: string;
  items: QuoteDocItem[];
  /** Already-computed subtotal before VAT (₪) */
  subtotal: number;
  /** VAT rate as fraction (0.18 = 18%) */
  vatRate?: number;
  /** Already-computed VAT amount (₪) */
  vatAmount: number;
  /** Already-computed total including VAT (₪) */
  total: number;
  /** Optional discount amount to render between subtotal and VAT */
  discountAmount?: number;
  business?: QuoteDocBusiness;
  /** Notes block under the table (terms, scope, etc.) */
  notes?: string | null;
}

function fmt(n: number) {
  return Math.round(n).toLocaleString("he-IL");
}

function formatDate(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function QuoteDocument({
  documentLabel = "הצעת מחיר",
  number,
  createdAt,
  copyLabel = "מקור",
  digitallySigned = false,
  customer,
  title,
  items,
  subtotal,
  vatRate = 0.18,
  vatAmount,
  total,
  discountAmount,
  business,
  notes,
}: QuoteDocProps) {
  const vatPct = Math.round(vatRate * 100);

  return (
    <article
      dir="rtl"
      className="quote-doc bg-white text-gray-900 mx-auto w-full max-w-[820px] px-6 sm:px-10 py-8 sm:py-10 shadow-sm rounded-lg sm:rounded-2xl print:shadow-none print:rounded-none print:max-w-none print:px-12 print:py-10"
    >
      {/* ── Header: brand + contact ───────────────────────────────────────── */}
      <header className="flex items-start justify-between gap-6 pb-6 border-b border-gray-200">
        <div className="flex items-start gap-4 min-w-0">
          {business?.logoUrl ? (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-white border border-gray-200 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={business.logoUrl} alt={business.businessName ?? "logo"} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center text-3xl flex-shrink-0">
              🌿
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight truncate">
              {business?.businessName || "גנן Pro"}
            </h1>
            {business?.tagline && (
              <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">{business.tagline}</p>
            )}
          </div>
        </div>
      </header>

      {/* ── Contact row ─────────────────────────────────────────────────────── */}
      {(business?.phone || business?.email || business?.licenseNumber || business?.address || business?.website) && (
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-[11px] sm:text-xs text-gray-500">
          {business.licenseNumber && (
            <span className="flex items-center gap-1.5"><Building2 size={11} className="opacity-70" />עוסק מורשה: {business.licenseNumber}</span>
          )}
          {business.email && (
            <span className="flex items-center gap-1.5" dir="ltr"><Mail size={11} className="opacity-70" />{business.email}</span>
          )}
          {business.phone && (
            <span className="flex items-center gap-1.5" dir="ltr"><Phone size={11} className="opacity-70" />{business.phone}</span>
          )}
          {business.address && (
            <span className="flex items-center gap-1.5"><MapPin size={11} className="opacity-70" />{business.address}</span>
          )}
          {business.website && (
            <span className="flex items-center gap-1.5" dir="ltr"><Globe size={11} className="opacity-70" />{business.website}</span>
          )}
        </div>
      )}

      {/* ── Document number / date row ──────────────────────────────────────── */}
      <div className="flex items-center justify-between mt-7 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {documentLabel}{number !== undefined && number !== null ? ` ${number}` : ""}
          </h2>
          {digitallySigned && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
              <BadgeCheck size={12} />
              חתום דיגיטלית
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-500">
          {copyLabel && <span className="font-medium">{copyLabel}</span>}
          <span className="h-4 w-px bg-gray-300 hidden sm:block" />
          <span>{formatDate(createdAt)}</span>
        </div>
      </div>

      {/* ── Customer ────────────────────────────────────────────────────────── */}
      <div className="mb-7">
        <p className="text-xs text-gray-400 mb-1">לכבוד:</p>
        <p className="text-base sm:text-lg font-bold text-gray-900">{customer.name}</p>
        {customer.address && <p className="text-xs text-gray-500 mt-0.5">{customer.address}</p>}
        {customer.phone && <p className="text-xs text-gray-500 mt-0.5" dir="ltr">{customer.phone}</p>}
      </div>

      {/* ── Project title ───────────────────────────────────────────────────── */}
      <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">{title}</h3>

      {/* ── Items table ─────────────────────────────────────────────────────── */}
      <div className="border-t border-b border-gray-200">
        {/* Header row */}
        <div className="grid grid-cols-12 gap-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100">
          <div className="col-span-6">מוצר/שירות</div>
          <div className="col-span-2 text-center">כמות</div>
          <div className="col-span-2 text-left">מחיר</div>
          <div className="col-span-2 text-left">סה״כ</div>
        </div>

        {/* Rows */}
        {items.map((it) => {
          const lineTotal = it.qty * it.unitPrice;
          return (
            <div key={it.id} className="grid grid-cols-12 gap-3 py-3.5 border-b border-gray-100 last:border-0">
              <div className="col-span-6">
                <p className="text-sm font-bold text-gray-900 leading-tight">{it.name}</p>
                {it.description && (
                  <p className="text-[11px] sm:text-xs text-gray-500 mt-1.5 whitespace-pre-line leading-relaxed">
                    {it.description}
                  </p>
                )}
              </div>
              <div className="col-span-2 text-center text-sm text-gray-700 self-start pt-0.5 font-medium">
                {fmt(it.qty)}
              </div>
              <div className="col-span-2 text-left text-sm text-gray-700 self-start pt-0.5 font-medium tabular-nums">
                {fmt(it.unitPrice)}
              </div>
              <div className="col-span-2 text-left text-sm text-gray-900 self-start pt-0.5 font-bold tabular-nums">
                {fmt(lineTotal)}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Totals ──────────────────────────────────────────────────────────── */}
      <div className="mt-5 flex justify-start">
        <div className="w-full sm:w-80 space-y-1.5">
          {discountAmount !== undefined && discountAmount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">הנחה</span>
              <span className="text-gray-700 tabular-nums">−₪{fmt(discountAmount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">סה״כ ללא מע״מ</span>
            <span className="text-gray-800 tabular-nums">{fmt(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{vatPct}% מע״מ</span>
            <span className="text-gray-700 tabular-nums">{fmt(vatAmount)}</span>
          </div>
          <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-200">
            <span className="text-sm font-semibold text-gray-700">סה״כ כולל מע״מ</span>
            <span className="text-xl sm:text-2xl font-extrabold text-gray-900 tabular-nums">
              ₪{fmt(total)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Notes block ─────────────────────────────────────────────────────── */}
      {notes && notes.trim() && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-500 mb-2">הערות ותנאים</p>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed whitespace-pre-line">
            {notes}
          </p>
        </div>
      )}

      {/* ── Print-only footer ───────────────────────────────────────────────── */}
      <div className="hidden print:flex items-center justify-between mt-12 pt-4 border-t border-gray-200 text-[10px] text-gray-400">
        <span>מסמך ממוחשב הופק באמצעות גנן Pro</span>
        <span>{documentLabel}{number ? ` / ${number}` : ""}</span>
      </div>

      {/* Print rules — keep margins tight, drop shadows, ensure black text */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm 14mm;
          }
          body {
            background: white !important;
          }
          /* Hide everything outside the document on print */
          body > *:not(.quote-doc-print-root):not(script):not(style) {
            display: none !important;
          }
          .quote-doc {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </article>
  );
}

// Helper — wrap the document in a print-eligible root so the "hide siblings"
// rule above can target only this tree without breaking the rest of the page.
export function QuoteDocumentPrintRoot({ children }: { children: React.ReactNode }) {
  return <div className="quote-doc-print-root">{children}</div>;
}

