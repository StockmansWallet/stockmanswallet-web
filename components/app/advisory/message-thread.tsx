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

// Solid opaque tokens so tails match the bubble fill perfectly
const OWN_BG = "var(--color-chat-advisor-own)";
const OTHER_BG = "var(--color-chat-other)";

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
        const showTime = shouldShowTimestamp(msg, prev);

        return (
          <div key={msg.id}>
            {showTime && (
              <p className="text-text-muted py-2 text-center text-[11px] font-medium">
                {formatTimeSeparator(new Date(msg.created_at))}
              </p>
            )}
            <ChatBubble
              side={isOwn ? "right" : "left"}
              bgClass={isOwn ? "bg-chat-advisor-own" : "bg-chat-other"}
              tailColor={isOwn ? OWN_BG : OTHER_BG}
              animate={!!shouldAnimate}
              senderName={!isOwn && !hideSenderName ? sender?.name : undefined}
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
