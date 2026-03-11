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
      {messages.map((msg) => {
        const isOwn = msg.sender_user_id === currentUserId;
        const typeConfig = messageTypeLabels[msg.message_type];
        const shouldAnimate = animatedMessageIds?.has(msg.id);

        return (
          <ChatBubble
            key={msg.id}
            side={isOwn ? "right" : "left"}
            bgClass={isOwn ? "bg-[#31243C]" : "bg-[#2A2929]"}
            tailColor={isOwn ? OWN_BG : OTHER_BG}
            animate={!!shouldAnimate}
          >
            {msg.message_type !== "general_note" && (
              <Badge variant={typeConfig.variant} className="mb-1">
                {typeConfig.label}
              </Badge>
            )}
            {msg.content}
          </ChatBubble>
        );
      })}
    </div>
  );
}
