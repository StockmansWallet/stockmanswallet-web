"use client";

// Read-only review of a past Brangus conversation with export options
// Matches iOS review mode: no input bar, just message history

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, Copy, Download, Check } from "lucide-react";
import { ChatBubble } from "@/components/app/chat/chat-bubble";
import { QuickInsightRow } from "@/components/app/chat/quick-insight-row";
import { hydrateCardsFromMessages } from "@/lib/brangus/cards";
import { formatConversationForExport } from "@/lib/brangus/conversation-service";
import type { BrangusConversationRow, BrangusMessageRow } from "@/lib/brangus/conversation-service";

// Brangus bubble - tracks the feature palette so future swaps propagate.
const BRANGUS_BG = "var(--color-brangus-dark)";
// User bubble - cool-toned stone grey that pairs with Brangus's blue
const USER_BG = "var(--color-chat-user)";

interface ConversationReviewProps {
  conversation: BrangusConversationRow;
  messages: BrangusMessageRow[];
}

export function ConversationReview({ conversation, messages }: ConversationReviewProps) {
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, []);

  // Aggregate any per-message cards_json into a single strip. The live chat
  // accumulates cards in session order; reviewing a saved chat should surface
  // the same strip so users can see the key figures at a glance.
  const cards = useMemo(() => hydrateCardsFromMessages(messages), [messages]);

  const exportText = formatConversationForExport(
    conversation.title,
    conversation.created_at,
    messages
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  function handleDownload() {
    const blob = new Blob([exportText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brangus-${conversation.title?.toLowerCase().replace(/\s+/g, "-") ?? "conversation"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-white/6 px-4 py-2">
        <Link
          href="/dashboard/brangus"
          className="bg-surface-lowest text-text-secondary hover:bg-surface-raised hover:text-text-primary flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="text-text-secondary hover:text-text-primary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/[0.05]"
          >
            {copied ? (
              <Check className="text-success h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className="text-text-secondary hover:text-text-primary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/[0.05]"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
        <div className="mx-auto max-w-2xl space-y-3">
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <ChatBubble
                key={msg.id}
                side={isUser ? "right" : "left"}
                bgClass={isUser ? "bg-chat-user" : "bg-brangus-dark"}
                tailColor={isUser ? USER_BG : BRANGUS_BG}
                textClass={isUser ? "text-white" : "text-white"}
              >
                {isUser ? msg.content : <FormattedResponse text={msg.content} />}
              </ChatBubble>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Summary cards strip - matches the live chat's persistent bottom strip
          so reviewing a saved chat reads the same as when it happened. */}
      {cards.length > 0 && (
        <div className="border-t border-white/10 py-2">
          <QuickInsightRow insights={cards} />
        </div>
      )}
    </div>
  );
}

// MARK: - Formatted Response (duplicated from brangus-chat.tsx to keep components independent)

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
