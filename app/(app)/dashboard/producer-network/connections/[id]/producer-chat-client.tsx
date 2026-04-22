"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageThread } from "@/components/app/advisory/message-thread";
import { ChatInput } from "@/components/app/chat/chat-input";
import { TypingIndicator } from "@/components/app/chat/typing-indicator";
import { ShareMenu } from "@/components/app/producer-network/share-menu";
import { ShareAttachmentCard } from "@/components/app/producer-network/share-attachment-card";
import { useTypingIndicator } from "@/hooks/use-typing-indicator";
import { sendProducerMessage, fetchProducerMessages } from "./actions";
import type { AdvisoryMessage, MessageAttachment } from "@/lib/types/advisory";

const POLL_INTERVAL = 5000;
// Peer bubble uses the Producer Network accent (sage, -dark variant for
// filled-area legibility, matching the Brangus chat pattern).
const OTHER_BG = "var(--color-producer-network-dark)";

interface ProducerChatClientProps {
  connectionId: string;
  currentUserId: string;
  messages: AdvisoryMessage[];
  participants: Record<string, { name: string; role: string }>;
  avatars?: Record<string, { url?: string | null; initials?: string }>;
}

export function ProducerChatClient({
  connectionId,
  currentUserId,
  messages: initialMessages,
  participants,
  avatars,
}: ProducerChatClientProps) {
  const [messages, setMessages] = useState<AdvisoryMessage[]>(initialMessages);
  const [animatedIds, setAnimatedIds] = useState<Set<string>>(new Set());
  const [pendingAttachment, setPendingAttachment] = useState<MessageAttachment | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { peerIsTyping, notifyTyping } = useTypingIndicator(`chat:${connectionId}`, currentUserId);

  // Auto-scroll to bottom on new messages. block: "end" aligns the end-ref
  // to the viewport bottom; the default ("start") would scroll the ref to
  // the top and clip the first bubble off the top of the card.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, peerIsTyping]);

  // Poll for new messages
  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await fetchProducerMessages(connectionId);
      if (result.messages && result.messages.length > 0) {
        setMessages((prev) => {
          const prevIds = new Set(prev.map((m) => m.id));
          const incoming = result.messages;
          const brandNew = incoming.filter((m) => !prevIds.has(m.id));

          if (brandNew.length > 0) {
            setAnimatedIds((ids) => {
              const next = new Set(ids);
              brandNew.forEach((m) => next.add(m.id));
              return next;
            });
            return incoming;
          }
          return prev;
        });
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [connectionId]);

  const handleSend = useCallback(
    async (text: string) => {
      // The ChatInput invokes onSend with empty string when only an attachment
      // is queued. That's legal here because the action accepts content OR
      // attachment.
      const attachmentForThisSend = pendingAttachment;
      if (!text.trim() && !attachmentForThisSend) return;

      const optimisticMsg: AdvisoryMessage = {
        id: `optimistic-${Date.now()}`,
        connection_id: connectionId,
        sender_user_id: currentUserId,
        message_type: "general_note",
        content: text,
        created_at: new Date().toISOString(),
        attachment: attachmentForThisSend,
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      setAnimatedIds((ids) => new Set(ids).add(optimisticMsg.id));
      setPendingAttachment(null);

      const result = await sendProducerMessage(
        connectionId,
        text,
        "general_note",
        attachmentForThisSend
      );

      if (result?.error) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        // Give the attachment back so the sender can retry or edit.
        if (attachmentForThisSend) setPendingAttachment(attachmentForThisSend);
        return;
      }

      const refreshed = await fetchProducerMessages(connectionId);
      if (refreshed.messages) {
        setMessages(refreshed.messages);
      }
    },
    [connectionId, currentUserId, pendingAttachment]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
        <div className="space-y-3">
          <MessageThread
            messages={messages}
            currentUserId={currentUserId}
            participants={participants}
            animatedMessageIds={animatedIds}
            hideSenderName
            otherBgClass="bg-producer-network-dark"
            otherTailColor={OTHER_BG}
            avatars={avatars}
          />
          {peerIsTyping && <TypingIndicator bgColor={OTHER_BG} dotClass="bg-white/50" />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="relative z-10 shrink-0 border-t border-white/6 p-4 shadow-[0_-6px_12px_-4px_rgba(0,0,0,0.4)]">
        {/* Pending-attachment preview sits above the input so the sender
            can see what's queued and remove it before hitting send. */}
        {pendingAttachment && (
          <div className="bg-surface-lowest mb-2 flex items-start gap-2 rounded-xl border border-white/5 p-2 pr-2">
            <div className="flex-1">
              <ShareAttachmentCard attachment={pendingAttachment} />
            </div>
            <button
              type="button"
              onClick={() => setPendingAttachment(null)}
              aria-label="Remove attachment"
              className="text-text-muted hover:text-text-primary mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-white/10"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <ShareMenu onAttach={setPendingAttachment} />
          <div className="flex-1">
            <ChatInput
              onSend={handleSend}
              onTyping={notifyTyping}
              placeholder={
                pendingAttachment ? "Add a note (optional), then send..." : "Write a message..."
              }
              accentClass="bg-producer-network hover:bg-producer-network"
              allowEmpty={pendingAttachment != null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
