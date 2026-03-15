import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Bell, UserPlus, Check, X, Clock, MessageSquare, RefreshCw, Handshake, BookOpen, AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import type { AppNotification, NotificationType } from "@/lib/types/advisory";
import { MarkAllReadButton } from "./mark-all-read-button";

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function groupByDate(notifications: AppNotification[]) {
  const groups: Record<string, AppNotification[]> = {};
  for (const n of notifications) {
    const key = new Date(n.created_at).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  }
  return groups;
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications = (data ?? []) as AppNotification[];
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const grouped = groupByDate(notifications);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : undefined}
        actions={unreadCount > 0 ? <MarkAllReadButton /> : undefined}
      />

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="mx-auto mb-3 h-8 w-8 text-text-muted" />
            <p className="text-sm text-text-muted">No notifications yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
                {date}
              </p>
              <div className="space-y-2">
                {items.map((n) => {
                  const Icon = typeIcons[n.type] ?? Bell;
                  return (
                    <a
                      key={n.id}
                      href={n.link ?? "#"}
                      className={`flex items-start gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-white/[0.03] ${
                        !n.is_read ? "bg-purple-500/5" : ""
                      }`}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                        <Icon className="h-4 w-4 text-purple-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm ${
                            n.is_read
                              ? "text-text-secondary"
                              : "font-semibold text-text-primary"
                          }`}
                        >
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="mt-0.5 text-xs text-text-muted">
                            {n.body}
                          </p>
                        )}
                        <p className="mt-1 text-[10px] text-text-muted">
                          {formatDate(n.created_at)}
                        </p>
                      </div>
                      {!n.is_read && (
                        <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-purple-400" />
                      )}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
