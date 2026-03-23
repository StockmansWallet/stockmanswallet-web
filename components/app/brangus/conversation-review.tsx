"use client";

// Read-only review of a past Brangus conversation with export options
// Matches iOS review mode: no input bar, just message history

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Download, Check } from "lucide-react";
import { ChatBubble } from "@/components/app/chat/chat-bubble";
import { formatConversationForExport } from "@/lib/brangus/conversation-service";
import type { BrangusConversationRow, BrangusMessageRow } from "@/lib/brangus/conversation-service";

// Brangus brand brown (matches Theme+StockmanIQ.swift)
const BRANGUS_BG = "#4D331F";
const USER_BG = "var(--color-brand)";

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
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/6">
        <Link
          href="/dashboard/brangus"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-white/[0.05] hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-white/[0.05] hover:text-text-primary"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-white/[0.05] hover:text-text-primary"
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
                bgClass={isUser ? "bg-brand" : "bg-[#4D331F]"}
                tailColor={isUser ? USER_BG : BRANGUS_BG}
                textClass={isUser ? "text-white" : "text-text-primary"}
              >
                {isUser ? (
                  msg.content
                ) : (
                  <FormattedResponse text={msg.content} />
                )}
              </ChatBubble>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>
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
                    <span className="whitespace-pre-wrap">{trimmed.slice(2).replace(/\*\*(.*?)\*\*/g, "$1")}</span>
                  </div>
                );
              }
              const labelMatch = trimmed.match(/^([A-Z][^:]{2,30}):\s+(.+)$/);
              if (labelMatch) {
                return (
                  <p key={j} className="whitespace-pre-wrap">
                    <span className="text-text-muted">{labelMatch[1]}:</span>{" "}
                    <span className="font-medium">{labelMatch[2].replace(/\*\*(.*?)\*\*/g, "$1")}</span>
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
