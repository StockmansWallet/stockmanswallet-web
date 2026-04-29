"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Keeps the Producer Network landing in sync without a manual refresh.
 * Uses three layers:
 *   1. Supabase Realtime subscriptions on connection_requests and
 *      notifications scoped to the current user so request state,
 *      unread pills, and sort order update the moment something
 *      changes.
 *   2. Refresh on tab-focus (catches any missed realtime events).
 *   3. Periodic refresh every 15s as a safety net.
 *
 * Note: there is no realtime subscription on advisory_messages here.
 * That table doesn't have a user_id column, so the only filter we
 * could apply is connection_id, which would mean a separate
 * subscription per connection. Subscribing without a filter (the
 * previous implementation) fired router.refresh() on every message
 * sent by anyone in the system, which RLS then trimmed to nothing.
 * The 15s polling layer covers conversation-list sort order; the
 * chat detail page has its own filtered advisory_messages
 * subscription for live message delivery.
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

    // Use the full user id in the channel name. Truncating to 8 chars
    // created a small but non-zero collision risk between users sharing
    // a UUID prefix; a collision would silently merge their realtime
    // streams (each user would receive the other's events, RLS-filtered
    // to nothing - the symptom would be the hub appearing to refresh
    // constantly with no data changes).
    const channel = supabase
      .channel(`producer-connections-${userId}`)
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
