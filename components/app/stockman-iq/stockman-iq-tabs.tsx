"use client";

// Tabbed layout for Stockman IQ hub page
// Tab 1: Brangus Chat (live chat + saved conversations side-by-side)
// Tab 2: Insights (full-width insight cards grid)

import { useState, useCallback } from "react";
import { MessageSquare, Sparkles, Brain, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { BrangusChat } from "@/components/app/brangus-chat";
import { ConversationList } from "@/components/app/brangus/conversation-list";
import { InsightCard } from "@/components/app/stockman-iq/insight-card";
import { fetchMessages } from "@/lib/brangus/conversation-service";
import type { BrangusConversationRow, BrangusMessageRow } from "@/lib/brangus/conversation-service";
import type { StockmanIQInsight } from "@/lib/stockman-iq/insight-engine";

interface StockmanIQTabsProps {
  conversations: BrangusConversationRow[];
  insights: StockmanIQInsight[];
}

export function StockmanIQTabs({ conversations, insights }: StockmanIQTabsProps) {
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<BrangusMessageRow[] | null>(null);
  const [loadingConv, setLoadingConv] = useState(false);

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
  }, []);

  const chatTab = (
    <div className="flex gap-4" style={{ height: "calc(100vh - 14rem)" }}>
      {/* Chat panel */}
      <Card className="flex flex-1 flex-col overflow-hidden rounded-3xl">
        {loadingConv ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          </div>
        ) : (
          <BrangusChat
            key={activeConvId ?? "new"}
            conversationId={activeConvId ?? undefined}
            initialMessages={activeMessages ?? undefined}
          />
        )}
      </Card>

      {/* Saved conversations sidebar */}
      <div className="flex w-80 shrink-0 flex-col gap-3">
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

  const insightsTab = (
    <div>
      {insights.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
              <Sparkles className="h-6 w-6 text-brand" />
            </div>
            <p className="text-sm font-medium text-text-primary">No insights yet</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-text-muted">
              Add some herds to your portfolio and insights will appear here automatically.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <Tabs
      tabs={[
        { id: "chat", label: "Brangus Chat", content: chatTab },
        { id: "insights", label: "Insights", content: insightsTab },
      ]}
      defaultTab="chat"
    />
  );
}
