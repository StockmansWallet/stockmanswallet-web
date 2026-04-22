"use client";

import { ChatBubble } from "@/components/app/chat/chat-bubble";
import { Badge } from "@/components/ui/badge";
import { ShareAttachmentCard } from "@/components/app/producer-network/share-attachment-card";
import type { AdvisoryMessage, MessageType } from "@/lib/types/advisory";

interface Participant {
  name: string;
  role: string;
}

interface MessageThreadProps {
  messages: AdvisoryMessage[];
  currentUserId: string;
  participants: Record<string, Participant>;
  animatedMessageIds?: Set<string>;
  /**
   * Hide the sender-name label inside each bubble. Producer-peer chat is
   * always 1:1 so the name is redundant; advisor flows keep it on by
   * default because the chat can include automated agent notes.
   */
  hideSenderName?: boolean;
  /**
   * Accent for the peer's bubble (left side). Defaults to the shared
   * `chat-other` neutral surface. Feature chats (producer network, advisor)
   * pass their own tint + matching tail colour.
   */
  otherBgClass?: string;
  otherTailColor?: string;
  /**
   * Per-user avatar metadata. When provided, renders the sender's photo (or
   * initials fallback) beside each bubble, matching the Brangus chat style.
   */
  avatars?: Record<string, { url?: string | null; initials?: string }>;
}

const messageTypeLabels: Record<
  MessageType,
  { label: string; variant: "warning" | "info" | "brand" | "default" }
> = {
  access_request: { label: "Access Request", variant: "warning" },
  renewal_request: { label: "Renewal Request", variant: "warning" },
  review_request: { label: "Review Request", variant: "info" },
  general_note: { label: "Note", variant: "default" },
};

// Own bubble colour is unified across the whole app (Brangus, producer,
// advisor). Single source of truth lives at --color-chat-user in globals.css;
// change that token to restyle every chat at once.
const OWN_BG = "var(--color-chat-user)";
const DEFAULT_OTHER_BG = "var(--color-chat-other)";

const FIVE_MINUTES = 5 * 60 * 1000;

function formatTimeSeparator(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const time = date.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (msgDay.getTime() === today.getTime()) {
    return time;
  }
  if (msgDay.getTime() === yesterday.getTime()) {
    return `Yesterday ${time}`;
  }

  const daysDiff = Math.floor((today.getTime() - msgDay.getTime()) / 86400000);
  if (daysDiff < 7) {
    const dayName = date.toLocaleDateString("en-AU", { weekday: "long" });
    return `${dayName} ${time}`;
  }

  return (
    date.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: msgDay.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    }) + ` ${time}`
  );
}

function shouldShowTimestamp(
  current: AdvisoryMessage,
  previous: AdvisoryMessage | undefined
): boolean {
  if (!previous) return true;
  const currentTime = new Date(current.created_at).getTime();
  const previousTime = new Date(previous.created_at).getTime();
  return currentTime - previousTime > FIVE_MINUTES;
}

export function MessageThread({
  messages,
  currentUserId,
  participants,
  animatedMessageIds,
  hideSenderName = false,
  otherBgClass = "bg-chat-other",
  otherTailColor = DEFAULT_OTHER_BG,
  avatars,
}: MessageThreadProps) {
  if (messages.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-text-muted text-sm">No messages yet. Start the conversation below.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((msg, i) => {
        const isOwn = msg.sender_user_id === currentUserId;
        const typeConfig = messageTypeLabels[msg.message_type];
        const shouldAnimate = animatedMessageIds?.has(msg.id);
        const sender = participants[msg.sender_user_id];
        const prev = i > 0 ? messages[i - 1] : undefined;
        const next = i < messages.length - 1 ? messages[i + 1] : undefined;
        const showTime = shouldShowTimestamp(msg, prev);
        // iMessage-style grouping: only show the avatar on the last bubble of
        // a consecutive same-sender run. A run ends when the next message is
        // from a different sender or when a timestamp separator will appear
        // before it. Avoids the -mb-8 hanging avatars stacking on each other.
        const nextBreaksGroup =
          !next || next.sender_user_id !== msg.sender_user_id || shouldShowTimestamp(next, msg);
        const showAvatar = nextBreaksGroup;

        return (
          <div key={msg.id}>
            {showTime && (
              <div className="flex justify-center py-2">
                <span className="bg-surface-lowest text-text-muted rounded-full px-3 py-1 text-[11px] font-medium backdrop-blur-xl">
                  {formatTimeSeparator(new Date(msg.created_at))}
                </span>
              </div>
            )}
            <ChatBubble
              side={isOwn ? "right" : "left"}
              bgClass={isOwn ? "bg-chat-user" : otherBgClass}
              tailColor={isOwn ? OWN_BG : otherTailColor}
              animate={!!shouldAnimate}
              senderName={!isOwn && !hideSenderName ? sender?.name : undefined}
              avatarUrl={showAvatar ? (avatars?.[msg.sender_user_id]?.url ?? undefined) : undefined}
              avatarInitials={showAvatar ? avatars?.[msg.sender_user_id]?.initials : undefined}
              reserveAvatarSpace={!!avatars && !showAvatar}
            >
              {msg.message_type !== "general_note" && (
                <Badge variant={typeConfig.variant} className="mb-1">
                  {typeConfig.label}
                </Badge>
              )}
              {msg.content && <div>{msg.content}</div>}
              {msg.attachment && <ShareAttachmentCard attachment={msg.attachment} />}
            </ChatBubble>
          </div>
        );
      })}
    </div>
  );
}
