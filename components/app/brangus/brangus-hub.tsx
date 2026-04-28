"use client";

// Chat hub layout: tabbed view with live chat + saved conversations
// Both tabs stay mounted so chat state is preserved when switching

import { useState, useCallback, useRef, useEffect, useLayoutEffect } from "react";
import { Inbox, MessageCircle, MessageCirclePlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeaderActionsPortal } from "@/components/ui/page-header-actions-portal";
import { BrangusChat } from "@/components/app/brangus-chat";
import { ConversationList } from "@/components/app/brangus/conversation-list";
import { SharedChatList } from "@/components/app/brangus/shared-chat-list";
import { SentChatList } from "@/components/app/brangus/sent-chat-list";
import { SharedChatPanel } from "@/components/app/brangus/shared-chat-panel";
import { createClient } from "@/lib/supabase/client";
import { fetchMessages } from "@/lib/brangus/conversation-service";
import { fetchInboxSharedChats } from "@/lib/brangus/shared-chats-service";
import type { BrangusConversationRow, BrangusMessageRow } from "@/lib/brangus/conversation-service";
import type { SharedChatRow, SentSharedChatRow } from "@/lib/brangus/shared-chats-service";

type TabId = "chat" | "saved" | "shared";

interface BrangusHubProps {
  conversations: BrangusConversationRow[];
  isAdvisor?: boolean;
  userFirstName?: string;
}

