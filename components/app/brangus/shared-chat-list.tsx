"use client";

// List of Brangus conversations shared with the current user by other producers.
// Lives inside the "Shared" tab on the Brangus hub. Unread rows are emphasised
// with the brangus accent so users spot new shares at a glance.
// Clicking a row calls onSelect to open the SharedChatPanel in-place rather
// than navigating away from the hub.

import { useCallback, useEffect, useState } from "react";
import { Trash2, Inbox, Loader2 } from "lucide-react";
import { UserAvatar } from "@/components/app/user-avatar";
import { fetchSharedChatAvatars } from "@/lib/brangus/shared-chat-avatar-actions";
import {
  fetchInboxSharedChats,
  softDeleteSharedChat,
  type SharedChatRow,
} from "@/lib/brangus/shared-chats-service";

interface SharedChatListProps {
  onSelect: (chat: SharedChatRow) => void;
  activeId?: string | null;
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

export function SharedChatList({ onSelect, activeId, refreshSignal }: SharedChatListProps) {
  const [rows, setRows] = useState<SharedChatRow[] | null>(null);
  const [avatars, setAvatars] = useState<Record<string, string | null>>({});
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
      if (cancelled) return;
      setRows(next);
      const avatarMap = await fetchSharedChatAvatars(next.map((row) => row.sender_user_id));
      if (!cancelled) setAvatars(avatarMap);
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
        <div className="bg-brangus/15 flex h-12 w-12 items-center justify-center rounded-full">
          <Inbox className="text-brangus h-6 w-6" />
        </div>
        <p className="text-text-primary text-sm font-medium">Nothing shared yet</p>
        <p className="text-text-muted max-w-xs text-xs leading-relaxed">
          When another producer shares a Brangus chat with you, it&apos;ll appear here in full chat format.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2 p-2">
      {rows.map((row) => {
        const p = preview(row);
        const active = activeId === row.id;
        return (
          <li key={row.id} className="group relative">
            {/* Main row: button opens the panel in-place inside the hub.
                Padding-right leaves room for the delete button that appears
                on hover without the two overlapping. */}
            <button
              onClick={() => onSelect(row)}
              className={`flex w-full items-start gap-3 rounded-xl p-3 pr-12 text-left transition-colors hover:bg-white/[0.05] ${
                !row.is_read ? "bg-brangus/[0.06]" : "bg-white/[0.03]"
              } ${active ? "bg-brangus/10" : ""}`}
            >
              <UserAvatar
                name={row.sender_display_name ?? "Another producer"}
                avatarUrl={avatars[row.sender_user_id] ?? null}
                sizeClass="h-10 w-10"
                tone="brangus"
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`text-text-primary truncate text-sm ${
                      !row.is_read ? "font-semibold" : "font-medium"
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
              className="text-text-muted hover:text-destructive absolute top-3 right-3 shrink-0 rounded-full p-1.5 transition-colors disabled:cursor-not-allowed"
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
