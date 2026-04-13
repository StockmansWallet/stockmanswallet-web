"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Invisible component that auto-refreshes the page when connection_requests
// change. Uses RLS (not column filters) to scope events to the current user.
// Also refreshes on tab focus as a fallback for any missed events.
export function ConnectionRealtime({ userId }: { userId: string }) {
  const router = useRouter();
  const lastRefresh = useRef(0);

  // Debounce refreshes to avoid multiple rapid re-renders
  const debouncedRefresh = useCallback(() => {
    const now = Date.now();
    if (now - lastRefresh.current < 2000) return;
    lastRefresh.current = now;
    router.refresh();
  }, [router]);

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to ALL connection_requests changes visible to this user (RLS-scoped)
    const channel = supabase
      .channel(`conn-live-${userId.slice(0, 8)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connection_requests",
        },
        () => {
          debouncedRefresh();
        }
      )
      .subscribe();

    // Fallback: refresh on tab focus (catches missed Realtime events)
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        debouncedRefresh();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [userId, debouncedRefresh]);

  return null;
}
