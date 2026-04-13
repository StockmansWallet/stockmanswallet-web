"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Auto-refreshes the page when connection_requests change for the current user.
// Mirrors the notification bell pattern: authenticate first, then subscribe with
// a column filter. Two channels cover both directions (as requester and as target).
export function ConnectionRealtime({ userId }: { userId: string }) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;
    let channelA: ReturnType<typeof supabase.channel> | null = null;
    let channelB: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      // Ensure authenticated (same pattern as notification bell)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const handler = () => { router.refresh(); };

      // Channel 1: changes where current user is the requester
      channelA = supabase
        .channel(`conn-req-${user.id.slice(0, 8)}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "connection_requests",
            filter: `requester_user_id=eq.${user.id}`,
          },
          handler
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "connection_requests",
            filter: `requester_user_id=eq.${user.id}`,
          },
          handler
        )
        .subscribe();

      // Channel 2: changes where current user is the target
      channelB = supabase
        .channel(`conn-tgt-${user.id.slice(0, 8)}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "connection_requests",
            filter: `target_user_id=eq.${user.id}`,
          },
          handler
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "connection_requests",
            filter: `target_user_id=eq.${user.id}`,
          },
          handler
        )
        .subscribe();
    }

    init();

    return () => {
      if (channelA) supabase.removeChannel(channelA);
      if (channelB) supabase.removeChannel(channelB);
    };
  }, [userId, router]);

  return null;
}
