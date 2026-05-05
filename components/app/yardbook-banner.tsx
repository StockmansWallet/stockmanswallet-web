"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle, CalendarCheck, X } from "lucide-react";

type YardbookAction = "created" | "updated" | "error";

/**
 * Shows a confirmation or warning banner after breeding milestones are synced
 * to Yardbook. Reads ?yardbook=created|updated|error from the URL and
 * auto-dismisses after 8 seconds (error banner is persistent until dismissed).
 */
export function YardbookBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [action, setAction] = useState<YardbookAction | null>(null);

  useEffect(() => {
    const yb = searchParams.get("yardbook");
    if (yb === "created" || yb === "updated" || yb === "error") {
      setAction(yb);
      setVisible(true);

      // Debug: Clean up the URL param so it doesn't persist on refresh
      const params = new URLSearchParams(searchParams.toString());
      params.delete("yardbook");
      const cleanUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(cleanUrl, { scroll: false });

      // Success banners self-dismiss; error stays visible until acknowledged.
      if (yb !== "error") {
        const timer = setTimeout(() => setVisible(false), 8000);
        return () => clearTimeout(timer);
      }
    }
  }, [searchParams, router, pathname]);

  if (!visible || !action) return null;

  if (action === "error") {
    return (
      <div className="border-error/40 bg-error/10 text-error mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex-1">
          <p className="font-medium">Yardbook sync failed</p>
          <p className="text-error/80 mt-0.5">
            The herd was saved, but breeding milestones could not be scheduled in Yardbook. Open
            the Yardbook tab and check your reminders, or edit the herd to retry.
          </p>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-error/60 hover:text-error shrink-0 rounded p-0.5"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const message =
    action === "created"
      ? "Breeding milestones (joining period, pregnancy testing, and expected calving) have been added to your Yardbook with reminders."
      : "Breeding milestones have been updated in your Yardbook to reflect the new joining period dates.";

  return (
    <div className="text-warning border-warning/40 bg-warning/10 mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm">
      <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">
          {action === "created" ? "Added to Yardbook" : "Yardbook Updated"}
        </p>
        <p className="text-warning/80 mt-0.5">{message}</p>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="text-warning/60 hover:text-warning shrink-0 rounded p-0.5"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
