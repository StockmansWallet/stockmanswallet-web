"use client";

// Read-only Brangus hub shown to the demo account. Mirrors the real BrangusHub
// tab layout (Chat + Saved Chats) but renders from hardcoded conversations so
// the live AI endpoint is never hit.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, MessageCircle, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeaderActionsPortal } from "@/components/ui/page-header-actions-portal";
import { ChatBubble } from "@/components/app/chat/chat-bubble";
import { QuickInsightRow } from "@/components/app/chat/quick-insight-row";
import type { CardAction } from "@/lib/brangus/types";
import {
  DEMO_ACTIVE_CONVERSATION,
  DEMO_SAVED_CONVERSATIONS,
  type DemoConversation,
} from "@/lib/brangus/demo-chats";

const BRANGUS_BG = "var(--color-brangus-dark)";
const USER_BG = "var(--color-chat-user)";
const BRANGUS_AVATAR = "/images/brangus-chat-profile.webp";
const DEMO_USER_AVATAR = "/images/demo-user-profile.webp";

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

function DemoChatView({
  conversation,
  onCardAction,
}: {
  conversation: DemoConversation;
  onCardAction: (action: CardAction) => void;
}) {
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
                bgClass={isUser ? "bg-chat-user" : "bg-brangus-dark"}
                tailColor={isUser ? USER_BG : BRANGUS_BG}
                textClass={isUser ? "text-white" : "text-white"}
                avatarUrl={isUser ? DEMO_USER_AVATAR : BRANGUS_AVATAR}
              >
                {isUser ? msg.content : <FormattedAssistantText text={msg.content} />}
              </ChatBubble>
            );
          })}
        </div>
      </div>

      {/* Summary card strip - mirrors the real Brangus chat */}
      {conversation.insights && conversation.insights.length > 0 && (
        <div className="border-t border-white/10 py-2">
          <QuickInsightRow insights={conversation.insights} onCardAction={onCardAction} />
        </div>
      )}

      {/* Read-only composer */}
      <div className="border-t border-white/10 p-4">
        <div className="bg-surface flex items-center justify-between gap-3 rounded-full px-4 py-2.5">
          <div className="text-text-muted flex items-center gap-2 text-sm">
            <Lock className="h-3.5 w-3.5" />
            <span>Chat is read-only in demo mode.</span>
          </div>
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
      <div className="bg-brangus/10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
        <MessageCircle className="text-brangus h-4 w-4" />
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
  const router = useRouter();
  const [activeConvId, setActiveConvId] = useState<string>(DEMO_ACTIVE_CONVERSATION.id);
  const [activeTab, setActiveTab] = useState<TabId>("chat");

  const handleCardAction = useCallback(
    (action: CardAction) => {
      switch (action.type) {
        case "yardBook":
          router.push("/dashboard/tools/yard-book");
          break;
        case "herdDetail":
          router.push(`/dashboard/herds/${action.id}`);
          break;
        case "portfolio":
          router.push("/dashboard");
          break;
        case "market":
          router.push("/dashboard/market");
          break;
        case "freight":
          router.push("/dashboard/tools/freight");
          break;
      }
    },
    [router]
  );

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
      <PageHeaderActionsPortal>
        <Link
          href="/sign-up"
          className="bg-brangus-dark hover:bg-brangus-text inline-flex h-9 shrink-0 items-center rounded-full px-4 text-[13px] font-semibold text-white transition-colors"
        >
          Sign up to chat live
        </Link>
      </PageHeaderActionsPortal>

      {/* Mobile tab bar */}
      <div
        ref={containerRef}
        className="relative mb-4 flex gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] bg-clip-padding p-1 lg:hidden"
      >
        <div
          className={`bg-brangus/15 absolute top-1 bottom-1 rounded-full ${
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
              activeTab === tab.id ? "text-brangus" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] lg:gap-4">
        <div className="min-w-0">
          {/* Demo notice strip (replaces the action toolbar from the live hub) */}
          <div className="bg-brangus/5 border-brangus/20 mb-4 flex items-center gap-2.5 rounded-full border px-4 py-2 text-xs lg:hidden">
            <Sparkles className="text-brangus h-3.5 w-3.5 shrink-0" />
            <p className="text-text-secondary leading-snug">
              You&apos;re exploring Brangus with sample conversations. Sign up to ask your own
              questions and get live answers tailored to your herd.
            </p>
          </div>

          {/* Chat tab */}
          <div
            className={
              activeTab !== "chat"
                ? "hidden h-[calc(100vh-19rem)] lg:block lg:h-[calc(100vh-7.5rem)]"
                : "h-[calc(100vh-19rem)] lg:h-[calc(100vh-7.5rem)]"
            }
          >
            <Card className="flex h-full flex-col overflow-hidden rounded-3xl">
              <DemoChatView conversation={activeConv} onCardAction={handleCardAction} />
            </Card>
          </div>

          {/* Saved Chats tab on mobile */}
          <div
            className={activeTab !== "saved" ? "hidden" : "lg:hidden"}
            style={{ height: "calc(100vh - 19rem)" }}
          >
            <Card className="h-full overflow-y-auto rounded-2xl">
              <CardContent className="p-2">
                <DemoSavedList activeConvId={activeConvId} onSelect={handleSelectSaved} />
              </CardContent>
            </Card>
          </div>
        </div>

        <aside className="mt-4 hidden min-w-0 lg:mt-0 lg:block">
          <Card className="flex h-[calc(100vh-7.5rem)] flex-col overflow-hidden rounded-3xl">
            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <div>
                <p className="text-text-primary text-sm font-semibold">Saved Chats</p>
                <p className="text-text-muted mt-0.5 text-xs">
                  {DEMO_SAVED_CONVERSATIONS.length + 1} saved
                </p>
              </div>
              <Sparkles className="text-brangus h-4 w-4" />
            </div>
            <CardContent className="min-h-0 flex-1 overflow-y-auto p-2">
              <DemoSavedList activeConvId={activeConvId} onSelect={handleSelectSaved} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function DemoSavedList({
  activeConvId,
  onSelect,
}: {
  activeConvId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="divide-y divide-white/[0.04]">
      {[DEMO_ACTIVE_CONVERSATION, ...DEMO_SAVED_CONVERSATIONS].map((conv) => (
        <SavedConversationRow
          key={conv.id}
          conv={conv}
          active={conv.id === activeConvId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
