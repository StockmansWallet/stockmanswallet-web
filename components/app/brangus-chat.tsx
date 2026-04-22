"use client";

// Interactive Brangus chat component
// Handles message display, input, API calls, and tool execution loop

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Brain,
  ChevronDown,
  Loader2,
  AlertCircle,
  ClipboardCopy,
  Download,
  Check,
  FileText,
  Share2,
  Mail,
  MessageCircle,
  Users,
} from "lucide-react";
import { ShareToProducerDialog } from "@/components/app/brangus/share-to-producer-dialog";
import {
  sendMessage,
  buildSystemPrompt,
  loadChatDataStore,
  fetchServerConfig,
} from "@/lib/brangus/chat-service";
import { fetchUserMemories } from "@/lib/brangus/tools";
import {
  createConversation,
  saveMessage,
  autoTitleConversation,
  formatConversationForExport,
} from "@/lib/brangus/conversation-service";
import type { BrangusConversationRow } from "@/lib/brangus/conversation-service";
import { useSpeechRecognition } from "@/lib/brangus/use-speech-recognition";
import type {
  ChatMessage,
  AnthropicMessage,
  ChatDataStore,
  QuickInsight,
  CardAction,
} from "@/lib/brangus/types";
import { createClient } from "@/lib/supabase/client";
import { ChatBubble } from "@/components/app/chat/chat-bubble";
import { ChatInput } from "@/components/app/chat/chat-input";
import { TypingIndicator } from "@/components/app/chat/typing-indicator";
import { QuickInsightRow } from "@/components/app/chat/quick-insight-row";
import { BrangusChatPrintView } from "@/components/app/brangus/brangus-chat-print-view";

const SUGGESTED_PROMPTS = [
  "What's my portfolio worth today?",
  "Compare freight costs to Gracemere vs Roma",
  "When should I market my steers?",
  "How are cattle prices trending?",
  "What's coming up in my Yard Book?",
  "Give me a breakdown of all my herds",
];

// Brangus bubble - uses the -dark fill variant so filled areas don't read
// over-bright against text of the same hue (simultaneous-contrast effect).
const BRANGUS_BG = "var(--color-brangus-dark)";
// User bubble - semantic token (cool-toned stone grey)
const USER_BG = "var(--color-chat-user)";
// Profile images
const BRANGUS_AVATAR = "/images/brangus-chat-profile.webp";

// Brangus welcome greetings - first-time users get an intro, returning users get casual greetings
function buildWelcomeGreeting(pastConversations: number): string {
  const hour = new Date().getHours();
  const tod = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  // First-time user - introduce Brangus
  if (pastConversations === 0) {
    switch (tod) {
      case "morning":
        return "Good morning. I'm Brangus, your stock advisor. I've got your whole portfolio at my fingertips, so fire away. Ask me about your herds, freight, sale timing, or anything else and I'll do the heavy lifting.";
      case "afternoon":
        return "Good arvo. I'm Brangus, your stock advisor. I've got your whole portfolio at my fingertips, so fire away. Ask me about your herds, freight, sale timing, or anything else and I'll do the heavy lifting.";
      case "evening":
        return "G'evening. I'm Brangus, your stock advisor. I've got your whole portfolio at my fingertips, so fire away. Ask me about your herds, freight, sale timing, or anything else and I'll do the heavy lifting.";
    }
  }

  // Returning user - casual, varied greetings
  const pool: string[] = [];

  switch (tod) {
    case "morning":
      pool.push("Morning! Early start? What are we looking at today?");
      pool.push("G'day mate. Coffee in hand? Let's get into it.");
      break;
    case "afternoon":
      pool.push("Good arvo. How's the day shaping up? What can I help with?");
      pool.push("G'day. What are we working on this arvo?");
      break;
    case "evening":
      pool.push("Evening. Burning the midnight oil? What's on your mind?");
      pool.push("G'day. Quiet time to do some thinking? I'm all ears.");
      break;
  }

  pool.push("Oi oi. Ready when you are.");
  pool.push("Pull up a chair. What do you need a hand with?");
  pool.push("Back for another yarn? Let's get into it.");
  pool.push("G'day! How ya going? What can I do for ya today?");
  pool.push("What are we digging into today?");

  return pool[Math.floor(Math.random() * pool.length)];
}

// Saved message row from Supabase (subset of columns needed)
interface SavedMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  cards_json?: unknown[] | null;
}

