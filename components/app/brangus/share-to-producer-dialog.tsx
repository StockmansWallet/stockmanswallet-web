"use client";

// Share a Brangus conversation with another producer on the network.
// Opens as a modal dialog, loads discoverable producers, lets the user pick
// one + add an optional note, and sends via the shared-chats-service.

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Search, Send, X, Check, Loader2, User2 } from "lucide-react";
import {
  fetchShareablePicks,
  shareConversation,
  type SharePickerProducer,
} from "@/lib/brangus/shared-chats-service";
import type { QuickInsight } from "@/lib/brangus/types";

// Debug: Keep this decoupled from BrangusMessageRow/ChatMessage so both the
// live chat (ChatMessage) and the saved-conversation review (BrangusMessageRow)
// can feed this dialog with a minimal shape.
export interface ShareableMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date | string; // ISO string or Date - service normalises
}

interface ShareToProducerDialogProps {
  open: boolean;
  onClose: () => void;
  conversationId: string | null;
  conversationTitle: string | null;
  messages: ShareableMessage[];
  /**
   * Summary cards accumulated during the session. Shipped alongside the
   * message snapshot so the recipient sees the same headline figures the
   * sender was looking at. Empty or undefined = no strip on the recipient's
   * side.
   */
  cards?: QuickInsight[];
  senderDisplayName: string | null;
}

export function ShareToProducerDialog({
  open,
  onClose,
  conversationId,
  conversationTitle,
  messages,
  cards,
  senderDisplayName,
}: ShareToProducerDialogProps) {
  const [loading, setLoading] = useState(true);
  const [producers, setProducers] = useState<SharePickerProducer[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sentName, setSentName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Portal mount guard: createPortal requires document.body which is only
  // available client-side. Set after first mount so SSR pre-renders nothing.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // Reset state whenever the dialog opens so stale selections don't persist.
  useEffect(() => {
    if (!open) return;
    setSelectedId(null);
    setNote("");
    setSearch("");
    setError(null);
    setSentName(null);
    setLoading(true);
    fetchShareablePicks()
      .then((rows) => setProducers(rows))
      .catch(() => setError("Couldn't load the producer network."))
      .finally(() => setLoading(false));
  }, [open]);

  // Escape-to-close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = producers.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.display_name.toLowerCase().includes(q)
      || (p.property_name?.toLowerCase().includes(q) ?? false)
      || (p.region?.toLowerCase().includes(q) ?? false)
      || (p.state?.toLowerCase().includes(q) ?? false)
    );
  });

  const handleSend = useCallback(async () => {
    if (!selectedId) return;
    setSending(true);
    setError(null);
    try {
      // Normalise messages to the service's expected shape. Date -> ISO string.
      const normalised = messages.map((m) => ({
        role: m.role,
        content: m.content,
        created_at: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
      }));
      await shareConversation({
        recipientUserId: selectedId,
        originalConversationId: conversationId,
        title: conversationTitle,
        senderDisplayName,
        messages: normalised,
        cards,
        note,
      });
      const recipient = producers.find((p) => p.user_id === selectedId);
      setSentName(recipient?.display_name ?? null);
      // Close automatically after a brief confirmation so the user lands back
      // in the chat without manual dismissal.
      setTimeout(onClose, 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the share.");
    } finally {
      setSending(false);
    }
  }, [
    selectedId,
    conversationId,
    conversationTitle,
    senderDisplayName,
    messages,
    cards,
    note,
    producers,
    onClose,
  ]);

  if (!open || !isMounted) return null;

  // Portal to document.body so the dialog escapes any parent overflow/transform
  // stacking context (e.g. the Card that wraps BrangusChat) and the full-page
  // backdrop-blur applies correctly to the Brangus wallpaper and all content.
  const dialog = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Share with a producer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface/95 relative mx-4 flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-white/[0.10] shadow-2xl backdrop-blur-xl">
        <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <h2 className="text-text-primary text-base font-semibold">Share with a producer</h2>
            <p className="text-text-muted mt-0.5 text-xs">
              They&apos;ll see this chat in their Brangus Shared tab.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary rounded-full p-1"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {sentName !== null ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <div className="bg-producer-network/15 flex h-14 w-14 items-center justify-center rounded-full">
              <Check className="text-producer-network h-7 w-7" />
            </div>
            <p className="text-text-primary text-base font-semibold">Shared</p>
            <p className="text-text-muted text-sm">
              {sentName
                ? `${sentName} will see it in their Brangus Shared tab.`
                : "They'll see it in their Brangus Shared tab."}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3 px-5 py-4">
              <div>
                <label className="text-text-secondary text-xs font-semibold">
                  Add a note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 280))}
                  placeholder="e.g. thought you&apos;d find this useful"
                  rows={2}
                  className="bg-surface-lowest text-text-primary mt-1.5 w-full resize-none rounded-lg border border-white/[0.08] px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-white/[0.16]"
                />
              </div>

              <div className="relative">
                <Search className="text-text-muted pointer-events-none absolute top-2.5 left-3 h-4 w-4" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search producers"
                  className="bg-surface-lowest text-text-primary w-full rounded-lg border border-white/[0.08] py-2 pr-3 pl-9 text-sm outline-none placeholder:text-white/30 focus:border-white/[0.16]"
                />
              </div>
            </div>

            <div className="max-h-[220px] overflow-y-auto border-t border-white/[0.06]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="text-brangus h-5 w-5 animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                  <User2 className="text-text-muted/50 h-8 w-8" />
                  <p className="text-text-secondary text-sm font-medium">No producers found</p>
                  <p className="text-text-muted text-xs">
                    {producers.length === 0
                      ? "Connect with producers in the Producer Network first, then you can share chats with them."
                      : "Try a different search term."}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-white/[0.04]">
                  {filtered.map((p) => {
                    const isSelected = selectedId === p.user_id;
                    const subline = [p.property_name, [p.region, p.state].filter(Boolean).join(", ")]
                      .filter(Boolean)
                      .join(" - ");
                    return (
                      <li key={p.user_id}>
                        <button
                          onClick={() => setSelectedId(p.user_id)}
                          className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors ${
                            isSelected ? "bg-producer-network/10" : "hover:bg-white/[0.03]"
                          }`}
                        >
                          <div className="bg-producer-network/20 text-producer-network flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                            {p.display_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-text-primary truncate text-sm font-medium">
                              {p.display_name}
                            </p>
                            {subline && (
                              <p className="text-text-muted truncate text-xs">{subline}</p>
                            )}
                          </div>
                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                              isSelected
                                ? "border-producer-network bg-producer-network text-white"
                                : "border-white/20"
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-white/[0.06] bg-black/20 px-5 py-3">
              {error ? (
                <p className="text-destructive text-xs">{error}</p>
              ) : (
                <p className="text-text-muted text-xs">
                  {messages.length} message{messages.length === 1 ? "" : "s"} will be shared
                </p>
              )}
              <button
                onClick={handleSend}
                disabled={!selectedId || sending}
                className="bg-brangus hover:bg-brangus-text inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>{sending ? "Sending..." : "Send"}</span>
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
