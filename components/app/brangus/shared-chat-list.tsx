"use client";

// List of Brangus conversations shared with the current user by other producers.
// Lives inside the "Shared" tab on the Brangus hub. Unread rows are emphasised
// with the producer-network accent so users spot new shares at a glance.
// Clicking a row calls onSelect to open the SharedChatPanel in-place rather
// than navigating away from the hub.

import { useCallback, useEffect, useState } from "react";
import { Users, Trash2, Inbox, Loader2 } from "lucide-react";
import {
  fetchInboxSharedChats,
  softDeleteSharedChat,
  type SharedChatRow,
} from "@/lib/brangus/shared-chats-service";

interface SharedChatListProps {
  onSelect: (chat: SharedChatRow) => void;
  // Incremented by BrangusHub when a new shared chat arrives via realtime.
  // The list re-fetches when this changes so it stays live while the tab is open.
  refreshSignal?: number;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function preview(row: SharedChatRow): string | null {
  if (row.note && row.note.trim().length > 0) return row.note;
  const firstAssistant = row.messages.find((m) => m.role === "assistant");
  if (firstAssistant) return firstAssistant.content.slice(0, 160);
  return null;
}

export function SharedChatList({ onSelect, refreshSignal }: SharedChatListProps) {
  const [rows, setRows] = useState<SharedChatRow[] | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Fetch (or re-fetch) the inbox whenever the component mounts or the parent
  // signals that a new share has arrived via realtime. Using refreshSignal in
  // the deps means this also runs on initial mount (signal = 0) and again each
  // time the hub increments it. The IIFE form keeps the async logic clean
  // without triggering react-hooks/exhaustive-deps warnings on setState.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = await fetchInboxSharedChats();
      if (!cancelled) setRows(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSignal]);

  const handleDelete = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      setDeleting(id);
      await softDeleteSharedChat(id);
      setRows((prev) => (prev ?? []).filter((r) => r.id !== id));
      setDeleting(null);
    },
    []
  );

  if (rows === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-brangus h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="bg-producer-network/15 flex h-12 w-12 items-center justify-center rounded-full">
          <Inbox className="text-producer-network h-6 w-6" />
        </div>
        <p className="text-text-primary text-sm font-medium">Nothing shared yet</p>
        <p className="text-text-muted max-w-xs text-xs leading-relaxed">
          When another producer shares a Brangus chat with you, it&apos;ll appear here in full chat format.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-white/[0.04]">
      {rows.map((row) => {
        const p = preview(row);
        return (
          <li key={row.id} className="group relative">
            {/* Main row: button opens the panel in-place inside the hub.
                Padding-right leaves room for the delete button that appears
                on hover without the two overlapping. */}
            <button
              onClick={() => onSelect(row)}
              className={`flex w-full items-start gap-3 px-4 py-3 pr-12 text-left transition-colors hover:bg-white/[0.03] ${
                !row.is_read ? "bg-producer-network/[0.04]" : ""
              }`}
            >
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  !row.is_read
                    ? "bg-producer-network/20 text-producer-network"
                    : "bg-white/[0.04] text-text-muted"
                }`}
                aria-hidden="true"
              >
                <Users className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`truncate text-sm ${
                      !row.is_read
                        ? "text-text-primary font-semibold"
                        : "text-text-secondary font-medium"
                    }`}
                  >
                    {row.sender_display_name ?? "Another producer"}
                  </p>
                  <span className="text-text-muted shrink-0 text-xs">
                    {timeAgo(row.created_at)}
                  </span>
                </div>
                {row.title && (
                  <p className="text-text-secondary mt-0.5 truncate text-xs font-medium">
                    {row.title}
                  </p>
                )}
                {p && (
                  <p className="text-text-muted mt-0.5 line-clamp-2 text-xs">{p}</p>
                )}
              </div>
            </button>

            {/* Delete button: absolutely positioned so it doesn't nest inside
                the row button (nested interactive elements are invalid HTML). */}
            <button
              onClick={(e) => handleDelete(e, row.id)}
              disabled={deleting === row.id}
              className="text-text-muted hover:text-destructive absolute top-3 right-3 shrink-0 rounded-full p-1.5 opacity-0 transition-opacity group-hover:opacity-100 disabled:cursor-not-allowed"
              aria-label="Remove from Shared"
            >
              {deleting === row.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
