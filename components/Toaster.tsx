"use client";

// Lightweight toast system — replaces every alert()/confirm() in the app
// without pulling in a dependency.
//
// Usage:
//   import { toast } from "@/components/Toaster";
//   toast.success("העבודה נשמרה");
//   toast.error("לא הצלחנו לשמור, נסה שוב");
//   toast.info("טיפ קטן");
//
// For destructive confirmations with undo:
//   toast.action({
//     message: "הלקוח נמחק",
//     actionLabel: "ביטול",
//     onAction: () => restore(),
//   });
//
// Mount <Toaster /> once at the root of the app (already wired into AppLayout).

import { useEffect, useState, useCallback } from "react";
import { CheckCircle, AlertCircle, Info, X, Loader2 } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type ToastVariant = "success" | "error" | "info" | "loading" | "action";

export interface Toast {
  id: number;
  variant: ToastVariant;
  message: string;
  description?: string;
  durationMs: number;
  actionLabel?: string;
  onAction?: () => void;
}

// ── Singleton store ─────────────────────────────────────────────────────────
// We don't use Zustand or a context here — a tiny pub/sub keeps the API as
// `toast.success(...)` callable from anywhere, including outside React.

let nextId = 1;
const listeners = new Set<(toasts: Toast[]) => void>();
let current: Toast[] = [];

function emit() {
  for (const fn of listeners) fn(current);
}

function push(t: Omit<Toast, "id">): number {
  const id = nextId++;
  current = [...current, { ...t, id }];
  emit();
  if (t.durationMs > 0) {
    setTimeout(() => dismiss(id), t.durationMs);
  }
  return id;
}

function dismiss(id: number) {
  current = current.filter(t => t.id !== id);
  emit();
}

function dismissAll() {
  current = [];
  emit();
}

// ── Public API ──────────────────────────────────────────────────────────────

export const toast = {
  success(message: string, description?: string) {
    return push({ variant: "success", message, description, durationMs: 3500 });
  },
  error(message: string, description?: string) {
    return push({ variant: "error", message, description, durationMs: 5000 });
  },
  info(message: string, description?: string) {
    return push({ variant: "info", message, description, durationMs: 3000 });
  },
  loading(message: string) {
    // Returns the id so the caller can update via toast.update or dismiss when done.
    return push({ variant: "loading", message, durationMs: 0 });
  },
  action(opts: { message: string; description?: string; actionLabel: string; onAction: () => void; durationMs?: number }) {
    return push({
      variant: "action",
      message: opts.message,
      description: opts.description,
      actionLabel: opts.actionLabel,
      onAction: opts.onAction,
      durationMs: opts.durationMs ?? 6000,
    });
  },
  dismiss,
  dismissAll,
};

// ── Confirm dialog (replacement for confirm()) ──────────────────────────────
// confirm() blocks the JS thread; we want a non-blocking promise-based modal.
// Implemented as a separate event so the Toaster component can render it.

type ConfirmOpts = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};
type ConfirmResolver = (ok: boolean) => void;
let confirmListener: ((opts: ConfirmOpts, resolve: ConfirmResolver) => void) | null = null;

export function confirmDialog(opts: ConfirmOpts): Promise<boolean> {
  return new Promise(resolve => {
    if (!confirmListener) {
      // No <Toaster /> mounted — fail safe to native confirm so we don't deadlock.
      resolve(window.confirm(`${opts.title}${opts.description ? "\n\n" + opts.description : ""}`));
      return;
    }
    confirmListener(opts, resolve);
  });
}

// ── React component ─────────────────────────────────────────────────────────

