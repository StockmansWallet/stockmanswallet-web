"use client";

// Chat hub layout: live chat panel + saved conversations sidebar
// Extracted from StockmanIQTabs when Brangus became its own section

import { useState, useCallback } from "react";
import { Brain, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BrangusChat } from "@/components/app/brangus-chat";
import { ConversationList } from "@/components/app/brangus/conversation-list";
import { fetchMessages } from "@/lib/brangus/conversation-service";
import type { BrangusConversationRow, BrangusMessageRow } from "@/lib/brangus/conversation-service";

interface BrangusHubProps {
  conversations: BrangusConversationRow[];
}

export function BrangusHub({ conversations: initialConversations }: BrangusHubProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<BrangusMessageRow[] | null>(null);
  const [loadingConv, setLoadingConv] = useState(false);
  const [chatResetKey, setChatResetKey] = useState(0);

  const handleSelectConversation = useCallback(async (id: string) => {
    if (id === activeConvId) return;
    setLoadingConv(true);
    try {
      const messages = await fetchMessages(id);
      setActiveConvId(id);
      setActiveMessages(messages);
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

  return (
    <div className="flex gap-4" style={{ height: "calc(100vh - 14rem)" }}>
      {/* Chat panel */}
      <Card className="flex flex-1 flex-col overflow-hidden rounded-3xl">
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
          />
        )}
      </Card>

      {/* Saved conversations sidebar */}
      <div className="flex w-96 shrink-0 flex-col gap-3">
        <button
          onClick={handleNewChat}
          className="flex items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </button>

        {conversations.length > 0 ? (
          <Card className="flex-1 overflow-y-auto rounded-2xl">
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
          <Card className="flex-1 rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
                <Brain className="h-6 w-6 text-brand" />
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
