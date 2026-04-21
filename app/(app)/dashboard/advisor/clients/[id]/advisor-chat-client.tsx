"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageThread } from "@/components/app/advisory/message-thread";
import { ChatInput } from "@/components/app/chat/chat-input";
import { TypingIndicator } from "@/components/app/chat/typing-indicator";
import { useTypingIndicator } from "@/hooks/use-typing-indicator";
import { sendAdvisorMessage, fetchAdvisorMessages } from "./actions";
import type { AdvisoryMessage } from "@/lib/types/advisory";

const POLL_INTERVAL = 5000;
const OTHER_BG = "var(--color-chat-other)";

interface AdvisorChatClientProps {
  connectionId: string;
  currentUserId: string;
  messages: AdvisoryMessage[];
  participants: Record<string, { name: string; role: string }>;
}

export function AdvisorChatClient({
  connectionId,
  currentUserId,
  messages: initialMessages,
  participants,
}: AdvisorChatClientProps) {
  const [messages, setMessages] = useState<AdvisoryMessage[]>(initialMessages);
  const [animatedIds, setAnimatedIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { peerIsTyping, notifyTyping } = useTypingIndicator(
    `advisory:${connectionId}`,
    currentUserId
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, peerIsTyping]);

  // Poll for new messages
  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await fetchAdvisorMessages(connectionId);
      if (result.messages && result.messages.length > 0) {
        setMessages((prev) => {
          const prevIds = new Set(prev.map((m) => m.id));
          const incoming = result.messages!;
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
      // Optimistic add
      const optimisticMsg: AdvisoryMessage = {
        id: `optimistic-${Date.now()}`,
        connection_id: connectionId,
        sender_user_id: currentUserId,
        message_type: "general_note",
        content: text,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      setAnimatedIds((ids) => new Set(ids).add(optimisticMsg.id));

      const result = await sendAdvisorMessage(connectionId, text, "general_note");

      if (result?.error) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        return;
      }

      // Fetch real messages to replace optimistic
      const refreshed = await fetchAdvisorMessages(connectionId);
      if (refreshed.messages) {
        setMessages(refreshed.messages);
      }
    },
    [connectionId, currentUserId]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
        <div className="space-y-3">
          <MessageThread
            messages={messages}
            currentUserId={currentUserId}
            participants={participants}
            animatedMessageIds={animatedIds}
          />
          {peerIsTyping && <TypingIndicator bgColor={OTHER_BG} dotClass="bg-white/50" />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-white/10 p-4">
        <ChatInput
          onSend={handleSend}
          onTyping={notifyTyping}
          placeholder="Write a message..."
          accentClass="bg-chat-advisor-accent hover:bg-chat-advisor-accent-hover"
        />
      </div>
    </div>
  );
}
