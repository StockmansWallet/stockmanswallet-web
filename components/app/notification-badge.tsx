"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function NotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let userId: string | null = null;

    async function fetchCount() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;

      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      setUnreadCount(count ?? 0);
    }

    fetchCount();

    // Realtime subscription for instant badge updates
    const channel = supabase
      .channel("notification-badge")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const row = payload.new as { user_id: string };
          if (userId && row.user_id === userId) {
            setUnreadCount((c) => c + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        (payload) => {
          const row = payload.new as { user_id: string; is_read: boolean };
          if (userId && row.user_id === userId && row.is_read) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (unreadCount === 0) return null;

  return (
    <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
      {unreadCount > 9 ? "9+" : unreadCount}
    </span>
  );
}
