"use client";

// Interactive Brangus chat component
// Handles message display, input, API calls, and tool execution loop

import { useState, useRef, useEffect, useCallback } from "react";
import { Brain, Loader2, AlertCircle } from "lucide-react";
import { sendMessage, buildSystemPrompt, loadChatDataStore, fetchServerPersonality } from "@/lib/brangus/chat-service";
import { createConversation, saveMessage, autoTitleConversation } from "@/lib/brangus/conversation-service";
import type { ChatMessage, AnthropicMessage, ChatDataStore, QuickInsight } from "@/lib/brangus/types";
import { createClient } from "@/lib/supabase/client";
import { ChatBubble } from "@/components/app/chat/chat-bubble";
import { ChatInput } from "@/components/app/chat/chat-input";
import { TypingIndicator } from "@/components/app/chat/typing-indicator";
import { QuickInsightRow } from "@/components/app/chat/quick-insight-row";

const SUGGESTED_PROMPTS = [
  "What's my portfolio worth today?",
  "Compare freight costs to Gracemere vs Roma",
  "When should I market my steers?",
  "How are cattle prices trending?",
  "What's coming up in my Yard Book?",
  "Give me a breakdown of all my herds",
];

// Brangus brand brown (matches Theme+StockmanIQ.swift)
const BRANGUS_BG = "#4D331F";
// User brand color
const USER_BG = "var(--color-brand)";

