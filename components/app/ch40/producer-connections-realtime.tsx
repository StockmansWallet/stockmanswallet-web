"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Keeps the Producer Network landing in sync without a manual refresh.
 * Uses the same triple-layer approach as the notification bell:
 *   1. Supabase Realtime subscriptions on connection_requests,
 *      notifications, and advisory_messages so request state, unread pills,
 *      previews, and sort order update the moment something changes.
 *   2. Refresh on tab-focus (catches any missed realtime events).
 *   3. Periodic refresh every 15s as a safety net.
 *
 * Handler just calls router.refresh() so the server component re-queries
 * Supabase; no client-side state to keep in sync.
 */
export function ProducerConnectionsRealtime({ userId }: { userId: string }) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;
    let cancelled = false;

    // setAuth is required on cookie-auth clients: without it, the
    // realtime websocket uses the anon key and Postgres Changes events
    // filtered by user_id never arrive.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled && session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
    });

    const channel = supabase
      .channel(`producer-connections-${userId.slice(0, 8)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connection_requests",
          filter: `requester_user_id=eq.${userId}`,
        },
        () => { if (!cancelled) router.refresh(); },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connection_requests",
          filter: `target_user_id=eq.${userId}`,
        },
        () => { if (!cancelled) router.refresh(); },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => { if (!cancelled) router.refresh(); },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "advisory_messages",
        },
        () => { if (!cancelled) router.refresh(); },
      )
      .subscribe();

    function handleVisibility() {
      if (document.visibilityState === "visible" && !cancelled) {
        router.refresh();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    const interval = setInterval(() => {
      if (!cancelled) router.refresh();
    }, 15000);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, [userId, router]);

  return null;
}
