"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export function NotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0);
  const supabaseRef = useRef(createClient());
  const userIdRef = useRef<string | null>(null);

  const fetchCount = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (!userIdRef.current) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userIdRef.current = user.id;
    }

    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userIdRef.current)
      .eq("is_read", false);

    setUnreadCount(count ?? 0);
  }, []);

  useEffect(() => {
    const supabase = supabaseRef.current;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      await fetchCount();

      if (!userIdRef.current) return;

      // Realtime subscription with user_id filter
      channel = supabase
        .channel("notification-badge")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userIdRef.current}`,
          },
          () => {
            setUnreadCount((c) => c + 1);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userIdRef.current}`,
          },
          (payload) => {
            const row = payload.new as { is_read: boolean };
            if (row.is_read) {
              setUnreadCount((c) => Math.max(0, c - 1));
            }
          }
        )
        .subscribe();
    }

    init();

    // Refetch when tab becomes visible (catches missed realtime events)
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        fetchCount();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Periodic refetch every 30s as safety net
    const interval = setInterval(fetchCount, 30000);

    return () => {
      if (channel) supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [fetchCount]);

  if (unreadCount === 0) return null;

  return (
    <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
      {unreadCount > 9 ? "9+" : unreadCount}
    </span>
  );
}
