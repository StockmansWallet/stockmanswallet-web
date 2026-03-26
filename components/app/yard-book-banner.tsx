"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarCheck, X } from "lucide-react";

/**
 * Shows a confirmation banner when breeding milestones are synced to Yard Book.
 * Reads ?yardbook=created|updated from the URL and auto-dismisses after 8 seconds.
 * Cleans up the URL param without a full page reload.
 */
export function YardBookBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [action, setAction] = useState<"created" | "updated" | null>(null);

  useEffect(() => {
    const yb = searchParams.get("yardbook");
    if (yb === "created" || yb === "updated") {
      setAction(yb);
      setVisible(true);

      // Debug: Clean up the URL param so it doesn't persist on refresh
      const params = new URLSearchParams(searchParams.toString());
      params.delete("yardbook");
      const cleanUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;
      router.replace(cleanUrl, { scroll: false });

      // Debug: Auto-dismiss after 8 seconds
      const timer = setTimeout(() => setVisible(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, router, pathname]);

  if (!visible || !action) return null;

  const message =
    action === "created"
      ? "Breeding milestones (joining period, pregnancy testing, and expected calving) have been added to your Yard Book with reminders."
      : "Breeding milestones have been updated in your Yard Book to reflect the new joining period dates.";

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-700/30 bg-amber-900/20 px-4 py-3 text-sm text-amber-300">
      <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">
          {action === "created" ? "Added to Yard Book" : "Yard Book Updated"}
        </p>
        <p className="mt-0.5 text-amber-400/80">{message}</p>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="shrink-0 rounded p-0.5 text-amber-400/60 hover:text-amber-300"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
