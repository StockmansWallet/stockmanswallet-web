import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin, Clock, MessageSquare } from "lucide-react";

interface FarmerPeerCardProps {
  /**
   * Destination when the card is clicked. Approved connections link to the
   * chat detail page. Outgoing-pending connections link back to the
   * producer's directory profile where they can cancel the request.
   */
  href: string;
  name: string;
  company?: string | null;
  state?: string | null;
  region?: string | null;
  status: "approved" | "pending";
  /** Last chat message snippet, shown under the meta row for approved cards. */
  lastMessage?: string | null;
  /** Connection created_at or approved_at in ISO form. Optional. */
  connectedSince?: string | null;
  /**
   * Unread new_message notifications for this connection. Drives the red
   * pill on the avatar and the bold name treatment, matching the iOS
   * Messages inbox language.
   */
  unreadCount?: number;
}

function formatConnectedSince(iso: string): string {
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diffDays < 1) return "today";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export function FarmerPeerCard({
  href,
  name,
  company,
  state,
  region,
  status,
  lastMessage,
  connectedSince,
  unreadCount = 0,
}: FarmerPeerCardProps) {
  const initial = (name?.trim().charAt(0) || "?").toUpperCase();
  const location = [state, region].filter(Boolean).join(", ");
  const hasUnread = status === "approved" && unreadCount > 0;

  return (
    <Link href={href}>
      <Card className="group cursor-pointer bg-surface transition-all hover:bg-surface-low">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative shrink-0" aria-hidden="true">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15">
                  <span className="text-sm font-bold text-orange-400">{initial}</span>
                </div>
                {hasUnread && (
                  <span
                    className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white"
                    aria-hidden="true"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className={`truncate text-sm ${hasUnread ? "font-bold text-text-primary" : "font-semibold text-text-primary"}`}>
                  {name}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-secondary">
                  {company && <span className="truncate">{company}</span>}
                  {location && (
                    <span className="flex items-center gap-1 text-text-muted">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {location}
                    </span>
                  )}
                  {status === "approved" && connectedSince && (
                    <span className="text-text-muted">Connected {formatConnectedSince(connectedSince)}</span>
                  )}
                </div>
                {status === "approved" && lastMessage && (
                  <p className={`mt-1 flex items-center gap-1 truncate text-[11px] ${hasUnread ? "font-medium text-text-secondary" : "text-text-muted"}`}>
                    <MessageSquare className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{lastMessage}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {status === "pending" && (
                <Badge variant="warning">
                  <Clock className="mr-1 h-3 w-3" aria-hidden="true" />
                  Pending
                </Badge>
              )}
              <ArrowRight
                className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