interface BrangusChatProps {
  conversationId?: string;
  initialMessages?: SavedMessage[];
  /** Number of past conversations - 0 means first time user */
  pastConversationCount?: number;
  onConversationCreated?: (conv: BrangusConversationRow) => void;
  onConversationUpdated?: (id: string, updates: Partial<BrangusConversationRow>) => void;
  /** Portal container for the export toolbar (rendered outside the chat card) */
  toolbarContainer?: HTMLElement | null;
  /** Pre-filled first user message. Auto-sent once the portfolio store has loaded. */
  prefill?: string;
}

// Restore QuickInsight cards from saved cards_json
function hydrateCards(messages: SavedMessage[]): QuickInsight[] {
  const cards: QuickInsight[] = [];
  for (const m of messages) {
    if (m.cards_json && Array.isArray(m.cards_json)) {
      for (const c of m.cards_json) {
        const card = c as Record<string, unknown>;
        if (card.label && card.value && card.sentiment) {
          cards.push({
            id: (card.id as string) || crypto.randomUUID(),
            label: card.label as string,
            value: card.value as string,
            subtitle: (card.subtitle as string) || undefined,
            sentiment: card.sentiment as "positive" | "negative" | "neutral",
          });
        }
      }
    }
  }
  return cards;
}

export function BrangusChat({
  conversationId: existingConvId,
  initialMessages,
  pastConversationCount = 0,
  onConversationCreated,
  onConversationUpdated,
  toolbarContainer,
  prefill,
}: BrangusChatProps = {}) {
  // Hydrate UI messages from saved conversation (if resuming)
  const hydratedMessages: ChatMessage[] = (initialMessages ?? []).map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: new Date(m.created_at),
  }));
  // Reconstruct Anthropic history from saved messages (plain text is sufficient for context)
  const hydratedHistory: AnthropicMessage[] = (initialMessages ?? []).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Add welcome message for new conversations (not resumed)
  const welcomeMessage: ChatMessage[] =
    !existingConvId && hydratedMessages.length === 0
      ? [
          {
            id: "welcome",
            role: "assistant" as const,
            content: buildWelcomeGreeting(pastConversationCount),
            timestamp: new Date(),
          },
        ]
      : [];

  const [messages, setMessages] = useState<ChatMessage[]>([...welcomeMessage, ...hydratedMessages]);
  const [conversationHistory, setConversationHistory] =
    useState<AnthropicMessage[]>(hydratedHistory);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialising, setIsInitialising] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [store, setStore] = useState<ChatDataStore | null>(null);
  const [systemPrompt, setSystemPrompt] = useState("");
  // Accumulated summary cards for the persistent bottom strip - grows across the session
  // Hydrate from saved messages when loading a saved conversation
  const [sessionCards, setSessionCards] = useState<QuickInsight[]>(() =>
    hydrateCards(initialMessages ?? [])
  );
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareTriggerRef = useRef<HTMLButtonElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const [shareMenuPos, setShareMenuPos] = useState<{ top: number; right: number }>({
    top: 0,
    right: 0,
  });
  const [shareMenuMounted, setShareMenuMounted] = useState(false);
  useEffect(() => {
    setShareMenuMounted(true);
  }, []);

  // "Share with a producer" dialog state. Opens from the share menu and posts
  // a frozen snapshot of the current conversation into brangus_shared_chats.
  const [showShareToProducer, setShowShareToProducer] = useState(false);
  const [senderDisplayName, setSenderDisplayName] = useState<string | null>(null);
  useEffect(() => {
    // Fetch the signed-in user's display name for the shared-chat header on
    // the recipient side. user_profiles.display_name is the canonical source
    // (same field the Producer Directory shows), so sharer names match what
    // the recipient would see browsing the network. Falls back to auth
    // metadata, then to the email local-part, so a name always renders.
    (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("display_name, company_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const meta = user.user_metadata ?? {};
      const name =
        (profile?.display_name?.trim() || null) ??
        (typeof meta.display_name === "string" ? meta.display_name.trim() || null : null) ??
        (typeof meta.full_name === "string" ? meta.full_name.trim() || null : null) ??
        (profile?.company_name?.trim() || null) ??
        (user.email ? user.email.split("@")[0] : null);

      setSenderDisplayName(name);
    })();
  }, []);
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userInitials, setUserInitials] = useState("SW");
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | undefined>(undefined);
  const postTypingIdRef = useRef<string | null>(null);
  const conversationIdRef = useRef<string | null>(existingConvId ?? null);
  const userIdRef = useRef<string | null>(null);
  const hasRequestedTitleRef = useRef(!!existingConvId);
  const prefillSentRef = useRef(false);

  // Voice input via Web Speech API (en-AU, livestock term corrections)
  const {
    isListening,
    transcript,
    finalTranscript,
    startListening,
    stopListening,
    isSupported: micSupported,
  } = useSpeechRecognition();

  const handleMicTap = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Auto-send when speech recognition produces a final transcript
  const handleSendRef = useRef<((text: string) => void | Promise<void>) | null>(null);

  // Get user initials and avatar from auth metadata
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata;
      if (meta) {
        const first = (
          meta.first_name ||
          meta.given_name ||
          meta.full_name?.split(" ")[0] ||
          ""
        ).charAt(0);
        const last = (
          meta.last_name ||
          meta.family_name ||
          meta.full_name?.split(" ").pop() ||
          ""
        ).charAt(0);
        if (first || last) setUserInitials((first + last).toUpperCase());

        // Use custom avatar, Google avatar, or fall back to initials
        const avatarUrl = meta.avatar_url || meta.google_avatar_url || meta.picture;
        if (avatarUrl) setUserAvatarUrl(avatarUrl);
      }

      // Also check user_profiles for a custom avatar
      if (data.user?.id) {
        supabase
          .from("user_profiles")
          .select("avatar_url")
          .eq("id", data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile?.avatar_url) setUserAvatarUrl(profile.avatar_url);
          });
      }
    });
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Card action handler - navigates to the relevant section of the app
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

  // Load portfolio data on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) userIdRef.current = user.id;

        // Debug: Fetch all config from server (mirrors iOS ServerConfig pattern)
        const [dataStore, serverConfig, userMemories] = await Promise.all([
          loadChatDataStore(),
          fetchServerConfig(),
          fetchUserMemories(),
        ]);
        if (cancelled) return;
        const prompt = buildSystemPrompt(dataStore, serverConfig, userMemories);
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
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist yard book mutations after each response
  const persistMutations = useCallback(async (dataStore: ChatDataStore) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
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

    // Record sales logged through Brangus chat
    for (const sale of dataStore.pendingSaleRecords) {
      const now = new Date().toISOString();
      await supabase.from("sales_records").insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        herd_id: sale.herd_id,
        sale_date: new Date(sale.sale_date).toISOString(),
        head_count: sale.head_count,
        average_weight: sale.average_weight_kg,
        price_per_kg: sale.price_per_kg,
        price_per_head: sale.price_per_head ?? null,
        pricing_type: sale.pricing_type,
        sale_type: sale.sale_type ?? null,
        sale_location: sale.sale_location ?? null,
        total_gross_value: sale.total_gross_value,
        freight_cost: 0,
        freight_distance: 0,
        net_value: sale.total_gross_value,
        notes: sale.notes ?? null,
        is_deleted: false,
        is_demo_data: false,
        created_at: now,
        updated_at: now,
      });
      // Update herd: mark sold (full sale) or reduce head count (partial sale)
      if (sale.is_full_sale) {
        await supabase
          .from("herds")
          .update({
            is_sold: true,
            sold_date: new Date(sale.sale_date).toISOString(),
            sold_price: sale.price_per_kg,
            updated_at: now,
          })
          .eq("id", sale.herd_id);
      } else {
        await supabase
          .from("herds")
          .update({ head_count: sale.remaining_head_count, updated_at: now })
          .eq("id", sale.herd_id);
      }
    }
    dataStore.pendingSaleRecords = [];

    // Record health treatments logged through Brangus chat
    for (const treatment of dataStore.pendingTreatmentRecords) {
      const now = new Date().toISOString();
      await supabase.from("health_records").insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        herd_id: treatment.herd_id,
        date: new Date(treatment.date).toISOString(),
        treatment_type_raw: treatment.treatment_type_raw,
        notes: treatment.notes ?? null,
        is_deleted: false,
        is_demo_data: false,
        created_at: now,
        updated_at: now,
      });
    }
    dataStore.pendingTreatmentRecords = [];

    // Record muster events logged through Brangus chat
    for (const muster of dataStore.pendingMusterRecords) {
      const now = new Date().toISOString();
      await supabase.from("muster_records").insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        herd_id: muster.herd_id,
        date: new Date(muster.date).toISOString(),
        total_head_count: muster.total_head_count,
        cattle_yard: muster.cattle_yard ?? null,
        notes: muster.notes ?? null,
        is_deleted: false,
        is_demo_data: false,
        created_at: now,
        updated_at: now,
      });
    }
    dataStore.pendingMusterRecords = [];
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      if (!text || isLoading || !store) return;

      setError(null);
      const userId = userIdRef.current;

      // Create conversation on first send
      if (!conversationIdRef.current && userId) {
        try {
          const conv = await createConversation(userId);
          conversationIdRef.current = conv.id;
          onConversationCreated?.(conv);
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
          setSessionCards((prev) => [...quickInsights, ...prev]);
        }
        setConversationHistory(updatedHistory);

        // Persist assistant message (non-blocking) - include summary cards if present
        const cardsToSave = quickInsights && quickInsights.length > 0 ? quickInsights : null;
        if (convId && userId) {
          saveMessage(convId, userId, "assistant", assistantText, cardsToSave)
            .then(() => {
              const preview =
                assistantText.length > 100 ? assistantText.slice(0, 97) + "..." : assistantText;
              onConversationUpdated?.(convId, {
                preview_text: preview,
                updated_at: new Date().toISOString(),
              });
            })
            .catch((err) => console.error("Failed to persist assistant message:", err));
        }

        // Auto-title after first exchange
        if (convId && !hasRequestedTitleRef.current) {
          hasRequestedTitleRef.current = true;
          autoTitleConversation(convId, text, assistantText)
            .then((title) => {
              if (title && convId) {
                onConversationUpdated?.(convId, { title });
              }
            })
            .catch((err) => console.error("Auto-title failed:", err));
        }

        // Persist any yard book mutations
        await persistMutations(store);
      } catch (err) {
        console.error("Brangus error:", err);
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [
      isLoading,
      store,
      conversationHistory,
      systemPrompt,
      persistMutations,
      onConversationCreated,
      onConversationUpdated,
    ]
  );

  // Keep handleSendRef current so the speech effect can call it without stale closure
  handleSendRef.current = handleSend;

  // Auto-send prefill once the portfolio store has loaded.
  // Only fires for new conversations (no existing id, no hydrated messages) and only once.
  useEffect(() => {
    if (prefillSentRef.current) return;
    if (!prefill || !store || isInitialising) return;
    if (existingConvId) return;
    if ((initialMessages?.length ?? 0) > 0) return;
    prefillSentRef.current = true;
    handleSend(prefill);
  }, [prefill, store, isInitialising, existingConvId, initialMessages, handleSend]);

  // Auto-send when speech recognition commits a final transcript
  useEffect(() => {
    if (finalTranscript && handleSendRef.current) {
      handleSendRef.current(finalTranscript);
    }
  }, [finalTranscript]);

  const handleCopy = useCallback(() => {
    const exportMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
      created_at: m.timestamp.toISOString(),
    }));
    const text = formatConversationForExport(null, new Date().toISOString(), exportMessages);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [messages]);

  const handleDownload = useCallback(() => {
    const exportMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
      created_at: m.timestamp.toISOString(),
    }));
    const text = formatConversationForExport(null, new Date().toISOString(), exportMessages);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brangus-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const getShareText = useCallback(() => {
    const exportMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    return formatConversationForExport(null, new Date().toISOString(), exportMessages);
  }, [messages]);

  const handleShareNative = useCallback(async () => {
    const text = getShareText();
    if (navigator.share) {
      try {
        await navigator.share({ title: "Brangus Chat", text });
      } catch {
        // User cancelled - fine, nothing to do.
      }
    }
    setShowShareMenu(false);
  }, [getShareText]);

  // Position the portalled share menu under the trigger, anchored right so
  // it never runs off screen at the edge of a chat panel. Re-runs on resize
  // and scroll (capture phase, so nested scroll containers also trigger it)
  // to keep the menu glued to the trigger while open.
  useLayoutEffect(() => {
    if (!showShareMenu) return;
    const updatePos = () => {
      const rect = shareTriggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setShareMenuPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    };
    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [showShareMenu]);

  // Close the share menu on click-outside / Escape.
  useEffect(() => {
    if (!showShareMenu) return;
    function onPointer(e: PointerEvent) {
      const target = e.target as Node;
      if (shareMenuRef.current?.contains(target)) return;
      if (shareTriggerRef.current?.contains(target)) return;
      setShowShareMenu(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowShareMenu(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [showShareMenu]);

  const handleShareEmail = useCallback(() => {
    const text = getShareText();
    const subject = encodeURIComponent("Brangus Chat");
    const body = encodeURIComponent(text);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
    setShowShareMenu(false);
  }, [getShareText]);

  const handleShareWhatsApp = useCallback(() => {
    const text = getShareText();
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
    setShowShareMenu(false);
  }, [getShareText]);

  // Loading state
  if (isInitialising) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <Loader2 className="text-brangus h-8 w-8 animate-spin" />
        <p className="text-text-muted text-sm">Loading your portfolio data...</p>
      </div>
    );
  }

  return (
    <div data-print-chat className="flex flex-1 flex-col overflow-hidden">
      <BrangusChatPrintView
        messages={messages.map((m) => ({ id: m.id, role: m.role, content: m.content }))}
        userLabel={userInitials && userInitials !== "SW" ? userInitials : "You"}
      />

      {/* Share menu - one unified button. Disabled until there are 2+ messages
          so there's something worth sharing. Matches the styling of the
          "Download Reports" button on the reports pages. The dropdown is
          portalled to document.body + fixed-positioned so it escapes any
          overflow-clipping parent (eg. the hub's toolbar container). */}
      {(() => {
        const canExport = messages.length >= 2;
        const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;
        const menuItemClass =
          "flex w-full items-center gap-2.5 px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-text-primary";
        const toolbar = (
          <div data-print-hide className="flex items-center">
            <button
              ref={shareTriggerRef}
              onClick={canExport ? () => setShowShareMenu((o) => !o) : undefined}
              disabled={!canExport}
              aria-haspopup="menu"
              aria-expanded={showShareMenu}
              aria-label="Share conversation"
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors ${
                canExport
                  ? "bg-brangus/15 text-brangus hover:bg-brangus/25"
                  : "bg-brangus/10 text-brangus/40 cursor-not-allowed"
              }`}
            >
              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Share</span>
              <ChevronDown
                className={`h-3 w-3 transition-transform ${showShareMenu ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
          </div>
        );
        const menu =
          showShareMenu && shareMenuMounted ? (
            <div
              ref={shareMenuRef}
              role="menu"
              aria-label="Share conversation"
              className="fixed z-[60] w-52 overflow-hidden rounded-xl border border-white/[0.08] py-1 shadow-2xl"
              style={{
                top: shareMenuPos.top,
                right: shareMenuPos.right,
                backgroundColor: "rgba(26, 26, 26, 0.55)",
                backdropFilter: "blur(28px) saturate(1.6)",
                WebkitBackdropFilter: "blur(28px) saturate(1.6)",
              }}
            >
              <button
                role="menuitem"
                onClick={() => {
                  handleCopy();
                  setShowShareMenu(false);
                }}
                className={menuItemClass}
              >
                {copied ? (
                  <Check className="text-success h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ClipboardCopy className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>{copied ? "Copied" : "Copy text"}</span>
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setShowShareToProducer(true);
                  setShowShareMenu(false);
                }}
                className={menuItemClass}
              >
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Share with a producer</span>
              </button>
              <div className="my-1 border-t border-white/[0.06]" />
              <button
                role="menuitem"
                onClick={() => {
                  handleDownload();
                  setShowShareMenu(false);
                }}
                className={menuItemClass}
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Save as .txt</span>
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  handlePrint();
                  setShowShareMenu(false);
                }}
                className={menuItemClass}
              >
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Save as PDF</span>
              </button>
              <div className="my-1 border-t border-white/[0.06]" />
              {canNativeShare && (
                <button role="menuitem" onClick={handleShareNative} className={menuItemClass}>
                  <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Share via device</span>
                </button>
              )}
              <button role="menuitem" onClick={handleShareEmail} className={menuItemClass}>
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Email</span>
              </button>
              <button role="menuitem" onClick={handleShareWhatsApp} className={menuItemClass}>
                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>WhatsApp</span>
              </button>
            </div>
          ) : null;
        return (
          <>
            {toolbarContainer ? (
              createPortal(toolbar, toolbarContainer)
            ) : (
              <div className="flex justify-end border-b border-white/6 px-4 py-1.5">{toolbar}</div>
            )}
            {menu && createPortal(menu, document.body)}
          </>
        );
      })()}

      {/* Share with a producer - frozen snapshot posted into brangus_shared_chats.
          Recipient sees it in their Brangus Shared tab rendered as chat bubbles. */}
      <ShareToProducerDialog
        open={showShareToProducer}
        onClose={() => setShowShareToProducer(false)}
        conversationId={conversationIdRef.current}
        conversationTitle={null}
        messages={messages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }))}
        senderDisplayName={senderDisplayName}
      />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
        {messages.length === 0 && !isLoading ? (
          <EmptyState onPromptClick={(prompt) => handleSend(prompt)} />
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              const isPostTyping = msg.id === postTypingIdRef.current;
              return (
                <ChatBubble
                  key={msg.id}
                  side={isUser ? "right" : "left"}
                  bgClass={isUser ? "bg-chat-user" : "bg-brangus-dark"}
                  tailColor={isUser ? USER_BG : BRANGUS_BG}
                  textClass={isUser ? "text-white" : "text-white"}
                  avatarUrl={isUser ? userAvatarUrl : BRANGUS_AVATAR}
                  avatarInitials={isUser ? userInitials : undefined}
                  animate
                  animationType={isPostTyping ? "fade" : "bounce"}
                >
                  {isUser ? msg.content : <FormattedResponse text={msg.content} />}
                </ChatBubble>
              );
            })}
            {isLoading && <TypingIndicator bgColor={BRANGUS_BG} dotClass="bg-brangus/60" />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-error/10 text-error mx-4 mb-2 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Summary card strip - persistent bottom strip, full width for edge-to-edge scrolling */}
      {sessionCards.length > 0 && (
        <div data-print-cards className="border-t border-white/10 py-2">
          <QuickInsightRow insights={sessionCards} onCardAction={handleCardAction} />
        </div>
      )}

      {/* Input area */}
      <div data-print-hide className="border-t border-white/10 p-4">
        <div>
          <ChatInput
            onSend={handleSend}
            placeholder="Ask Brangus anything..."
            disabled={!store}
            loading={isLoading}
            accentClass="bg-brangus-dark hover:bg-brangus-text"
            isListening={isListening}
            onMicTap={handleMicTap}
            micSupported={micSupported}
            liveTranscript={transcript}
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
      <div className="bg-brangus/10 flex h-14 w-14 items-center justify-center rounded-full">
        <Brain className="text-brangus h-7 w-7" />
      </div>
      <div>
        <p className="text-text-primary font-semibold">G&apos;day, I&apos;m Brangus</p>
        <p className="text-text-muted mt-1 max-w-sm text-sm leading-relaxed">
          Ask me anything about your herds, freight costs, market conditions, or livestock
          management.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPromptClick(prompt)}
            className="text-text-secondary hover:text-text-primary rounded-xl bg-white/5 px-3.5 py-1.5 text-xs transition-all hover:bg-white/8"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

