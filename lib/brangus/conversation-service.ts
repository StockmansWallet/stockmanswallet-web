// Brangus conversation persistence - client-side functions
// Handles CRUD, auto-titling, and export formatting for chat history

import { createClient } from "../supabase/client";
import { sanitiseResponse } from "./chat-service";
import type { Tables } from "../types/database";

export type BrangusConversationRow = Tables<"brangus_conversations">;
export type BrangusMessageRow = Tables<"brangus_messages">;

// MARK: - Client-side CRUD (browser components)

export async function createConversation(userId: string): Promise<BrangusConversationRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("brangus_conversations")
    .insert({ user_id: userId })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create conversation: ${error?.message}`);
  }
  return data;
}

export async function saveMessage(
  conversationId: string,
  userId: string,
  role: "user" | "assistant",
  content: string,
  cardsJson?: unknown[] | null,
  attachmentIds: string[] = []
): Promise<string | null> {
  const supabase = createClient();

  // Insert message (include cards_json for assistant messages with summary cards)
  const row: Record<string, unknown> = {
    conversation_id: conversationId,
    user_id: userId,
    role,
    content,
  };
  if (cardsJson && cardsJson.length > 0) {
    row.cards_json = cardsJson;
  }
  const { data: message, error: msgError } = await supabase
    .from("brangus_messages")
    .insert(row)
    .select("id")
    .single();

  if (msgError) {
    console.error("Failed to save message:", msgError.message);
    return null;
  }

  if (message?.id && attachmentIds.length > 0) {
    const rows = attachmentIds.map((fileId) => ({
      message_id: message.id,
      file_id: fileId,
      user_id: userId,
    }));
    const { error: attachmentError } = await supabase
      .from("brangus_message_attachments")
      .upsert(rows, { onConflict: "message_id,file_id" });

    if (attachmentError) {
      console.error("Failed to save message attachments:", attachmentError.message);
    }
  }

  // Update conversation timestamp + preview (assistant messages only)
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (role === "assistant") {
    update.preview_text = content.length > 100 ? content.slice(0, 97) + "..." : content;
  }

  const { error: convError } = await supabase
    .from("brangus_conversations")
    .update(update)
    .eq("id", conversationId);

  if (convError) {
    console.error("Failed to update conversation:", convError.message);
  }

  return message?.id ?? null;
}

export async function autoTitleConversation(
  conversationId: string,
  userText: string,
  assistantText: string
): Promise<string | null> {
  const supabase = createClient();

  // Debug: getUser() forces token refresh; getSession() alone can return stale tokens
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Lightweight single-shot call matching iOS generateTitle() pattern
  const body = {
    model: "claude-sonnet-4-6",
    max_tokens: 20,
    system:
      "Generate a 3-5 word title for this Australian livestock conversation. No quotes, no punctuation, no full stop. Title only.",
    messages: [
      { role: "user", content: userText },
      { role: "assistant", content: assistantText },
      { role: "user", content: "Title this conversation in 3-5 words." },
    ],
  };

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/brangus-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) return null;

    const json = await res.json();
    const text = json?.content?.[0]?.text;
    if (!text) return null;

    const title = sanitiseResponse(text.trim());

    await supabase.from("brangus_conversations").update({ title }).eq("id", conversationId);

    return title;
  } catch (err) {
    console.error("Auto-title failed:", err);
    return null;
  }
}

export async function softDeleteConversation(conversationId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("brangus_conversations")
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq("id", conversationId);

  if (error) {
    throw new Error(`Failed to delete conversation: ${error.message}`);
  }
}

export async function bulkSoftDeleteConversations(conversationIds: string[]): Promise<void> {
  if (conversationIds.length === 0) return;
  const supabase = createClient();
  const { error } = await supabase
    .from("brangus_conversations")
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .in("id", conversationIds);

  if (error) {
    throw new Error(`Failed to delete conversations: ${error.message}`);
  }
}

// MARK: - Client-side message fetching (for embedded chat panel)

export async function fetchMessages(conversationId: string): Promise<BrangusMessageRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("brangus_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch messages:", error.message);
    return [];
  }
  return data ?? [];
}

// MARK: - Export formatting (matches iOS share format)

export function formatConversationForExport(
  title: string | null,
  createdAt: string,
  messages: Pick<BrangusMessageRow, "role" | "content">[]
): string {
  const date = new Date(createdAt).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const lines: string[] = [`Brangus - ${title ?? "Conversation"}`, date, ""];

  for (const msg of messages) {
    const label = msg.role === "user" ? "You:" : "Brangus:";
    lines.push(label);
    lines.push(msg.content);
    lines.push("");
  }

  lines.push("Shared from Stockman's Wallet - stockmanswallet.com.au");

  return lines.join("\n");
}
