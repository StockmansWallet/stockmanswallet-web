"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Auto-refreshes the page when the user receives a new notification.
// Uses the notifications table (proven to work via the notification bell)
// rather than connection_requests (which has unreliable Realtime delivery).
// When a connection-related notification arrives (accept, deny, new request),
// the page refreshes to show the updated state.
export function ConnectionRealtime({ userId }: { userId: string }) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  useEffect(() => {
    const supabase = supabaseRef.current;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Listen for new notifications (same table the bell uses, proven reliable)
      const channel = supabase
        .channel(`conn-sync-${user.id.slice(0, 8)}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            refresh();
          }
        )
        .subscribe();

      return channel;
    }

    let channelRef: Awaited<ReturnType<typeof init>>;
    init().then((ch) => { channelRef = ch; });

    return () => {
      if (channelRef) supabase.removeChannel(channelRef);
    };
  }, [userId, refresh]);

  return null;
}
