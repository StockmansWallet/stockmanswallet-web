"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useViewMode } from "@/lib/hooks/use-view-mode";

/**
 * When view mode is "advisor", redirects from /dashboard to /dashboard/advisor/clients.
 * Renders nothing - just handles the redirect.
 */
export function AdvisorRedirect() {
  const { viewMode } = useViewMode();
  const router = useRouter();

  useEffect(() => {
    if (viewMode === "advisor") {
      router.replace("/dashboard/advisor");
    }
  }, [viewMode, router]);

  return null;
}
