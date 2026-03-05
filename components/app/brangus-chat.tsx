"use client";

// Interactive Brangus chat component
// Handles message display, input, API calls, and tool execution loop

import { useState, useRef, useEffect, useCallback } from "react";
import { Brain, Send, Loader2, AlertCircle } from "lucide-react";
import { sendMessage, buildSystemPrompt, loadChatDataStore } from "@/lib/brangus/chat-service";
import type { ChatMessage, AnthropicMessage, ChatDataStore } from "@/lib/brangus/types";
import { createClient } from "@/lib/supabase/client";

const SUGGESTED_PROMPTS = [
  "What's my portfolio worth today?",
  "Compare freight costs to Gracemere vs Roma",
  "When should I market my steers?",
  "How are cattle prices trending?",
  "What's coming up in my Yard Book?",
  "Give me a breakdown of all my herds",
];

export function BrangusChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationHistory, setConversationHistory] = useState<AnthropicMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialising, setIsInitialising] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [store, setStore] = useState<ChatDataStore | null>(null);
  const [systemPrompt, setSystemPrompt] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load portfolio data on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const dataStore = await loadChatDataStore();
        if (cancelled) return;
        const prompt = buildSystemPrompt(dataStore);
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
        user_id: user.id,
        title: event.title,
        date: event.date,
        category: event.category,
        is_all_day: event.is_all_day,
        notes: event.notes ?? null,
        is_recurring: event.is_recurring,
        recurrence_rule: event.recurrence_rule ?? null,
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

  const handleSend = useCallback(async (text?: string) => {
    const messageText = text ?? inputValue.trim();
    if (!messageText || isLoading || !store) return;

    setInputValue("");
    setError(null);

    // Add user message to UI
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { assistantText, updatedHistory } = await sendMessage(
        messageText,
        conversationHistory,
        store,
        systemPrompt
      );

      // Add assistant message to UI
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: assistantText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setConversationHistory(updatedHistory);

      // Persist any yard book mutations
      await persistMutations(store);
    } catch (err) {
      console.error("Brangus error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [inputValue, isLoading, store, conversationHistory, systemPrompt, persistMutations]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

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
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <EmptyState onPromptClick={(prompt) => handleSend(prompt)} />
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isLoading && <TypingIndicator />}
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

      {/* Input area */}
      <div className="border-t border-white/6 p-4">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Brangus anything..."
            disabled={isLoading}
            className="flex-1 resize-none rounded-xl bg-white/5 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none ring-1 ring-inset ring-white/10 transition-all focus:ring-brand/60 focus:bg-white/8 disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !inputValue.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition-colors hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
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
            className="rounded-full bg-white/5 px-3.5 py-1.5 text-xs text-text-secondary transition-all hover:bg-white/8 hover:text-text-primary"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

// MARK: - Message Bubble

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-brand text-white"
            : "bg-white/5 text-text-primary"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <FormattedResponse text={message.content} />
        )}
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

// MARK: - Typing Indicator

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 rounded-2xl bg-white/5 px-4 py-3">
        <span className="h-2 w-2 rounded-full bg-brand/60 animate-bounce [animation-delay:0ms]" />
        <span className="h-2 w-2 rounded-full bg-brand/60 animate-bounce [animation-delay:150ms]" />
        <span className="h-2 w-2 rounded-full bg-brand/60 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}