// MARK: - Formatted Response (renders markdown-like formatting)

// Detect "Heading - body text" pattern (e.g. "Brahman Steers - 42 head, sitting at 350kg...")
// Handles both plain labels and **bold** markdown labels from Brangus
// Label: starts with uppercase, max ~40 chars, no periods. Body: the rest after " - "
const HEADING_RE = /^\*{0,2}([A-Za-z][A-Za-z0-9 '&/,.]{0,38}?)\*{0,2} - (.+)$/;

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
                    <span className="whitespace-pre-wrap">
                      {formatInlineText(trimmed.slice(2))}
                    </span>
                  </div>
                );
              }

              // Heading - Body pattern (e.g. "Brahman Steers - 42 head, valued at...")
              const headingMatch = trimmed.match(HEADING_RE);
              if (headingMatch) {
                return (
                  <div key={j} className={j > 0 ? "mt-2" : ""}>
                    <p className="text-[15px] font-bold text-white">{headingMatch[1]}</p>
                    <p className="mt-0.5 whitespace-pre-wrap">
                      {formatInlineText(headingMatch[2])}
                    </p>
                  </div>
                );
              }

              // Section header ending with colon (e.g. "A few things jumping out:")
              if (/^[A-Z].{5,50}:$/.test(trimmed)) {
                return (
                  <p key={j} className={`text-[15px] font-bold text-white ${j > 0 ? "mt-2" : ""}`}>
                    {trimmed.slice(0, -1)}
                  </p>
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
