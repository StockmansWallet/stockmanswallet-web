"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback, type ReactNode } from "react";
import { MessageThread } from "@/components/app/advisory/message-thread";
import { ChatInput } from "@/components/app/chat/chat-input";
import { TypingIndicator } from "@/components/app/chat/typing-indicator";
import { AnimatePresence } from "framer-motion";
import { ShareMenu } from "@/components/app/ch40/share-menu";
import { ShareAttachmentCard } from "@/components/app/ch40/share-attachment-card";
import { useTypingIndicator } from "@/hooks/use-typing-indicator";
import { createClient } from "@/lib/supabase/client";
import { sendProducerMessage, fetchProducerMessages } from "./actions";
import type { AdvisoryMessage, MessageAttachment } from "@/lib/types/advisory";

// Polling is a safety net only - the realtime subscription handles
// live delivery. Stretched from 5s to 60s so we aren't double-fetching
// every 5 seconds on top of postgres_changes events. When the
// websocket is healthy, polling falls through with no work; when it
// drops, this is the catch-up.
const POLL_INTERVAL = 60_000;
// Peer bubble uses the Producer Network accent (sage, -dark variant for
// filled-area legibility, matching the Brangus chat pattern).
const OTHER_BG = "var(--color-ch40-dark)";

interface ProducerChatClientProps {
  connectionId: string;
  currentUserId: string;
  messages: AdvisoryMessage[];
  participants: Record<string, { name: string; role: string }>;
  avatars?: Record<string, { url?: string | null; initials?: string }>;
  header?: ReactNode;
}

