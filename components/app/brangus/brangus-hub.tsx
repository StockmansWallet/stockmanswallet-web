"use client";

// Chat hub layout: tabbed view with live chat + saved conversations
// Both tabs stay mounted so chat state is preserved when switching

import { useState, useCallback, useRef, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BrangusChat } from "@/components/app/brangus-chat";
import { ConversationList } from "@/components/app/brangus/conversation-list";
import { fetchMessages } from "@/lib/brangus/conversation-service";
import type { BrangusConversationRow, BrangusMessageRow } from "@/lib/brangus/conversation-service";

type TabId = "chat" | "saved";

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

  useEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [measure]);

  const handleSelectConversation = useCallback(async (id: string) => {
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
  }, [activeConvId]);

  const handleNewChat = useCallback(() => {
    setActiveConvId(null);
    setActiveMessages(null);
    setChatResetKey((k) => k + 1);
    setActiveTab("chat");
  }, []);

  const handleConversationCreated = useCallback((conv: BrangusConversationRow) => {
    setConversations((prev) => [conv, ...prev]);
  }, []);

  const handleConversationUpdated = useCallback((id: string, updates: Partial<BrangusConversationRow>) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  }, []);

  const handleConversationDeleted = useCallback((deletedIds: string[]) => {
    setConversations((prev) => prev.filter((c) => !deletedIds.includes(c.id)));
    if (activeConvId && deletedIds.includes(activeConvId)) {
      setActiveConvId(null);
      setActiveMessages(null);
      setChatResetKey((k) => k + 1);
    }
  }, [activeConvId]);

  const tabs: { id: TabId; label: string }[] = [
    { id: "chat", label: "Chat" },
    { id: "saved", label: "Saved Chats" },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div ref={containerRef} className="relative mb-4 flex gap-1 rounded-full bg-surface p-1">
        <div
          className={`absolute top-1 bottom-1 rounded-full bg-surface-high shadow-sm ${ready ? "transition-all duration-250 ease-out" : ""}`}
          style={{ left: indicator.left, width: indicator.width }}
        />
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => { if (el) buttonRefs.current.set(tab.id, el); }}
            onClick={() => setActiveTab(tab.id)}
            className={`relative z-10 flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 ${
              activeTab === tab.id
                ? "text-text-primary"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Action toolbar: export buttons (portalled from BrangusChat) + New Chat */}
      <div className="mb-4 flex items-center justify-between rounded-full bg-surface-lowest px-2 py-1.5">
        {/* Left: portal target for export buttons from BrangusChat */}
        <div ref={setToolbarEl} className="flex items-center" />

        {/* Right: New Chat */}
        <button
          onClick={handleNewChat}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-brand px-3.5 text-xs font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          New Chat
        </button>
      </div>

      {/* Chat tab (always mounted, hidden when inactive) */}
      <div data-print-chat-wrapper className={activeTab !== "chat" ? "hidden" : ""} style={{ height: "calc(100vh - 19rem)" }}>
        <Card data-print-chat-card className="flex h-full flex-col overflow-hidden rounded-3xl">
          {loadingConv ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
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
      <div className={activeTab !== "saved" ? "hidden" : ""} style={{ height: "calc(100vh - 19rem)" }}>
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
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
                <MessageCircle className="h-6 w-6 text-brand" />
              </div>
              <p className="text-sm font-medium text-text-primary">No conversations yet</p>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-text-muted">
                Start a chat with Brangus to get AI-powered insights about your herd and the market.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
