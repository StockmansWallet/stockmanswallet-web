"use client";

// Chat hub layout: tabbed view with live chat + saved conversations
// Both tabs stay mounted so chat state is preserved when switching

import { useState, useCallback, useRef, useEffect } from "react";
import { MessageCircle, MessageCirclePlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BrangusChat } from "@/components/app/brangus-chat";
import { ConversationList } from "@/components/app/brangus/conversation-list";
import { SharedChatList } from "@/components/app/brangus/shared-chat-list";
import { SharedChatPanel } from "@/components/app/brangus/shared-chat-panel";
import { createClient } from "@/lib/supabase/client";
import { fetchMessages } from "@/lib/brangus/conversation-service";
import { fetchInboxSharedChats } from "@/lib/brangus/shared-chats-service";
import type { BrangusConversationRow, BrangusMessageRow } from "@/lib/brangus/conversation-service";
import type { SharedChatRow } from "@/lib/brangus/shared-chats-service";

type TabId = "chat" | "saved" | "shared";

interface BrangusHubProps {
  conversations: BrangusConversationRow[];
}

export function BrangusHub({ conversations: initialConversations }: BrangusHubProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<BrangusMessageRow[] | null>(null);
  const [loadingConv, setLoadingConv] = useState(false);
  const [chatResetKey, setChatResetKey] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>("chat");

  // Shared chat selected in the Shared tab. When set, the list is replaced with
  // the SharedChatPanel so the viewer reads it in-place without leaving the hub.
  const [activeSharedChat, setActiveSharedChat] = useState<SharedChatRow | null>(null);

  // Unread badge count for the Shared tab. Declared here (above the callbacks
  // that use setSharedUnread) so the setter is in scope at callback definition.
  const [sharedUnread, setSharedUnread] = useState(0);

  // Increments each time a new shared chat arrives via realtime. SharedChatList
  // watches this so it re-fetches while the tab is open, rather than waiting
  // for the user to switch away and back.
  const [sharedListRefreshKey, setSharedListRefreshKey] = useState(0);

  // Toolbar portal container (callback ref so it triggers re-render when set)
  const [toolbarEl, setToolbarEl] = useState<HTMLDivElement | null>(null);

  // Sliding indicator state
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [ready, setReady] = useState(false);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const btn = buttonRefs.current.get(activeTab);
    if (!container || !btn) return;
    const containerRect = container.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setIndicator({
      left: btnRect.left - containerRect.left,
      width: btnRect.width,
    });
    setReady(true);
  }, [activeTab]);

  useEffect(() => {
    measure();
  }, [measure]);
  useEffect(() => {
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [measure]);

  const handleSelectConversation = useCallback(
    async (id: string) => {
      if (id === activeConvId) return;
      setLoadingConv(true);
      try {
        const messages = await fetchMessages(id);
        setActiveConvId(id);
        setActiveMessages(messages);
        setActiveTab("chat");
      } catch (err) {
        console.error("Failed to load conversation:", err);
      } finally {
        setLoadingConv(false);
      }
    },
    [activeConvId]
  );

  const handleNewChat = useCallback(() => {
    setActiveConvId(null);
    setActiveMessages(null);
    setChatResetKey((k) => k + 1);
    setActiveTab("chat");
  }, []);

  const handleConversationCreated = useCallback((conv: BrangusConversationRow) => {
    setConversations((prev) => [conv, ...prev]);
  }, []);

  const handleConversationUpdated = useCallback(
    (id: string, updates: Partial<BrangusConversationRow>) => {
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    },
    []
  );

  const handleConversationDeleted = useCallback(
    (deletedIds: string[]) => {
      setConversations((prev) => prev.filter((c) => !deletedIds.includes(c.id)));
      if (activeConvId && deletedIds.includes(activeConvId)) {
        setActiveConvId(null);
        setActiveMessages(null);
        setChatResetKey((k) => k + 1);
      }
    },
    [activeConvId]
  );

  const handleSelectSharedChat = useCallback((chat: SharedChatRow) => {
    setActiveSharedChat(chat);
    // Decrement badge immediately if the chat was unread (the panel marks it
    // read asynchronously, but the badge should clear right away).
    if (!chat.is_read) {
      setSharedUnread((n) => Math.max(0, n - 1));
    }
  }, []);

  const handleSharedChatBack = useCallback(() => {
    setActiveSharedChat(null);
  }, []);

  const handleSharedChatRemoved = useCallback(() => {
    setActiveSharedChat(null);
    // SharedChatList re-fetches on mount, but also decrement the badge in case
    // the removed chat was unread.
    setSharedUnread((n) => Math.max(0, n - 1));
  }, []);

  // Triple-layer realtime for the Shared tab badge:
  //   1. Supabase Realtime postgres_changes for instant badge updates when a
  //      new share arrives (INSERT) or a chat is marked read (UPDATE).
  //   2. Tab-visibility re-fetch catches any realtime events missed while the
  //      tab was in the background.
  //   3. 15s polling as a safety net for flaky websocket connections.
  //
  // Runs once on mount; does not depend on activeTab so the badge stays live
  // even while the user is on the Chat or Saved tabs.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function refreshUnread() {
      if (cancelled) return;
      try {
        const rows = await fetchInboxSharedChats();
        if (!cancelled) setSharedUnread(rows.filter((r) => !r.is_read).length);
      } catch {
        // Best-effort; badge stays at last known value
      }
    }

    async function init() {
      await refreshUnread();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      // setAuth is required on cookie-auth clients so RLS-filtered
      // postgres_changes events are delivered over the websocket.
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }

      channel = supabase
        .channel(`brangus-shared-${user.id.slice(0, 8)}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "brangus_shared_chats",
            filter: `recipient_user_id=eq.${user.id}`,
          },
          () => {
            // New share received: update badge and refresh the list (if open).
            refreshUnread();
            setSharedListRefreshKey((k) => k + 1);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "brangus_shared_chats",
            filter: `recipient_user_id=eq.${user.id}`,
          },
          () => { refreshUnread(); },
        )
        .subscribe();
    }

    init();

    function handleVisibility() {
      if (document.visibilityState === "visible") refreshUnread();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    const interval = setInterval(refreshUnread, 15_000);

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, []); // intentionally empty: runs once on mount

  const tabs: { id: TabId; label: string; badge?: number }[] = [
    { id: "chat", label: "Chat" },
    { id: "saved", label: "Saved Chats" },
    { id: "shared", label: "Shared", badge: sharedUnread },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div
        ref={containerRef}
        className="bg-surface relative mb-4 flex gap-1 rounded-full p-1 backdrop-blur-md"
      >
        <div
          className={`bg-surface-high absolute top-1 bottom-1 rounded-full shadow-sm ${ready ? "transition-all duration-250 ease-out" : ""}`}
          style={{ left: indicator.left, width: indicator.width }}
        />
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) buttonRefs.current.set(tab.id, el);
            }}
            onClick={() => setActiveTab(tab.id)}
            className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 ${
              activeTab === tab.id
                ? "text-text-primary"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge && tab.badge > 0 ? (
              <span className="bg-producer-network inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">
                {tab.badge > 9 ? "9+" : tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Action toolbar: Share (portalled from BrangusChat) sits next to New
          Chat on the right so both live in the same visual cluster. The
          portal target is empty until the chat has enough messages to share. */}
      <div className="bg-surface-lowest mb-4 flex items-center justify-end gap-1.5 rounded-full px-2 py-1.5 backdrop-blur-md">
        <div ref={setToolbarEl} className="flex items-center gap-1.5" />
        <button
          onClick={handleNewChat}
          className="bg-brangus-dark hover:bg-brangus-text inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-white transition-colors"
        >
          <MessageCirclePlus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Chat tab (always mounted, hidden when inactive) */}
      <div
        className={activeTab !== "chat" ? "hidden" : ""}
        style={{ height: "calc(100vh - 19rem)" }}
      >
        <Card className="flex h-full flex-col overflow-hidden rounded-3xl">
          {loadingConv ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="border-brangus h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          ) : (
            <BrangusChat
              key={activeConvId ?? `new-${chatResetKey}`}
              conversationId={activeConvId ?? undefined}
              initialMessages={activeMessages ?? undefined}
              pastConversationCount={conversations.length}
              onConversationCreated={handleConversationCreated}
              onConversationUpdated={handleConversationUpdated}
              toolbarContainer={toolbarEl}
            />
          )}
        </Card>
      </div>

      {/* Saved Chats tab (always mounted, hidden when inactive) */}
      <div
        className={activeTab !== "saved" ? "hidden" : ""}
        style={{ height: "calc(100vh - 19rem)" }}
      >
        {conversations.length > 0 ? (
          <Card className="h-full overflow-y-auto rounded-2xl">
            <CardContent className="p-2">
              <ConversationList
                conversations={conversations}
                onSelect={handleSelectConversation}
                onDeleted={handleConversationDeleted}
                activeId={activeConvId}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="bg-brangus/10 mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                <MessageCircle className="text-brangus h-6 w-6" />
              </div>
              <p className="text-text-primary text-sm font-medium">No conversations yet</p>
              <p className="text-text-muted mt-1 max-w-xs text-xs leading-relaxed">
                Start a chat with Brangus to get AI-powered insights about your herd and the market.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Shared tab (always mounted, hidden when inactive).
          Chats other producers have shared with the current user. Unread
          count drives the badge on the tab bar above.
          When activeSharedChat is set, the list is replaced with the panel so
          the chat renders in-place with the same bubble layout as the live chat. */}
      <div
        className={activeTab !== "shared" ? "hidden" : ""}
        style={{ height: "calc(100vh - 19rem)" }}
      >
        {activeSharedChat ? (
          <Card className="flex h-full flex-col overflow-hidden rounded-3xl">
            <SharedChatPanel
              chat={activeSharedChat}
              viewerIsRecipient={true}
              onBack={handleSharedChatBack}
              onRemoved={handleSharedChatRemoved}
            />
          </Card>
        ) : (
          <Card className="h-full overflow-y-auto rounded-2xl">
            <CardContent className="p-2">
              <SharedChatList
                onSelect={handleSelectSharedChat}
                refreshSignal={sharedListRefreshKey}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
