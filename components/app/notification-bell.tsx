"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, UserPlus, Check, X, Clock, MessageSquare, RefreshCw, Handshake, BookOpen, AlertTriangle, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AppNotification, NotificationType } from "@/lib/types/advisory";

const typeIcons: Record<NotificationType, typeof Bell> = {
  new_connection_request: UserPlus,
  request_approved: Check,
  request_denied: X,
  access_expired: Clock,
  new_message: MessageSquare,
  renewal_requested: RefreshCw,
  farmer_connection_request: Handshake,
  farmer_request_approved: Handshake,
  yard_book_reminder: BookOpen,
  yard_book_overdue: AlertTriangle,
  price_alert: TrendingUp,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const supabaseRef = useRef(createClient());
  const userIdRef = useRef<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (!userIdRef.current) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userIdRef.current = user.id;
    }

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userIdRef.current)
      .order("created_at", { ascending: false })
      .limit(10);

    const items = (data ?? []) as AppNotification[];
    setNotifications(items);
    setUnreadCount(items.filter((n) => !n.is_read).length);
  }, []);

  useEffect(() => {
    const supabase = supabaseRef.current;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      await fetchNotifications();

      if (!userIdRef.current) return;

      // Realtime subscription with user_id filter
      channel = supabase
        .channel("notifications-bell")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userIdRef.current}`,
          },
          (payload) => {
            const row = payload.new as AppNotification;
            setNotifications((prev) => [row, ...prev].slice(0, 10));
            setUnreadCount((c) => c + 1);
          }
        )
        .subscribe();
    }

    init();

    // Refetch when tab becomes visible (catches missed realtime events)
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        fetchNotifications();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Periodic refetch every 30s as safety net
    const interval = setInterval(fetchNotifications, 30000);

    return () => {
      if (channel) supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleNotificationClick = useCallback(async (notification: AppNotification) => {
    if (!notification.is_read) {
      await supabaseRef.current
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    setOpen(false);
    if (notification.link) router.push(notification.link);
  }, [router]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-white/10 bg-bg-alt shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <p className="text-sm font-semibold text-text-primary">Notifications</p>
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-purple-400 hover:underline"
            >
              View all
            </Link>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-text-muted">
              No notifications yet.
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n) => {
                const Icon = typeIcons[n.type] ?? Bell;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                      <Icon className="h-3.5 w-3.5 text-purple-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs ${n.is_read ? "text-text-secondary" : "font-semibold text-text-primary"}`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="mt-0.5 truncate text-[10px] text-text-muted">{n.body}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="text-[10px] text-text-muted">{timeAgo(n.created_at)}</span>
                      {!n.is_read && (
                        <div className="h-2 w-2 rounded-full bg-purple-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