export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<{ opts: ConfirmOpts; resolve: ConfirmResolver } | null>(null);

  useEffect(() => {
    const fn = (next: Toast[]) => setToasts(next);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);

  useEffect(() => {
    confirmListener = (opts, resolve) => setConfirmState({ opts, resolve });
    return () => { confirmListener = null; };
  }, []);

  const close = useCallback((ok: boolean) => {
    if (!confirmState) return;
    confirmState.resolve(ok);
    setConfirmState(null);
  }, [confirmState]);

  return (
    <>
      {/* Toast stack — bottom-center on mobile, bottom-left on desktop */}
      <div
        dir="rtl"
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-[max(16px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 sm:left-4 sm:translate-x-0 z-[100] flex flex-col-reverse gap-2 pointer-events-none"
      >
        {toasts.slice(-3).map(t => (
          <ToastView key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>

      {/* Confirm dialog */}
      {confirmState && (
        <ConfirmView
          opts={confirmState.opts}
          onCancel={() => close(false)}
          onConfirm={() => close(true)}
        />
      )}
    </>
  );
}

// ── Toast item ──────────────────────────────────────────────────────────────

function ToastView({ toast: t, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const styleByVariant: Record<ToastVariant, { bg: string; ring: string; text: string; icon: React.ReactNode }> = {
    success: {
      bg: "bg-white",
      ring: "ring-1 ring-gray-200",
      text: "text-gray-900",
      icon: <CheckCircle size={18} className="text-green-600 flex-shrink-0" />,
    },
    error: {
      bg: "bg-white",
      ring: "ring-1 ring-red-200",
      text: "text-gray-900",
      icon: <AlertCircle size={18} className="text-red-500 flex-shrink-0" />,
    },
    info: {
      bg: "bg-white",
      ring: "ring-1 ring-gray-200",
      text: "text-gray-900",
      icon: <Info size={18} className="text-blue-500 flex-shrink-0" />,
    },
    loading: {
      bg: "bg-white",
      ring: "ring-1 ring-gray-200",
      text: "text-gray-900",
      icon: <Loader2 size={18} className="text-gray-500 animate-spin flex-shrink-0" />,
    },
    action: {
      bg: "bg-gray-900",
      ring: "",
      text: "text-white",
      icon: <Info size={18} className="text-amber-400 flex-shrink-0" />,
    },
  };
  const s = styleByVariant[t.variant];

  return (
    <div
      role="status"
      className={`pointer-events-auto ${s.bg} ${s.ring} ${s.text} rounded-2xl shadow-lg w-[calc(100vw-2rem)] sm:w-[380px] px-4 py-3 flex items-start gap-3 animate-toast-in`}
    >
      {s.icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">{t.message}</p>
        {t.description && <p className={`text-xs mt-0.5 ${t.variant === "action" ? "text-gray-300" : "text-gray-500"}`}>{t.description}</p>}
      </div>
      {t.variant === "action" && t.actionLabel && t.onAction && (
        <button
          onClick={() => { t.onAction!(); dismiss(t.id); }}
          className="text-sm font-bold text-amber-400 hover:text-amber-300 px-2 -mr-1 flex-shrink-0"
        >
          {t.actionLabel}
        </button>
      )}
      <button
        onClick={onDismiss}
        aria-label="סגור"
        className={`hit-44 flex-shrink-0 p-1 rounded transition opacity-50 hover:opacity-100 ${t.variant === "action" ? "text-white" : "text-gray-400"}`}
      >
        <X size={14} />
      </button>

      <style jsx>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-toast-in { animation: toast-in 200ms cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}

// ── Confirm modal ───────────────────────────────────────────────────────────

function ConfirmView({ opts, onCancel, onConfirm }: { opts: ConfirmOpts; onCancel: () => void; onConfirm: () => void }) {
  const isDestructive = opts.destructive ?? false;

  // Lock body scroll while open and trap focus crudely (escape closes)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel, onConfirm]);

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white w-full sm:max-w-sm sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-sheet-in">
        <div className="px-5 pt-5 pb-2">
          <h3 id="confirm-title" className="text-base font-bold text-gray-900">{opts.title}</h3>
          {opts.description && (
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{opts.description}</p>
          )}
        </div>
        <div className="px-5 py-4 flex flex-col-reverse sm:flex-row gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 min-h-[44px]"
          >
            {opts.cancelLabel ?? "ביטול"}
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className={`flex-1 py-3 rounded-2xl text-white text-sm font-bold min-h-[44px] ${
              isDestructive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {opts.confirmLabel ?? "אישור"}
          </button>
        </div>

        <style jsx>{`
          @keyframes sheet-in {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .animate-sheet-in { animation: sheet-in 220ms cubic-bezier(0.16, 1, 0.3, 1); }
        `}</style>
      </div>
    </div>
  );
}
