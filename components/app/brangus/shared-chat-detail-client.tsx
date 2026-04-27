"use client";

// Client half of the shared-chat detail page. Renders bubbles, marks the row
// read on first mount (recipient only), and offers a soft-delete for the
// viewer's side. Sender sees the same transcript but no read-on-open sync.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Trash2,
  MessageCircleCheck,
  MessageCircleDashed,
  MessageCircleReply,
  Loader2,
} from "lucide-react";
import { ChatBubble } from "@/components/app/chat/chat-bubble";
import { QuickInsightRow } from "@/components/app/chat/quick-insight-row";
import { hydrateCardsFromJson } from "@/lib/brangus/cards";
import {
  markSharedChatRead,
  softDeleteSharedChat,
  type SharedChatRow,
} from "@/lib/brangus/shared-chats-service";

const BRANGUS_BG = "var(--color-brangus-dark)";
const USER_BG = "var(--color-chat-user)";

interface Props {
  row: SharedChatRow;
  viewerIsRecipient: boolean;
}

export function SharedChatDetailClient({ row, viewerIsRecipient }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  // Hydrate the sender-captured summary card strip. Rows created before the
  // 2026-04-24 migration have cards_json = null, in which case this is empty
  // and we skip the strip altogether.
  const cards = useMemo(() => hydrateCardsFromJson(row.cards_json), [row.cards_json]);

  // Recipient marks the row read on first open so the Shared tab badge clears
  // across devices.
  useEffect(() => {
    if (viewerIsRecipient && !row.is_read) {
      markSharedChatRead(row.id);
    }
  }, [row.id, row.is_read, viewerIsRecipient]);

  async function handleDelete() {
    if (deleting) return;
    const ok = window.confirm(
      viewerIsRecipient
        ? "Remove this shared chat from your Shared tab? The sender still keeps their copy."
        : "Remove this shared chat from your outbox? The recipient still keeps their copy."
    );
    if (!ok) return;
    setDeleting(true);
    await softDeleteSharedChat(row.id);
    router.push("/dashboard/brangus");
  }

  const formattedDate = new Date(row.created_at).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const HeaderIcon = viewerIsRecipient
    ? MessageCircleReply
    : row.is_read
      ? MessageCircleCheck
      : MessageCircleDashed;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/brangus"
          className="bg-surface-lowest text-text-secondary hover:bg-surface-raised hover:text-text-primary flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Brangus
        </Link>
        <div className="flex-1" />
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="bg-surface-lowest text-text-secondary hover:bg-surface-raised hover:text-destructive flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
          aria-label="Remove from Shared"
        >
          {deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          Remove
        </button>
      </div>

      {/* Header card - solid surface so it reads against the Brangus wallpaper. */}
      <div className="bg-surface border-brangus/30 rounded-2xl border px-4 py-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="bg-brangus/20 text-brangus flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <HeaderIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-text-primary text-sm font-semibold">
              {viewerIsRecipient
                ? `Shared by ${row.sender_display_name?.trim() || "a fellow producer"}`
                : "You shared this chat"}
            </p>
            <p className="text-text-muted text-xs">{formattedDate}</p>
            {row.title && (
              <p className="text-text-primary mt-2 text-sm font-semibold">{row.title}</p>
            )}
            {row.note && (
              <div className="border-brangus/40 bg-brangus/5 mt-3 rounded-lg border-l-2 px-3 py-2">
                <p className="text-text-muted text-[10px] font-semibold tracking-wider uppercase">
                  Note from sender
                </p>
                <p className="text-text-secondary mt-0.5 text-sm">{row.note}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages - same Card shell as the live chat for visual parity. */}
      <div className="bg-surface flex flex-1 flex-col overflow-hidden rounded-2xl shadow-sm">
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mx-auto max-w-2xl space-y-3">
            {row.messages.length === 0 ? (
              <p className="text-text-muted py-8 text-center text-sm">
                This shared chat has no messages.
              </p>
            ) : (
              row.messages.map((msg, i) => {
                const isUser = msg.role === "user";
                return (
                  <ChatBubble
                    key={i}
                    side={isUser ? "right" : "left"}
                    bgClass={isUser ? "bg-chat-user" : "bg-brangus-dark"}
                    tailColor={isUser ? USER_BG : BRANGUS_BG}
                    textClass="text-white"
                  >
                    {isUser ? msg.content : <FormattedResponse text={msg.content} />}
                  </ChatBubble>
                );
              })
            )}
          </div>
        </div>

        {/* Summary cards - aggregate strip captured at send time. Matches the
            live chat's persistent bottom strip so the recipient sees the
            headline figures the sender was looking at. */}
        {cards.length > 0 && (
          <div className="border-t border-white/10 py-2">
            <QuickInsightRow insights={cards} />
          </div>
        )}
      </div>
    </div>
  );
}

// Kept local so the detail page is self-contained. Mirrors the helper used by
// conversation-review so the bubble layout matches a live chat.
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
