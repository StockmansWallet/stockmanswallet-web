"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Keeps advisory pages in sync with connection changes. Uses the same
// triple-layer approach as the notification bell:
// 1. Supabase Realtime subscription (instant when it fires)
// 2. Visibility change handler (refresh on tab focus)
// 3. Periodic check (safety net every 10 seconds)
//
// Only calls router.refresh() when the actual data has changed (compares
// a hash of connection IDs and statuses to avoid unnecessary re-renders).
export function ConnectionRealtime({ userId }: { userId: string }) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const lastHash = useRef("");
  const isMounted = useRef(true);

  const checkAndRefresh = useCallback(async () => {
    if (!isMounted.current) return;
    const supabase = supabaseRef.current;

    const { data } = await supabase
      .from("connection_requests")
      .select("id, status, updated_at")
      .or(`requester_user_id.eq.${userId},target_user_id.eq.${userId}`)
      .in("status", ["pending", "approved"])
      .order("id");

    const hash = (data ?? []).map((r) => `${r.id}:${r.status}:${r.updated_at}`).join("|");

    if (lastHash.current !== "" && hash !== lastHash.current) {
      router.refresh();
    }
    lastHash.current = hash;
  }, [userId, router]);

  useEffect(() => {
    isMounted.current = true;
    const supabase = supabaseRef.current;

    // Initial hash capture
    checkAndRefresh();

    // Layer 1: Realtime subscription on notifications table
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function initRealtime() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted.current) return;

      channel = supabase
        .channel(`conn-sync-${user.id.slice(0, 8)}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => { checkAndRefresh(); }
        )
        .subscribe();
    }
    initRealtime();

    // Layer 2: Refresh on tab focus
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        checkAndRefresh();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    // Layer 3: Periodic check every 10 seconds
    const interval = setInterval(checkAndRefresh, 10000);

    return () => {
      isMounted.current = false;
      if (channel) supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, [userId, checkAndRefresh]);

  return null;
}
