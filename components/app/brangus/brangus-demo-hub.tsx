"use client";

// Read-only Brangus hub shown to the demo account. Mirrors the real BrangusHub
// tab layout (Chat + Saved Chats) but renders from hardcoded conversations so
// the live AI endpoint is never hit.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Lock, MessageCircle, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ChatBubble } from "@/components/app/chat/chat-bubble";
import {
  DEMO_ACTIVE_CONVERSATION,
  DEMO_SAVED_CONVERSATIONS,
  type DemoConversation,
} from "@/lib/brangus/demo-chats";

const BRANGUS_BG = "#44372D";
const USER_BG = "var(--color-brand)";
const BRANGUS_AVATAR = "/images/brangus-chat-profile.webp";

type TabId = "chat" | "saved";

function relativeDaysLabel(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  return `${Math.round(days / 7)} weeks ago`;
}

function FormattedAssistantText({ text }: { text: string }) {
  const paragraphs = text.split("\n\n").filter((p) => p.trim());
  return (
    <div className="space-y-3">
      {paragraphs.map((para, i) => {
        const lines = para.split("\n");
        return (
          <div key={i}>
            {lines.map((line, j) => {
              const trimmed = line.trim();
              if (/^[A-Z].{5,60}:$/.test(trimmed)) {
                return (
                  <p key={j} className={`text-[15px] font-bold text-white ${j > 0 ? "mt-2" : ""}`}>
                    {trimmed.slice(0, -1)}
                  </p>
                );
              }
              const labelMatch = trimmed.match(/^([A-Z][^:]{2,30}):\s+(.+)$/);
              if (labelMatch) {
                return (
                  <p key={j} className="whitespace-pre-wrap">
                    <span className="text-text-muted">{labelMatch[1]}:</span>{" "}
                    <span className="font-medium">{labelMatch[2]}</span>
                  </p>
                );
              }
              return (
                <p key={j} className="whitespace-pre-wrap">
                  {trimmed}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function DemoChatView({ conversation }: { conversation: DemoConversation }) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
        <div className="space-y-3">
          {conversation.messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <ChatBubble
                key={msg.id}
                side={isUser ? "right" : "left"}
                bgClass={isUser ? "bg-brand" : "bg-[#44372D]"}
                tailColor={isUser ? USER_BG : BRANGUS_BG}
                textClass={isUser ? "text-white" : "text-white/80"}
                avatarUrl={isUser ? undefined : BRANGUS_AVATAR}
                avatarInitials={isUser ? "DS" : undefined}
              >
                {isUser ? msg.content : <FormattedAssistantText text={msg.content} />}
              </ChatBubble>
            );
          })}
        </div>
      </div>

      {/* Read-only composer */}
      <div className="border-t border-white/10 p-4">
        <div className="bg-surface flex items-center justify-between gap-3 rounded-full px-4 py-2.5">
          <div className="text-text-muted flex items-center gap-2 text-sm">
            <Lock className="h-3.5 w-3.5" />
            <span>Chat is read-only in demo mode.</span>
          </div>
          <Link
            href="/sign-up"
            className="bg-brand hover:bg-brand-dark inline-flex h-8 shrink-0 items-center rounded-full px-3 text-xs font-semibold text-white transition-colors"
          >
            Sign up to chat live
          </Link>
        </div>
      </div>
    </div>
  );
}

function SavedConversationRow({
  conv,
  active,
  onSelect,
}: {
  conv: DemoConversation;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(conv.id)}
      className={`group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
        active ? "bg-surface-raised" : "hover:bg-surface"
      }`}
    >
      <div className="bg-brand/10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
        <MessageCircle className="text-brand h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-text-primary truncate text-sm font-semibold">{conv.title}</p>
          <span className="text-text-muted shrink-0 text-[11px]">
            {relativeDaysLabel(conv.daysAgo)}
          </span>
        </div>
        <p className="text-text-muted mt-0.5 truncate text-xs leading-relaxed">{conv.preview}</p>
      </div>
    </button>
  );
}

export function BrangusDemoHub() {
  const [activeConvId, setActiveConvId] = useState<string>(DEMO_ACTIVE_CONVERSATION.id);
  const [activeTab, setActiveTab] = useState<TabId>("chat");

  // Sliding tab indicator (copied pattern from BrangusHub)
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [ready, setReady] = useState(false);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const btn = buttonRefs.current.get(activeTab);
    if (!container || !btn) return;
    const cr = container.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    setIndicator({ left: br.left - cr.left, width: br.width });
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

  const tabs: { id: TabId; label: string }[] = [
    { id: "chat", label: "Chat" },
    { id: "saved", label: "Saved Chats" },
  ];

  const handleSelectSaved = (id: string) => {
    setActiveConvId(id);
    setActiveTab("chat");
  };

  const activeConv =
    DEMO_ACTIVE_CONVERSATION.id === activeConvId
      ? DEMO_ACTIVE_CONVERSATION
      : (DEMO_SAVED_CONVERSATIONS.find((c) => c.id === activeConvId) ?? DEMO_ACTIVE_CONVERSATION);

  return (
    <div>
      {/* Tab bar */}
      <div
        ref={containerRef}
        className="bg-surface relative mb-4 flex gap-1 rounded-full p-1 backdrop-blur-md"
      >
        <div
          className={`bg-surface-high absolute top-1 bottom-1 rounded-full shadow-sm ${
            ready ? "transition-all duration-250 ease-out" : ""
          }`}
          style={{ left: indicator.left, width: indicator.width }}
        />
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) buttonRefs.current.set(tab.id, el);
            }}
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

      {/* Demo notice strip (replaces the action toolbar from the live hub) */}
      <div className="bg-brand/5 border-brand/20 mb-4 flex items-center gap-2.5 rounded-full border px-4 py-2 text-xs">
        <Sparkles className="text-brand h-3.5 w-3.5 shrink-0" />
        <p className="text-text-secondary leading-snug">
          You&apos;re exploring Brangus with sample conversations. Sign up to ask your own questions
          and get live answers tailored to your herd.
        </p>
      </div>

      {/* Chat tab */}
      <div
        className={activeTab !== "chat" ? "hidden" : ""}
        style={{ height: "calc(100vh - 19rem)" }}
      >
        <Card className="flex h-full flex-col overflow-hidden rounded-3xl">
          <DemoChatView conversation={activeConv} />
        </Card>
      </div>

      {/* Saved Chats tab */}
      <div
        className={activeTab !== "saved" ? "hidden" : ""}
        style={{ height: "calc(100vh - 19rem)" }}
      >
        <Card className="h-full overflow-y-auto rounded-2xl">
          <CardContent className="p-2">
            <div className="divide-y divide-white/[0.04]">
              {[DEMO_ACTIVE_CONVERSATION, ...DEMO_SAVED_CONVERSATIONS].map((conv) => (
                <SavedConversationRow
                  key={conv.id}
                  conv={conv}
                  active={conv.id === activeConvId}
                  onSelect={handleSelectSaved}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
