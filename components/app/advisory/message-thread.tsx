"use client";

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
}

const messageTypeLabels: Record<MessageType, { label: string; variant: "warning" | "info" | "brand" | "default" }> = {
  access_request: { label: "Access Request", variant: "warning" },
  renewal_request: { label: "Renewal Request", variant: "warning" },
  review_request: { label: "Review Request", variant: "info" },
  general_note: { label: "Note", variant: "default" },
};

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function MessageThread({ messages, currentUserId, participants }: MessageThreadProps) {
  if (messages.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-text-muted">No notes yet. Start the conversation below.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => {
        const isOwn = msg.sender_user_id === currentUserId;
        const participant = participants[msg.sender_user_id];
        const senderName = participant?.name ?? "Unknown";
        const typeConfig = messageTypeLabels[msg.message_type];

        return (
          <div
            key={msg.id}
            className={`rounded-xl border border-white/5 p-3 ${
              isOwn ? "ml-8 bg-purple-500/5" : "mr-8 bg-white/[0.02]"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-primary">
                  {isOwn ? "You" : senderName}
                </span>
                {msg.message_type !== "general_note" && (
                  <Badge variant={typeConfig.variant}>{typeConfig.label}</Badge>
                )}
              </div>
              <span className="text-[10px] text-text-muted">
                {formatTimestamp(msg.created_at)}
              </span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
              {msg.content}
            </p>
          </div>
        );
      })}
    </div>
  );
}
