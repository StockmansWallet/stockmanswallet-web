"use client";

// List of Brangus conversations the current user has shared with other
// producers. Lives alongside the inbox in the "Shared" tab on the Brangus
// hub - users toggle between Inbox / Sent. The sender row reads as "to
// [recipient]" with a small "read" indicator showing whether the recipient
// has opened it. Soft-delete here only flips is_deleted_by_sender so the
// recipient's copy is unaffected.

import { useCallback, useEffect, useState } from "react";
import {
  Trash2,
  Inbox,
  Loader2,
  Check,
  CheckCheck,
} from "lucide-react";
import { UserAvatar } from "@/components/app/user-avatar";
import { fetchSharedChatAvatars } from "@/lib/brangus/shared-chat-avatar-actions";
import {
  fetchSentSharedChats,
  softDeleteSharedChat,
  type SentSharedChatRow,
} from "@/lib/brangus/shared-chats-service";

interface SentChatListProps {
  onSelect: (chat: SentSharedChatRow) => void;
  activeId?: string | null;
  // Bumped by the parent when a new send happens, so the list refreshes.
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

function preview(row: SentSharedChatRow): string | null {
  if (row.note && row.note.trim().length > 0) return row.note;
  const firstAssistant = row.messages.find((m) => m.role === "assistant");
  if (firstAssistant) return firstAssistant.content.slice(0, 160);
  return null;
}

export function SentChatList({ onSelect, activeId, refreshSignal }: SentChatListProps) {
  const [rows, setRows] = useState<SentSharedChatRow[] | null>(null);
  const [avatars, setAvatars] = useState<Record<string, string | null>>({});
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = await fetchSentSharedChats();
      if (cancelled) return;
      setRows(next);
      const avatarMap = await fetchSharedChatAvatars(next.map((row) => row.recipient_user_id));
      if (!cancelled) setAvatars(avatarMap);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSignal]);

  const handleDelete = useCallback(async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(id);
    await softDeleteSharedChat(id);
    setRows((prev) => (prev ?? []).filter((r) => r.id !== id));
    setDeleting(null);
  }, []);

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
        <p className="text-text-primary text-sm font-medium">Nothing sent yet</p>
        <p className="text-text-muted max-w-xs text-xs leading-relaxed">
          Chats you share with other producers will appear here, with the recipient and time
          you sent them.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-white/[0.04]">
      {rows.map((row) => {
        const p = preview(row);
        const recipient = row.recipient_display_name ?? "Another producer";
        const active = activeId === row.id;
        return (
          <li key={row.id} className="group relative">
            <button
              onClick={() => onSelect(row)}
              className={`flex w-full items-start gap-3 px-4 py-3 pr-12 text-left transition-colors hover:bg-white/[0.03] ${
                active ? "bg-brangus/[0.08]" : ""
              }`}
            >
              <UserAvatar
                name={recipient}
                avatarUrl={avatars[row.recipient_user_id] ?? null}
                sizeClass="h-10 w-10"
                tone="brangus"
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-text-primary truncate text-sm font-medium">
                    To {recipient}
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
                <div className="mt-1 flex items-center gap-1.5">
                  {row.is_read ? (
                    <>
                      <CheckCheck className="text-brangus h-3 w-3" aria-hidden="true" />
                      <span className="text-brangus text-[10px] font-medium uppercase tracking-wide">
                        Read
                      </span>
                    </>
                  ) : (
                    <>
                      <Check className="text-text-muted h-3 w-3" aria-hidden="true" />
                      <span className="text-text-muted text-[10px] font-medium uppercase tracking-wide">
                        Sent
                      </span>
                    </>
                  )}
                </div>
              </div>
            </button>

            <button
              onClick={(e) => handleDelete(e, row.id)}
              disabled={deleting === row.id}
              className="text-text-muted hover:text-destructive absolute top-3 right-3 shrink-0 rounded-full p-1.5 transition-colors disabled:cursor-not-allowed"
              aria-label="Remove from Sent"
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
