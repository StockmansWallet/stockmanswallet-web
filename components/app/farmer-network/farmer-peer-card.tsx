import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Clock, MessageSquare } from "lucide-react";
import { UserAvatar } from "@/components/app/user-avatar";
import { AnimatedUnreadPill } from "@/components/app/animated-unread-pill";

interface FarmerPeerCardProps {
  /**
   * Destination when the row body is clicked. Approved connections link to
   * the chat detail page. Outgoing-pending connections link back to the
   * producer's directory profile where they can cancel the request.
   */
  href: string;
  name: string;
  company?: string | null;
  status: "approved" | "pending";
  /** Last chat message snippet, shown under the name on approved rows. */
  lastMessage?: string | null;
  /**
   * Unread new_message notifications for this connection. Drives the red
   * pill on the avatar and the bold name treatment, matching the iOS
   * Messages inbox language.
   */
  unreadCount?: number;
  /** Avatar URL from auth metadata for the other party. Optional. */
  avatarUrl?: string | null;
  /**
   * Destination when the avatar is clicked. When provided, the avatar
   * becomes its own Link sitting above the row overlay so it can route to
   * the producer's profile without taking the user into the chat.
   */
  profileHref?: string;
}

export function FarmerPeerCard({
  href,
  name,
  company,
  status,
  lastMessage,
  unreadCount = 0,
  avatarUrl,
  profileHref,
}: FarmerPeerCardProps) {
  const hasUnread = status === "approved" && unreadCount > 0;

  const avatarBlock = (
    <div className="relative shrink-0">
      <UserAvatar name={name} avatarUrl={avatarUrl} />
      <AnimatedUnreadPill
        count={hasUnread ? unreadCount : 0}
        className="-right-1 -top-1 h-4 min-w-4 px-1 text-[10px]"
      />
    </div>
  );

  return (
    <Card className="group relative bg-surface transition-all hover:bg-surface-low">
      {/* Row-wide clickable overlay. Everything inside CardContent that is
          not itself interactive will fall through to this link. Interactive
          children (the avatar link) stack above via z-index. */}
      <Link
        href={href}
        aria-label={
          status === "approved"
            ? `Open chat with ${name}`
            : `Review pending request with ${name}`
        }
        className="absolute inset-0 z-0 rounded-lg"
      />
      <CardContent className="relative p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {profileHref ? (
              <Link
                href={profileHref}
                aria-label={`View ${name}'s profile`}
                className="relative z-10"
              >
                {avatarBlock}
              </Link>
            ) : (
              avatarBlock
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <p className={`truncate text-sm ${hasUnread ? "font-bold text-text-primary" : "font-semibold text-text-primary"}`}>
                  {name}
                </p>
                {company && (
                  <span className="truncate text-xs text-text-secondary">{company}</span>
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
  );
}