export function ProducerChatClient({
  connectionId,
  currentUserId,
  messages: initialMessages,
  participants,
  avatars,
  header,
}: ProducerChatClientProps) {
  const [messages, setMessages] = useState<AdvisoryMessage[]>(initialMessages);
  const [animatedIds, setAnimatedIds] = useState<Set<string>>(new Set());
  const [pendingAttachment, setPendingAttachment] = useState<MessageAttachment | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollFrameRef = useRef<number | null>(null);
  // Tracks whether the user is pinned to the bottom of the thread so a
  // new message or typing-indicator pulse only auto-scrolls when they
  // were already at the bottom. Defaults to true so the very first
  // render scrolls into the latest messages instead of stranding the
  // user at the top of a long history.
  const userPinnedToBottomRef = useRef(true);

  const { peerIsTyping, notifyTyping, notifyTypingStop, clearPeerTyping } = useTypingIndicator(
    `chat:${connectionId}`,
    currentUserId
  );

  // Pull the peer's avatar so the typing indicator sits on the same row
  // identity as the message bubbles below it. Peer = whichever party in
  // the avatars map is not the local user.
  const { url: peerAvatarUrl, initials: peerAvatarInitials } = (() => {
    if (!avatars) return { url: undefined, initials: undefined };
    for (const [uid, meta] of Object.entries(avatars)) {
      if (uid !== currentUserId) {
        return { url: meta.url ?? undefined, initials: meta.initials };
      }
    }
    return { url: undefined, initials: undefined };
  })();

  const mergeMessage = useCallback(
    (incoming: AdvisoryMessage) => {
      setMessages((prev) => {
        // Strip any optimistic temp row that matches the incoming message
        // (same sender, same content) so the user doesn't briefly see
        // their bubble twice when the realtime INSERT outraces our own
        // server action's response.
        const withoutOptimisticDup = prev.filter((m) => {
          if (m.id === incoming.id) return false;
          if (
            m.id.startsWith("optimistic-") &&
            m.sender_user_id === incoming.sender_user_id &&
            m.content === incoming.content
          ) {
            return false;
          }
          return true;
        });
        const next = [...withoutOptimisticDup, incoming].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        // Prune animatedIds to ids that still exist after the merge so the
        // set doesn't grow unbounded for the lifetime of the chat session.
        setAnimatedIds((ids) => {
          const liveIds = new Set(next.map((m) => m.id));
          const pruned = new Set<string>();
          for (const id of ids) {
            if (liveIds.has(id)) pruned.add(id);
          }
          pruned.add(incoming.id);
          return pruned;
        });
        return next;
      });
      // Clear the indicator locally the moment we know the peer sent. The
      // broadcast stop event can land after the INSERT, and the message is
      // the stronger signal that typing has ended.
      if (incoming.sender_user_id !== currentUserId) {
        clearPeerTyping();
      }
    },
    [clearPeerTyping, currentUserId]
  );

  // Auto-scroll to bottom only when the user is already pinned there. We
  // can't compute "at bottom" inside the layout effect because the new
  // bubble has already grown the scroll height by then - scrollTop hasn't
  // moved, so the distance check would always read "scrolled up". A
  // scroll listener tracks the pinned state continuously instead.
  // First call uses "auto" so the chat opens at the bottom without a
  // visible scroll animation. Later calls choose the behaviour based on
  // what changed: typing can glide in, but message insertion and typing
  // removal lock to the bottom immediately so the thread does not chase a
  // moving scrollHeight while exit animations are running.
  const hasScrolledOnceRef = useRef(false);
  const previousLayoutStateRef = useRef({
    messageCount: messages.length,
    peerIsTyping,
    hasPendingAttachment: Boolean(pendingAttachment),
  });

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    hasScrolledOnceRef.current = true;

    if (scrollFrameRef.current != null) {
      cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = requestAnimationFrame(() => {
      const latestContainer = scrollContainerRef.current;
      if (!latestContainer) return;
      latestContainer.scrollTo({
        top: latestContainer.scrollHeight - latestContainer.clientHeight,
        behavior,
      });
      scrollFrameRef.current = null;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current != null) {
        cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handleScroll = () => {
      const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
      userPinnedToBottomRef.current = distanceFromBottom < 80;
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useLayoutEffect(() => {
    const previous = previousLayoutStateRef.current;
    const current = {
      messageCount: messages.length,
      peerIsTyping,
      hasPendingAttachment: Boolean(pendingAttachment),
    };
    previousLayoutStateRef.current = current;

    if (!userPinnedToBottomRef.current) return;

    const messageCountChanged = previous.messageCount !== current.messageCount;
    const pendingAttachmentChanged =
      previous.hasPendingAttachment !== current.hasPendingAttachment;
    const typingAppeared =
      !previous.peerIsTyping &&
      current.peerIsTyping &&
      !messageCountChanged &&
      !pendingAttachmentChanged;
    const behavior: ScrollBehavior =
      !hasScrolledOnceRef.current || !typingAppeared ? "auto" : "smooth";

    scrollToBottom(behavior);
  }, [messages.length, peerIsTyping, pendingAttachment, scrollToBottom]);

  // Live message subscription with a polling fallback for missed websocket events.
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    const supabase = createClient();

    async function startRealtime() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled && session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
      if (cancelled) return;

      // Use the full connection id in the channel name. Truncating to 8
      // chars created a non-zero collision risk between conversations
      // sharing a UUID prefix; a collision would silently merge realtime
      // streams across threads.
      channel = supabase
        .channel(`producer-chat-${connectionId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "advisory_messages",
            filter: `connection_id=eq.${connectionId}`,
          },
          (payload) => {
            mergeMessage(payload.new as AdvisoryMessage);
          }
        )
        .subscribe();
    }

    async function refreshMessages() {
      const result = await fetchProducerMessages(connectionId);
      if (cancelled) return;
      if (result.error) {
        // Polling is the safety net; if it errors we want it visible in
        // logs rather than silently leaving the chat stuck for up to 60s.
        // Realtime's still attached so most users won't notice, but the
        // log gives us something to grep for if a regression slips in.
        console.warn("[ch40] polling fetch failed:", result.error);
        return;
      }
      if (!result.messages) return;

      setMessages((prev) => {
        const prevIds = new Set(prev.map((m) => m.id));
        const brandNew = result.messages.filter((m) => !prevIds.has(m.id));

        if (brandNew.length > 0) {
          // Prune animatedIds to ids that still exist in the new message
          // list so the set doesn't grow unbounded across long sessions
          // (clearProducerMessages or future moderation can drop ids).
          setAnimatedIds((ids) => {
            const liveIds = new Set(result.messages.map((m) => m.id));
            const next = new Set<string>();
            for (const id of ids) {
              if (liveIds.has(id)) next.add(id);
            }
            for (const m of brandNew) next.add(m.id);
            return next;
          });
          return result.messages;
        }
        return prev;
      });
    }

    void startRealtime();

    const interval = setInterval(async () => {
      await refreshMessages();
    }, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [connectionId, mergeMessage]);

  const handleSend = useCallback(
    async (text: string) => {
      // The ChatInput invokes onSend with empty string when only an attachment
      // is queued. That's legal here because the action accepts content OR
      // attachment.
      const attachmentForThisSend = pendingAttachment;
      if (!text.trim() && !attachmentForThisSend) return;

      const optimisticMsg: AdvisoryMessage = {
        id: `optimistic-${Date.now()}`,
        connection_id: connectionId,
        sender_user_id: currentUserId,
        message_type: "general_note",
        content: text,
        created_at: new Date().toISOString(),
        attachment: attachmentForThisSend,
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      setAnimatedIds((ids) => new Set(ids).add(optimisticMsg.id));
      setPendingAttachment(null);

      const result = await sendProducerMessage(
        connectionId,
        text,
        "general_note",
        attachmentForThisSend
      );

      if (result?.error) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        // Give the attachment back so the sender can retry or edit.
        if (attachmentForThisSend) setPendingAttachment(attachmentForThisSend);
        return;
      }

      if (result?.message) {
        setMessages((prev) => {
          const withoutOptimisticOrDuplicate = prev.filter(
            (m) => m.id !== optimisticMsg.id && m.id !== result.message.id
          );
          return [...withoutOptimisticOrDuplicate, result.message].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });
      }
    },
    [connectionId, currentUserId, pendingAttachment]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollContainerRef}
          className="absolute inset-0 overflow-y-auto pt-[5.25rem] pb-4"
        >
          <div className="space-y-3 px-5 pt-4">
            <MessageThread
              messages={messages}
              currentUserId={currentUserId}
              participants={participants}
              connectionId={connectionId}
              animatedMessageIds={animatedIds}
              hideSenderName
              otherBgClass="bg-ch40-dark"
              otherTailColor={OTHER_BG}
              avatars={avatars}
            />
            <AnimatePresence initial={false} mode="popLayout" presenceAffectsLayout={false}>
              {peerIsTyping && (
                <TypingIndicator
                  key="typing"
                  bgColor={OTHER_BG}
                  dotClass="bg-white/50"
                  reserveAvatarSpace={!!avatars}
                  avatarUrl={peerAvatarUrl}
                  avatarInitials={peerAvatarInitials}
                  className="mt-2"
                />
              )}
            </AnimatePresence>
            <div aria-hidden className={pendingAttachment ? "h-44" : "h-28"} />
            <div ref={messagesEndRef} />
          </div>
        </div>
        {header && <div className="absolute inset-x-0 top-0 z-20">{header}</div>}
      </div>

      <div className="relative z-10 shrink-0 border-t border-white/[0.08] bg-white/[0.06] bg-clip-padding p-4 backdrop-blur-2xl backdrop-saturate-150">
        {/* Pending-attachment preview sits above the input so the sender
            can see what's queued and remove it before hitting send. */}
        {pendingAttachment && (
          <div className="bg-surface-lowest mb-2 flex items-start gap-2 rounded-xl border border-white/5 p-2 pr-2">
            <div className="flex-1">
              <ShareAttachmentCard attachment={pendingAttachment} />
            </div>
            <button
              type="button"
              onClick={() => setPendingAttachment(null)}
              aria-label="Remove attachment"
              className="text-text-muted hover:text-text-primary mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-white/10"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <ShareMenu onAttach={setPendingAttachment} />
          <div className="flex-1">
            <ChatInput
              onSend={handleSend}
              onTyping={notifyTyping}
              onTypingStop={notifyTypingStop}
              placeholder={
                pendingAttachment ? "Add a note (optional), then send..." : "Write a message..."
              }
              accentClass="bg-ch40 hover:bg-ch40"
              allowEmpty={pendingAttachment != null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
