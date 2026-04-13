"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Invisible component that subscribes to connection_requests changes via
// Supabase Realtime and auto-refreshes the page when a change is detected.
// Watches both directions (as requester and as target) so both the advisor
// and producer see updates immediately without manual refresh.
export function ConnectionRealtime({ userId }: { userId: string }) {
  const router = useRouter();
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to changes where current user is the requester
    const channelRequester = supabase
      .channel("conn-requester")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connection_requests",
          filter: `requester_user_id=eq.${userIdRef.current}`,
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    // Subscribe to changes where current user is the target
    const channelTarget = supabase
      .channel("conn-target")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connection_requests",
          filter: `target_user_id=eq.${userIdRef.current}`,
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelRequester);
      supabase.removeChannel(channelTarget);
    };
  }, [router]);

  return null;
}
