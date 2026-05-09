"use client";

// Generic skeleton primitives. Used in place of Loader2 spinners for
// page-level data loads where the layout is predictable. Reduces the
// "is this thing broken?" feeling that a centred spinner produces and
// gives the user a layout to anticipate.
//
// Usage:
//   <SkeletonCard />            // generic 1-line + body
//   <SkeletonRow />             // single tx/customer row
//   <SkeletonKpi />             // KPI tile placeholder
//   <SkeletonList rows={5} />   // stacked rows

import React from "react";

const baseShimmer =
  "relative overflow-hidden bg-gray-200/70 rounded";
// We use Tailwind's animate-pulse rather than a custom shimmer so it stays
// in the framework's keyframe budget; visually similar enough for first-paint
// reassurance.

export function SkeletonBlock({
  className = "",
  width,
  height,
}: { className?: string; width?: string | number; height?: string | number }) {
  const style: React.CSSProperties = {};
  if (width !== undefined) style.width = typeof width === "number" ? `${width}px` : width;
  if (height !== undefined) style.height = typeof height === "number" ? `${height}px` : height;
  return <div className={`${baseShimmer} animate-pulse ${className}`} style={style} aria-hidden="true" />;
}

export function SkeletonText({ width = "100%" }: { width?: string | number }) {
  return <SkeletonBlock width={width} height={12} className="rounded-md" />;
}

export function SkeletonKpi() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 sm:p-6 border border-gray-100 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <SkeletonBlock width={40} height={40} className="rounded-xl" />
        <SkeletonBlock width={48} height={14} className="rounded-md" />
      </div>
      <div>
        <SkeletonBlock width={"60%"} height={28} className="rounded-md mb-1.5" />
        <SkeletonBlock width={"40%"} height={12} className="rounded-md" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/60 border border-gray-100">
      <SkeletonBlock width={36} height={36} className="rounded-lg flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <SkeletonBlock width={"50%"} height={14} className="rounded-md" />
        <SkeletonBlock width={"30%"} height={11} className="rounded-md" />
      </div>
      <SkeletonBlock width={60} height={18} className="rounded-md flex-shrink-0" />
    </div>
  );
}

export function SkeletonList({ rows = 4, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} role="status" aria-label="טוען נתונים">
      {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
    </div>
  );
}

export function SkeletonCustomerCard() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2.5">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-1.5">
          <SkeletonBlock width={"50%"} height={14} className="rounded-md" />
          <SkeletonBlock width={"30%"} height={11} className="rounded-md" />
        </div>
        <SkeletonBlock width={56} height={18} className="rounded-md flex-shrink-0" />
      </div>
      <div className="border-t border-gray-50 pt-2 flex justify-between">
        <SkeletonBlock width={"35%"} height={11} className="rounded-md" />
        <SkeletonBlock width={"25%"} height={11} className="rounded-md" />
      </div>
    </div>
  );
}

export function SkeletonChart({ height = 240 }: { height?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="טוען נתונים">
      <SkeletonBlock height={height} className="rounded-2xl" />
    </div>
  );
}