export function BrangusChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationHistory, setConversationHistory] = useState<AnthropicMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialising, setIsInitialising] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [store, setStore] = useState<ChatDataStore | null>(null);
  const [systemPrompt, setSystemPrompt] = useState("");
  // Accumulated summary cards for the persistent bottom strip - grows across the session
  const [sessionCards, setSessionCards] = useState<QuickInsight[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cardStripRef = useRef<HTMLDivElement>(null);
  const postTypingIdRef = useRef<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const hasRequestedTitleRef = useRef(false);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-scroll card strip to newest card
  useEffect(() => {
    if (cardStripRef.current) {
      cardStripRef.current.scrollLeft = cardStripRef.current.scrollWidth;
    }
  }, [sessionCards]);

  // Load portfolio data on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) userIdRef.current = user.id;

        // Debug: Fetch personality from server (mirrors iOS ServerConfig pattern)
        const [dataStore, serverPersonality] = await Promise.all([
          loadChatDataStore(),
          fetchServerPersonality(),
        ]);
        if (cancelled) return;
        const prompt = buildSystemPrompt(dataStore, serverPersonality);
        setStore(dataStore);
        setSystemPrompt(prompt);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load chat data:", err);
        setError("Failed to load your portfolio data. Please refresh and try again.");
      } finally {
        if (!cancelled) setIsInitialising(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  // Persist yard book mutations after each response
  const persistMutations = useCallback(async (dataStore: ChatDataStore) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Create new yard book events
    for (const event of dataStore.pendingYardBookEvents) {
      await supabase.from("yard_book_items").insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        title: event.title,
        event_date: event.date,
        category_raw: event.category,
        is_all_day: event.is_all_day,
        notes: event.notes ?? null,
        is_recurring: event.is_recurring,
        recurrence_rule_raw: event.recurrence_rule ?? null,
      });
    }
    dataStore.pendingYardBookEvents = [];

    // Process yard book actions
    for (const action of dataStore.pendingYardBookActions) {
      if (action.action === "complete") {
        await supabase
          .from("yard_book_items")
          .update({ is_completed: true })
          .eq("id", action.itemId);
      } else if (action.action === "delete") {
        await supabase
          .from("yard_book_items")
          .update({ is_deleted: true, deleted_at: new Date().toISOString() })
          .eq("id", action.itemId);
      }
    }
    dataStore.pendingYardBookActions = [];
  }, []);

  const handleSend = useCallback(async (text: string) => {
    if (!text || isLoading || !store) return;

    setError(null);
    const userId = userIdRef.current;

    // Create conversation on first send
    if (!conversationIdRef.current && userId) {
      try {
        const conv = await createConversation(userId);
        conversationIdRef.current = conv.id;
      } catch (err) {
        console.error("Failed to create conversation:", err);
      }
    }

    // Add user message to UI
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Persist user message (non-blocking)
    const convId = conversationIdRef.current;
    if (convId && userId) {
      saveMessage(convId, userId, "user", text).catch((err) =>
        console.error("Failed to persist user message:", err)
      );
    }

    try {
      const { assistantText, updatedHistory, quickInsights } = await sendMessage(
        text,
        conversationHistory,
        store,
        systemPrompt
      );

      // Add assistant message to UI (fade in, not bounce, since it replaces typing indicator)
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: assistantText,
        timestamp: new Date(),
      };
      postTypingIdRef.current = assistantMessage.id;
      setMessages((prev) => [...prev, assistantMessage]);

      // Append summary cards to the persistent bottom strip
      if (quickInsights && quickInsights.length > 0) {
        setSessionCards((prev) => [...prev, ...quickInsights]);
      }
      setConversationHistory(updatedHistory);

      // Persist assistant message (non-blocking)
      if (convId && userId) {
        saveMessage(convId, userId, "assistant", assistantText).catch((err) =>
          console.error("Failed to persist assistant message:", err)
        );
      }

      // Auto-title after first exchange
      if (convId && !hasRequestedTitleRef.current) {
        hasRequestedTitleRef.current = true;
        autoTitleConversation(convId, text, assistantText).catch((err) =>
          console.error("Auto-title failed:", err)
        );
      }

      // Persist any yard book mutations
      await persistMutations(store);
    } catch (err) {
      console.error("Brangus error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, store, conversationHistory, systemPrompt, persistMutations]);

  // Loading state
  if (isInitialising) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
        <p className="text-sm text-text-muted">Loading your portfolio data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
        {messages.length === 0 ? (
          <EmptyState onPromptClick={(prompt) => handleSend(prompt)} />
        ) : (
          <div className="mx-auto max-w-2xl space-y-3">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              const isPostTyping = msg.id === postTypingIdRef.current;
              return (
                <ChatBubble
                  key={msg.id}
                  side={isUser ? "right" : "left"}
                  bgClass={isUser ? "bg-brand" : "bg-[#4D331F]"}
                  tailColor={isUser ? USER_BG : BRANGUS_BG}
                  textClass={isUser ? "text-white" : "text-text-primary"}
                  animate
                  animationType={isPostTyping ? "fade" : "bounce"}
                >
                  {isUser ? (
                    msg.content
                  ) : (
                    <FormattedResponse text={msg.content} />
                  )}
                </ChatBubble>
              );
            })}
            {isLoading && <TypingIndicator bgColor={BRANGUS_BG} dotClass="bg-brand/60" />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl bg-error/10 px-4 py-2.5 text-sm text-error">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Summary card strip - persistent bottom strip that accumulates across the session */}
      {sessionCards.length > 0 && (
        <div ref={cardStripRef} className="border-t border-white/8 px-4 py-2 overflow-x-auto scrollbar-none">
          <div className="mx-auto max-w-2xl">
            <QuickInsightRow insights={sessionCards} />
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-white/6 p-4">
        <div className="mx-auto max-w-2xl">
          <ChatInput
            onSend={handleSend}
            placeholder="Ask Brangus anything..."
            disabled={!store}
            loading={isLoading}
            accentClass="bg-brand hover:bg-brand-dark"
          />
        </div>
      </div>
    </div>
  );
}

// MARK: - Empty State

function EmptyState({ onPromptClick }: { onPromptClick: (prompt: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10">
        <Brain className="h-7 w-7 text-brand" />
      </div>
      <div>
        <p className="font-semibold text-text-primary">G&apos;day, I&apos;m Brangus</p>
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-text-muted">
          Ask me anything about your herds, freight costs, market conditions, or livestock management.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPromptClick(prompt)}
            className="rounded-xl bg-white/5 px-3.5 py-1.5 text-xs text-text-secondary transition-all hover:bg-white/8 hover:text-text-primary"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

// MARK: - Formatted Response (renders markdown-like formatting)

function FormattedResponse({ text }: { text: string }) {
  // Split into paragraphs and render with basic formatting
  const paragraphs = text.split("\n\n").filter((p) => p.trim());

  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, i) => {
        const lines = paragraph.split("\n");

        return (
          <div key={i}>
            {lines.map((line, j) => {
              const trimmed = line.trim();

              // Bullet point
              if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                return (
                  <div key={j} className="flex gap-2 pl-1">
                    <span className="text-text-muted shrink-0">-</span>
                    <span className="whitespace-pre-wrap">{formatInlineText(trimmed.slice(2))}</span>
                  </div>
                );
              }

              // Label: Value pattern (e.g., "Total cost: $2,100")
              const labelMatch = trimmed.match(/^([A-Z][^:]{2,30}):\s+(.+)$/);
              if (labelMatch) {
                return (
                  <p key={j} className="whitespace-pre-wrap">
                    <span className="text-text-muted">{labelMatch[1]}:</span>{" "}
                    <span className="font-medium">{formatInlineText(labelMatch[2])}</span>
                  </p>
                );
              }

              // Regular text
              return (
                <p key={j} className="whitespace-pre-wrap">
                  {formatInlineText(trimmed)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function formatInlineText(text: string): string {
  // Bold **text** -> just return plain for now (CSS handles weight via .font-medium)
  return text.replace(/\*\*(.*?)\*\*/g, "$1");
}

