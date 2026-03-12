"use client";

// Conversation list for the Stockman IQ hub page
// Shows past Brangus conversations with title, preview, and relative time

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Trash2 } from "lucide-react";
import { softDeleteConversation } from "@/lib/brangus/conversation-service";
import type { BrangusConversationRow } from "@/lib/brangus/conversation-service";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}

interface ConversationListProps {
  conversations: BrangusConversationRow[];
}

export function ConversationList({ conversations }: ConversationListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await softDeleteConversation(id);
      router.refresh();
    } catch (err) {
      console.error("Failed to delete conversation:", err);
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-2">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          role="button"
          tabIndex={0}
          onClick={() => router.push(`/dashboard/stockman-iq/chat/${conv.id}`)}
          onKeyDown={(e) => { if (e.key === "Enter") router.push(`/dashboard/stockman-iq/chat/${conv.id}`); }}
          className={`group flex w-full cursor-pointer items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-white/[0.05] ${
            deletingId === conv.id ? "pointer-events-none opacity-40" : ""
          }`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/15">
            <MessageSquare className="h-4 w-4 text-brand" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-text-primary">
                {conv.title ?? "New conversation"}
              </p>
              <span className="shrink-0 text-[10px] text-text-muted">
                {timeAgo(conv.updated_at)}
              </span>
            </div>
            {conv.preview_text && (
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-text-muted">
                {conv.preview_text}
              </p>
            )}
          </div>
          <button
            onClick={(e) => handleDelete(e, conv.id)}
            className="mt-0.5 shrink-0 rounded-lg p-1.5 text-text-muted opacity-0 transition-all hover:bg-error/10 hover:text-error group-hover:opacity-100"
            aria-label="Delete conversation"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
