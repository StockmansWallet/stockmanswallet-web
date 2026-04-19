"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type UnreadCounts = Record<string, number>;

interface SidebarNotificationsContextValue {
  counts: UnreadCounts;
}

const SidebarNotificationsContext = createContext<SidebarNotificationsContextValue>({
  counts: {},
});

export function useSidebarNotifications() {
  return useContext(SidebarNotificationsContext);
}

export function SidebarNotificationsProvider({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState<UnreadCounts>({});
  const supabaseRef = useRef(createClient());
  const userIdRef = useRef<string | null>(null);

  const fetchCounts = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (!userIdRef.current) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userIdRef.current = user.id;
    }

    // Fetch unread rows and tally by type client-side. Postgres GROUP BY is
    // not directly available through PostgREST without an RPC, and the total
    // unread set per user is tiny, so a single select is fine.
    const { data } = await supabase
      .from("notifications")
      .select("type")
      .eq("user_id", userIdRef.current)
      .eq("is_read", false);

    if (!data) return;

    const tally: UnreadCounts = {};
    for (const row of data) {
      const key = (row as { type: string }).type;
      tally[key] = (tally[key] ?? 0) + 1;
    }
    setCounts(tally);
  }, []);

  useEffect(() => {
    const supabase = supabaseRef.current;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      await fetchCounts();

      if (!userIdRef.current) return;

      // setAuth is required on cookie-auth clients: they default the
      // websocket to the anon key, so RLS-filtered postgres_changes won't
      // deliver events without the user JWT.
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }

      channel = supabase
        .channel(`sidebar-notifications-${userIdRef.current.slice(0, 8)}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userIdRef.current}`,
          },
          () => { fetchCounts(); },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userIdRef.current}`,
          },
          () => { fetchCounts(); },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userIdRef.current}`,
          },
          () => { fetchCounts(); },
        )
        .subscribe();
    }

    init();

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") fetchCounts();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Safety net when realtime is quiet or a websocket event is missed.
    const interval = setInterval(fetchCounts, 15000);

    return () => {
      if (channel) supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [fetchCounts]);

  return (
    <SidebarNotificationsContext.Provider value={{ counts }}>
      {children}
    </SidebarNotificationsContext.Provider>
  );
}
