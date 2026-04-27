"use client";

// Conversation list for the Brangus hub page
// Shows past Brangus conversations with title, preview, and relative time
// Supports bulk selection and deletion

import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { MessageCircleMore, Trash2, CheckSquare, Square, X } from "lucide-react";
import { softDeleteConversation, bulkSoftDeleteConversations } from "@/lib/brangus/conversation-service";
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
  onSelect?: (id: string) => void;
  onDeleted?: (ids: string[]) => void;
  activeId?: string | null;
  toolbarContainer?: HTMLElement | null;
}

export function ConversationList({
  conversations,
  onSelect,
  onDeleted,
  activeId,
  toolbarContainer,
}: ConversationListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) =>
      prev.size === conversations.length
        ? new Set()
        : new Set(conversations.map((c) => c.id))
    );
  }, [conversations]);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelected(new Set());
  }, []);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await softDeleteConversation(id);
      onDeleted?.([id]);
      router.refresh();
    } catch (err) {
      console.error("Failed to delete conversation:", err);
      setDeletingId(null);
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0 || isBulkDeleting) return;
    const ids = [...selected];
    setIsBulkDeleting(true);
    try {
      await bulkSoftDeleteConversations(ids);
      onDeleted?.(ids);
    } catch (err) {
      console.error("Failed to bulk delete:", err);
    } finally {
      setIsBulkDeleting(false);
      setSelectMode(false);
      setSelected(new Set());
      router.refresh();
    }
  }

  const allSelected = selected.size === conversations.length && conversations.length > 0;

  const toolbar = selectMode ? (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={toggleAll}
          className="flex h-8 items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.07] px-3 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-white/[0.1] hover:text-text-primary"
        >
          {allSelected ? (
            <CheckSquare className="h-3.5 w-3.5 text-brand" />
          ) : (
            <Square className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">{allSelected ? "Deselect all" : "Select all"}</span>
        </button>
        {selected.size > 0 && (
          <span className="hidden text-[10px] text-text-muted sm:inline">
            {selected.size} selected
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {selected.size > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); handleBulkDelete(); }}
            disabled={isBulkDeleting}
            className="flex h-8 items-center gap-1.5 rounded-full bg-error/10 px-3 text-[11px] font-semibold text-error transition-colors hover:bg-error/20 disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" />
            Delete{selected.size > 1 ? ` (${selected.size})` : ""}
          </button>
        )}
        <button
          onClick={exitSelectMode}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.07] text-text-muted transition-colors hover:bg-white/[0.1] hover:text-text-primary"
          aria-label="Cancel selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </>
  ) : (
    <>
      <span />
      {conversations.length > 1 && (
        <button
          onClick={() => setSelectMode(true)}
          className="inline-flex h-8 items-center rounded-full border border-white/[0.1] bg-white/[0.08] px-3 text-[11px] font-semibold text-text-primary transition-colors hover:bg-white/[0.12]"
        >
          Select
        </button>
      )}
    </>
  );

  return (
    <div>
      {toolbarContainer
        ? createPortal(
            <div className="flex items-center justify-end gap-2">{toolbar}</div>,
            toolbarContainer
          )
        : null}
      {/* Toolbar: sticky so it stays above conversation rows during scroll */}
      {!toolbarContainer && (
        <div className="sticky top-0 z-10 flex items-center justify-between bg-card px-3 pb-2">
          {toolbar}
        </div>
      )}

      {/* Conversation rows */}
      <div className="space-y-2">
        {conversations.map((conv) => {
          const isDeleting = deletingId === conv.id || (isBulkDeleting && selected.has(conv.id));
          const isSelected = selected.has(conv.id);

          return (
            <div
              key={conv.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (selectMode) {
                  toggleSelect(conv.id);
                } else if (onSelect) {
                  onSelect(conv.id);
                } else {
                  router.push(`/dashboard/brangus/chat/${conv.id}`);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (selectMode) toggleSelect(conv.id);
                  else if (onSelect) onSelect(conv.id);
                  else router.push(`/dashboard/brangus/chat/${conv.id}`);
                }
              }}
              className={`group flex w-full cursor-pointer items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-white/[0.05] ${
                isDeleting ? "pointer-events-none opacity-40" : ""
              } ${isSelected ? "bg-white/[0.04]" : ""} ${activeId === conv.id ? "bg-brangus/10" : ""}`}
            >
              {/* Checkbox in select mode, icon otherwise */}
              {selectMode ? (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                  {isSelected ? (
                    <CheckSquare className="h-5 w-5 text-brangus" />
                  ) : (
                    <Square className="h-5 w-5 text-text-muted" />
                  )}
                </div>
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brangus/15">
                  <MessageCircleMore className="h-4 w-4 text-brangus" />
                </div>
              )}

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

              {/* Single delete button (only in normal mode) */}
              {!selectMode && (
                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  className="mt-0.5 shrink-0 rounded-lg p-1.5 text-text-muted opacity-0 transition-all hover:bg-error/10 hover:text-error group-hover:opacity-100"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
