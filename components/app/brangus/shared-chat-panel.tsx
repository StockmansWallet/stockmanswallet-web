"use client";

// Read-only panel that renders a shared Brangus chat INSIDE the Brangus hub's
// Chat tab. Shares the same Card shell, the same ChatBubble layout, the same
// avatar treatment as a live chat - the only differences are a "Shared by X"
// banner at the top, no input bar, and a small action row to go back to a
// new chat. Lets a received share feel native rather than a separate page.

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, MessageSquare, Trash2, Loader2 } from "lucide-react";
import { ChatBubble } from "@/components/app/chat/chat-bubble";
import { markSharedChatRead, softDeleteSharedChat, type SharedChatRow } from "@/lib/brangus/shared-chats-service";

const BRANGUS_BG = "var(--color-brangus-dark)";
const USER_BG = "var(--color-chat-user)";
const BRANGUS_AVATAR = "/images/brangus-chat-profile.webp";

interface SharedChatPanelProps {
  chat: SharedChatRow;
  viewerIsRecipient: boolean;
  onBack: () => void;
  onRemoved: (id: string) => void;
}

export function SharedChatPanel({ chat, viewerIsRecipient, onBack, onRemoved }: SharedChatPanelProps) {
  const [deleting, setDeleting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Mark read on first open (recipient only). Fires when the panel mounts or
  // the viewer switches to a different shared chat without unmounting.
  useEffect(() => {
    if (viewerIsRecipient && !chat.is_read) {
      markSharedChatRead(chat.id);
    }
  }, [chat.id, chat.is_read, viewerIsRecipient]);

  // Autoscroll to the latest message so long chats don't open at the top.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [chat.id]);

  async function handleRemove() {
    if (deleting) return;
    const ok = window.confirm(
      viewerIsRecipient
        ? "Remove this shared chat from your Shared tab? The sender still keeps their copy."
        : "Remove this shared chat from your outbox? The recipient still keeps their copy."
    );
    if (!ok) return;
    setDeleting(true);
    await softDeleteSharedChat(chat.id);
    setDeleting(false);
    onRemoved(chat.id);
  }

  const formattedDate = new Date(chat.created_at).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const senderName = chat.sender_display_name?.trim() || "a fellow producer";

  return (
    <div data-print-chat className="flex flex-1 flex-col overflow-hidden">
      {/* Shared-chat banner - replaces the normal Brangus "welcome" area so the
          viewer immediately sees context. Uses producer-network accent to match
          the Shared tab badge. */}
      <div className="bg-producer-network/10 border-producer-network/20 flex items-start gap-3 border-b px-4 py-3">
        <div className="bg-producer-network/20 text-producer-network flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
          <MessageSquare className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-text-primary truncate text-sm font-semibold">
            {viewerIsRecipient ? `Shared by ${senderName}` : "You shared this chat"}
          </p>
          <p className="text-text-muted text-xs">{formattedDate}</p>
          {chat.title && (
            <p className="text-text-primary mt-1 truncate text-xs font-medium">{chat.title}</p>
          )}
          {chat.note && (
            <div className="border-producer-network/40 bg-producer-network/5 mt-2 rounded-md border-l-2 px-2.5 py-1.5">
              <p className="text-text-muted text-[10px] font-semibold tracking-wider uppercase">
                Note from sender
              </p>
              <p className="text-text-secondary mt-0.5 text-xs">{chat.note}</p>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onBack}
            className="bg-surface-lowest text-text-secondary hover:bg-surface-raised hover:text-text-primary flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
          >
            <ChevronLeft className="h-3 w-3" />
            <span>Back</span>
          </button>
          <button
            onClick={handleRemove}
            disabled={deleting}
            className="bg-surface-lowest text-text-muted hover:bg-surface-raised hover:text-destructive flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50"
            aria-label="Remove from Shared"
          >
            {deleting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
            <span>Remove</span>
          </button>
        </div>
      </div>

      {/* Messages area - identical styling to BrangusChat so a shared chat
          looks native in the Chat tab. */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
        {chat.messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
            <p className="text-text-muted text-sm">This shared chat has no messages.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {chat.messages.map((msg, i) => {
              const isUser = msg.role === "user";
              return (
                <ChatBubble
                  key={i}
                  side={isUser ? "right" : "left"}
                  bgClass={isUser ? "bg-chat-user" : "bg-brangus-dark"}
                  tailColor={isUser ? USER_BG : BRANGUS_BG}
                  textClass="text-white"
                  avatarUrl={isUser ? undefined : BRANGUS_AVATAR}
                  avatarInitials={isUser ? "•" : undefined}
                >
                  {isUser ? msg.content : <FormattedResponse text={msg.content} />}
                </ChatBubble>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Read-only footer - replaces the input bar with a clear indicator that
          this is a snapshot and nothing can be sent. "Start a new chat" CTA
          bridges back to the Chat tab with an empty composer. */}
      <div data-print-hide className="border-t border-white/10 px-4 py-3">
        <div className="bg-surface-lowest text-text-muted flex items-center justify-between gap-3 rounded-full px-4 py-2 text-xs">
          <span className="flex items-center gap-2">
            <Image
              src={BRANGUS_AVATAR}
              alt=""
              width={20}
              height={20}
              className="h-5 w-5 shrink-0 rounded-full opacity-60"
            />
            <span>Read-only snapshot. Start a new chat to ask Brangus your own questions.</span>
          </span>
          <button
            onClick={onBack}
            className="bg-brangus-dark hover:bg-brangus-text shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold text-white transition-colors"
          >
            New chat
          </button>
        </div>
      </div>
    </div>
  );
}

// Same helper BrangusChat uses to format assistant messages. Duplicated locally
// so this component can live independently.
function FormattedResponse({ text }: { text: string }) {
  const paragraphs = text.split("\n\n").filter((p) => p.trim());
  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, i) => {
        const lines = paragraph.split("\n");
        return (
          <div key={i}>
            {lines.map((line, j) => {
              const trimmed = line.trim();
              if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                return (
                  <div key={j} className="flex gap-2 pl-1">
                    <span className="text-text-muted shrink-0">-</span>
                    <span className="whitespace-pre-wrap">
                      {trimmed.slice(2).replace(/\*\*(.*?)\*\*/g, "$1")}
                    </span>
                  </div>
                );
              }
              const labelMatch = trimmed.match(/^([A-Z][^:]{2,30}):\s+(.+)$/);
              if (labelMatch) {
                return (
                  <p key={j} className="whitespace-pre-wrap">
                    <span className="text-text-muted">{labelMatch[1]}:</span>{" "}
                    <span className="font-medium">
                      {labelMatch[2].replace(/\*\*(.*?)\*\*/g, "$1")}
                    </span>
                  </p>
                );
              }
              return (
                <p key={j} className="whitespace-pre-wrap">
                  {trimmed.replace(/\*\*(.*?)\*\*/g, "$1")}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
