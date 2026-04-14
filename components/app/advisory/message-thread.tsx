"use client";

import { ChatBubble } from "@/components/app/chat/chat-bubble";
import { Badge } from "@/components/ui/badge";
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
}

const messageTypeLabels: Record<MessageType, { label: string; variant: "warning" | "info" | "brand" | "default" }> = {
  access_request: { label: "Access Request", variant: "warning" },
  renewal_request: { label: "Renewal Request", variant: "warning" },
  review_request: { label: "Review Request", variant: "info" },
  general_note: { label: "Note", variant: "default" },
};

// Farmer chat colors (solid opaque so tails match perfectly)
const OWN_BG = "#31243C";
const OTHER_BG = "#2A2929";

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

  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: msgDay.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  }) + ` ${time}`;
}

function shouldShowTimestamp(current: AdvisoryMessage, previous: AdvisoryMessage | undefined): boolean {
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
}: MessageThreadProps) {
  if (messages.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-text-muted">No messages yet. Start the conversation below.</p>
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
              <p className="py-2 text-center text-[11px] font-medium text-text-muted">
                {formatTimeSeparator(new Date(msg.created_at))}
              </p>
            )}
            <ChatBubble
              side={isOwn ? "right" : "left"}
              bgClass={isOwn ? "bg-[#31243C]" : "bg-[#2A2929]"}
              tailColor={isOwn ? OWN_BG : OTHER_BG}
              animate={!!shouldAnimate}
              senderName={!isOwn ? sender?.name : undefined}
            >
              {msg.message_type !== "general_note" && (
                <Badge variant={typeConfig.variant} className="mb-1">
                  {typeConfig.label}
                </Badge>
              )}
              {msg.content}
            </ChatBubble>
          </div>
        );
      })}
    </div>
  );
}