export function BrangusHub({
  conversations: initialConversations,
  isAdvisor = false,
  userFirstName,
}: BrangusHubProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<BrangusMessageRow[] | null>(null);
  const [loadingConv, setLoadingConv] = useState(false);
  const [chatResetKey, setChatResetKey] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>("chat");

  // Shared chat selected in the Shared tab. When set, the list is replaced with
  // the SharedChatPanel so the viewer reads it in-place without leaving the hub.
  // sharedSubTab toggles between "Inbox" (received) and "Sent" (this user shared)
  // and resets activeSharedChat so the user lands back in the relevant list.
  type SharedSubTab = "inbox" | "sent";
  const [sharedSubTab, setSharedSubTab] = useState<SharedSubTab>("inbox");
  const [activeSharedChat, setActiveSharedChat] = useState<SharedChatRow | null>(null);
  const [activeSentRecipient, setActiveSentRecipient] = useState<string | null>(null);

  // Unread badge count for the Shared tab. Declared here (above the callbacks
  // that use setSharedUnread) so the setter is in scope at callback definition.
  const [sharedUnread, setSharedUnread] = useState(0);

  // Increments each time a new shared chat arrives via realtime. SharedChatList
  // watches this so it re-fetches while the tab is open, rather than waiting
  // for the user to switch away and back.
  const [sharedListRefreshKey, setSharedListRefreshKey] = useState(0);

  // Toolbar portal container (callback ref so it triggers re-render when set)
  const [toolbarEl, setToolbarEl] = useState<HTMLDivElement | null>(null);
  const [savedActionsEl, setSavedActionsEl] = useState<HTMLDivElement | null>(null);

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
    const next = {
      left: Math.round(btnRect.left - containerRect.left),
      width: Math.round(btnRect.width),
    };
    setIndicator((current) => {
      if (current.left === next.left && current.width === next.width) return current;
      return next;
    });
    setReady((current) => current || true);
  }, [activeTab]);

  useLayoutEffect(() => {
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
    setActiveSentRecipient(null);
    // Decrement badge immediately if the chat was unread (the panel marks it
    // read asynchronously, but the badge should clear right away).
    if (!chat.is_read) {
      setSharedUnread((n) => Math.max(0, n - 1));
    }
  }, []);

  const handleSelectSentChat = useCallback((chat: SentSharedChatRow) => {
    // Reuse the same SharedChatPanel - just thread the recipient name through.
    setActiveSharedChat(chat);
    setActiveSentRecipient(chat.recipient_display_name);
  }, []);

  const handleSharedChatBack = useCallback(() => {
    setActiveSharedChat(null);
    setActiveSentRecipient(null);
  }, []);

  const handleSharedChatRemoved = useCallback(() => {
    setActiveSharedChat(null);
    setActiveSentRecipient(null);
    // SharedChatList re-fetches on mount, but also decrement the badge in case
    // the removed chat was unread (only relevant on the inbox path).
    if (sharedSubTab === "inbox") {
      setSharedUnread((n) => Math.max(0, n - 1));
    }
  }, [sharedSubTab]);

  const handleSwitchSharedSubTab = useCallback((next: SharedSubTab) => {
    setSharedSubTab(next);
    // Switching sub-tabs always clears the open chat so the viewer lands back
    // in the relevant list rather than seeing a stale detail panel.
    setActiveSharedChat(null);
    setActiveSentRecipient(null);
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

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      // setAuth is required on cookie-auth clients so RLS-filtered
      // postgres_changes events are delivered over the websocket.
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "brangus_shared_chats",
            filter: `recipient_user_id=eq.${user.id}`,
          },
          () => {
            refreshUnread();
          }
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
    { id: "chat", label: "Brangus Chat" },
    { id: "saved", label: "Saved Chats" },
    { id: "shared", label: "Shared", badge: sharedUnread },
  ];
  const desktopTabs = tabs.filter((tab) => tab.id !== "saved");
  const desktopMainTab = activeTab === "shared" ? "shared" : "chat";

  return (
    <div>
      {/* Mobile tab bar */}
      <div
        ref={containerRef}
        className="relative mb-4 flex gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] bg-clip-padding p-1 lg:hidden"
      >
        <div
          className={`bg-brangus/15 absolute top-1 bottom-1 rounded-full ${ready ? "transition-all duration-250 ease-out" : ""}`}
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
              activeTab === tab.id ? "text-brangus" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge && tab.badge > 0 ? (
              <span className="bg-brangus inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">
                {tab.badge > 9 ? "9+" : tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Action toolbar: Share is portalled from BrangusChat once available. */}
      <PageHeaderActionsPortal>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] bg-clip-padding p-1 lg:flex">
            {desktopTabs.map((tab) => {
              const active = desktopMainTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-brangus/15 text-brangus"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge && tab.badge > 0 ? (
                    <span className="bg-brangus inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">
                      {tab.badge > 9 ? "9+" : tab.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div ref={setToolbarEl} className="flex items-center gap-2" />
          <button
            onClick={handleNewChat}
            className="bg-brangus-dark hover:bg-brangus-text inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-semibold text-white transition-colors"
          >
            <MessageCirclePlus className="h-4 w-4" aria-hidden="true" />
            <span>New Chat</span>
          </button>
        </div>
      </PageHeaderActionsPortal>

      <div className="bg-surface-lowest mb-4 flex items-center justify-end gap-1.5 rounded-full px-2 py-1.5 lg:hidden">
        <button
          onClick={handleNewChat}
          className="bg-brangus-dark hover:bg-brangus-text inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-white transition-colors"
        >
          <MessageCirclePlus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>New Chat</span>
        </button>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] lg:gap-4">
        <div className="min-w-0">
          {/* Chat tab (always mounted, hidden when inactive) */}
          <div
            className={
              activeTab === "chat"
                ? "h-[calc(100vh-23.5rem)] sm:h-[calc(100vh-22rem)] lg:h-[calc(100vh-109px)]"
                : activeTab === "saved"
                  ? "hidden h-[calc(100vh-23.5rem)] sm:h-[calc(100vh-22rem)] lg:block lg:h-[calc(100vh-109px)]"
                  : "hidden h-[calc(100vh-23.5rem)] sm:h-[calc(100vh-22rem)] lg:h-[calc(100vh-109px)]"
            }
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
                  isAdvisor={isAdvisor}
                  userFirstName={userFirstName}
                />
              )}
            </Card>
          </div>

          {/* Saved Chats tab on mobile */}
          <div
            className={activeTab !== "saved" ? "hidden" : "lg:hidden"}
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
              <SavedChatsEmpty />
            )}
          </div>

          {/* Shared tab (always mounted, hidden when inactive).
              Sub-tabs: Inbox (received) and Sent (this user shared). Inbox unread
              count drives the badge on the parent tab bar.
              On desktop, the list moves into the right rail so the left pane is
              reserved for reading the selected shared chat. */}
          <div
            className={
              desktopMainTab !== "shared"
                ? "hidden h-[calc(100vh-19rem)] lg:h-[calc(100vh-109px)]"
                : "h-[calc(100vh-19rem)] lg:h-[calc(100vh-109px)]"
            }
          >
            <div className="h-full">
              {activeSharedChat ? (
                <Card className="flex h-full flex-col overflow-hidden rounded-3xl">
                  <SharedChatPanel
                    chat={activeSharedChat}
                    viewerIsRecipient={sharedSubTab === "inbox"}
                    recipientDisplayName={activeSentRecipient}
                    onBack={handleSharedChatBack}
                    onRemoved={handleSharedChatRemoved}
                  />
                </Card>
              ) : (
                <>
                  <Card className="hidden h-full flex-col overflow-hidden rounded-3xl lg:flex">
                    <SharedViewerEmpty />
                  </Card>
                  <Card className="flex h-full flex-col overflow-hidden rounded-2xl lg:hidden">
                    <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3">
                      <SharedInboxSentTabs
                        sharedSubTab={sharedSubTab}
                        sharedUnread={sharedUnread}
                        onSwitch={handleSwitchSharedSubTab}
                      />
                    </div>
                    <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
                      <div className="h-full">
                        {sharedSubTab === "inbox" ? (
                          <SharedChatList
                            onSelect={handleSelectSharedChat}
                            activeId={undefined}
                            refreshSignal={sharedListRefreshKey}
                          />
                        ) : (
                          <SentChatList
                            onSelect={handleSelectSentChat}
                            activeId={undefined}
                            refreshSignal={sharedListRefreshKey}
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </div>

        <aside className="mt-4 hidden min-w-0 lg:mt-0 lg:block">
          {desktopMainTab === "shared" ? (
            <Card className="flex h-[calc(100vh-109px)] flex-col overflow-hidden rounded-3xl">
              <div className="relative min-h-0 flex-1">
                <CardContent className="absolute inset-0 overflow-y-auto p-0 pt-[7.5rem]">
                  {sharedSubTab === "inbox" ? (
                    <SharedChatList
                      onSelect={handleSelectSharedChat}
                      activeId={activeSharedChat?.id}
                      refreshSignal={sharedListRefreshKey}
                    />
                  ) : (
                    <SentChatList
                      onSelect={handleSelectSentChat}
                      activeId={activeSharedChat?.id}
                      refreshSignal={sharedListRefreshKey}
                    />
                  )}
                </CardContent>
                <div className="absolute inset-x-0 top-0 z-20 [transform:translateZ(0)] border-b border-white/[0.08] bg-white/[0.06] bg-clip-padding px-4 py-3 backdrop-blur-2xl backdrop-saturate-150 [backface-visibility:hidden]">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-text-primary text-sm font-semibold">Shared Chats</p>
                      <p className="text-text-muted mt-0.5 text-xs">
                        {sharedSubTab === "inbox" ? "Received chats" : "Chats you sent"}
                      </p>
                    </div>
                  </div>
                  <SharedInboxSentTabs
                    sharedSubTab={sharedSubTab}
                    sharedUnread={sharedUnread}
                    onSwitch={handleSwitchSharedSubTab}
                  />
                </div>
              </div>
            </Card>
          ) : (
            <Card className="flex h-[calc(100vh-109px)] flex-col overflow-hidden rounded-3xl">
              <div className="relative min-h-0 flex-1">
                <CardContent className="absolute inset-0 overflow-y-auto p-2 pt-[4.5rem]">
                  {conversations.length > 0 ? (
                    <ConversationList
                      conversations={conversations}
                      onSelect={handleSelectConversation}
                      onDeleted={handleConversationDeleted}
                      activeId={activeConvId}
                      toolbarContainer={savedActionsEl}
                    />
                  ) : (
                    <SavedChatsEmpty compact />
                  )}
                </CardContent>
                <div className="absolute inset-x-0 top-0 z-20 flex [transform:translateZ(0)] items-center justify-between border-b border-white/[0.08] bg-white/[0.06] bg-clip-padding px-4 py-3 backdrop-blur-2xl backdrop-saturate-150 [backface-visibility:hidden]">
                  <div>
                    <p className="text-text-primary text-sm font-semibold">Saved Chats</p>
                    <p className="text-text-muted mt-0.5 text-xs">{conversations.length} saved</p>
                  </div>
                  <div ref={setSavedActionsEl} className="flex items-center justify-end" />
                </div>
              </div>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function SharedInboxSentTabs({
  sharedSubTab,
  sharedUnread,
  onSwitch,
}: {
  sharedSubTab: "inbox" | "sent";
  sharedUnread: number;
  onSwitch: (next: "inbox" | "sent") => void;
}) {
  return (
    <div className="flex w-full items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] bg-clip-padding p-1">
      <button
        onClick={() => onSwitch("inbox")}
        className={`flex h-8 flex-1 items-center justify-center rounded-full px-3 text-xs font-semibold transition-colors ${
          sharedSubTab === "inbox"
            ? "bg-brangus-dark text-white"
            : "text-text-muted hover:text-text-secondary"
        }`}
      >
        Inbox{sharedUnread > 0 ? ` (${sharedUnread})` : ""}
      </button>
      <button
        onClick={() => onSwitch("sent")}
        className={`flex h-8 flex-1 items-center justify-center rounded-full px-3 text-xs font-semibold transition-colors ${
          sharedSubTab === "sent"
            ? "bg-brangus-dark text-white"
            : "text-text-muted hover:text-text-secondary"
        }`}
      >
        Sent
      </button>
    </div>
  );
}

function SharedViewerEmpty() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="bg-brangus/15 mb-4 flex h-14 w-14 items-center justify-center rounded-full">
        <Inbox className="text-brangus h-7 w-7" />
      </div>
      <p className="text-text-primary text-base font-semibold">Select a shared chat</p>
      <p className="text-text-muted mt-2 max-w-sm text-sm leading-relaxed">
        Choose something from the shared rail to read it here in full chat format.
      </p>
    </div>
  );
}

function SavedChatsEmpty({ compact = false }: { compact?: boolean }) {
  const content = (
    <div className="flex h-full flex-col items-center justify-center py-12 text-center">
      <div className="bg-brangus/10 mb-3 flex h-12 w-12 items-center justify-center rounded-full">
        <MessageCircle className="text-brangus h-6 w-6" />
      </div>
      <p className="text-text-primary text-sm font-medium">No conversations yet</p>
      <p className="text-text-muted mt-1 max-w-xs text-xs leading-relaxed">
        Start a chat with Brangus to get AI-powered insights about your herd and the market.
      </p>
    </div>
  );

  if (compact) return content;

  return (
    <Card className="h-full rounded-2xl">
      <CardContent className="h-full">{content}</CardContent>
    </Card>
  );
}
