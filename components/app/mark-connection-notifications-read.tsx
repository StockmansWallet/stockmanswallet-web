"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { markConnectionNotificationsAsRead } from "@/app/(app)/dashboard/notifications/actions";

interface MarkConnectionNotificationsReadProps {
  // Chat connection the user is actively viewing. Any unread notification
  // tied to this connection is marked read on mount AND whenever a new
  // one arrives while the user is still here, so the sidebar badge count
  // never reflects messages they are already reading.
  connectionId: string;
}

export function MarkConnectionNotificationsRead({ connectionId }: MarkConnectionNotificationsReadProps) {
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      // Clear whatever was unread when the user arrived on the page.
      await markConnectionNotificationsAsRead(connectionId);
      if (cancelled) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      // Same setAuth dance as the other realtime clients: cookie-auth
      // sockets default to the anon key and silently drop filtered events
      // without the user JWT.
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }

      channel = supabase
        .channel(`chat-mark-read-${connectionId.slice(0, 8)}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as { related_connection_id: string | null };
            if (row.related_connection_id === connectionId) {
              void markConnectionNotificationsAsRead(connectionId);
            }
          },
        )
        .subscribe();
    }

    void init();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [connectionId]);

  return null;
}
