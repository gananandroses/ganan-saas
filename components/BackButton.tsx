"use client";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";

interface BackButtonProps {
  /** Optional explicit href to navigate to instead of router.back() */
  href?: string;
  /** Optional className override */
  className?: string;
  /** Optional title (tooltip) */
  title?: string;
}

/**
 * Reusable back button. Defaults to router.back(); falls back to /dashboard
 * if there is no history (e.g. user landed via direct link / PWA shortcut).
 */
export default function BackButton({ href, className, title = "חזור" }: BackButtonProps) {
  const router = useRouter();

  function handleClick() {
    if (href) {
      router.push(href);
      return;
    }
    // If there's history, go back; otherwise go to dashboard
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <button
      onClick={handleClick}
      title={title}
      aria-label={title}
      className={
        className ||
        // 44x44 meets iOS HIG / W3C minimum. Previous 36x36 was 18% below.
        "w-11 h-11 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-100 active:bg-gray-200 active:scale-95 transition-all duration-100"
      }
    >
      <ChevronRight className="w-5 h-5 text-gray-500" />
    </button>
  );
}
