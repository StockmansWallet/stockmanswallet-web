// Client-side operations for the brangus_shared_chats table
// Mirrors iOS SharedBrangusChatService. Sender inserts a frozen snapshot of a
// conversation; recipient reads via Supabase RLS; both can flip their own
// deleted flag. is_read is recipient-only per policy in the migration.

import { createClient } from "../supabase/client";

// Debug: Minimal shape shareConversation() pulls off each message. Both the
// live chat (ChatMessage with Date) and the saved-conversation review
// (BrangusMessageRow with created_at) satisfy this contract once normalised.
interface ShareMessageInput {
  role: "user" | "assistant" | string;
  content: string;
  created_at: string; // ISO 8601
}

export interface SharedChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO 8601
}

export interface SharedChatRow {
  id: string;
  sender_user_id: string;
  recipient_user_id: string;
  original_conversation_id: string | null;
  title: string | null;
  sender_display_name: string | null;
  messages: SharedChatMessage[];
  note: string | null;
  is_read: boolean;
  is_deleted_by_sender: boolean;
  is_deleted_by_recipient: boolean;
  created_at: string;
}

// MARK: - Fetch inbox (received shared chats)
// Returns rows where the current user is the recipient and hasn't soft-deleted.
// RLS does the heavy lifting; the filters are just for empty-state efficiency.
export async function fetchInboxSharedChats(): Promise<SharedChatRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("brangus_shared_chats")
    .select("*")
    .eq("is_deleted_by_recipient", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchInboxSharedChats error:", error.message);
    return [];
  }

  // Server-side RLS already limits this to rows where recipient_user_id = auth.uid(),
  // but we re-check client-side in case a sender ever previews their own row (they
  // pass the select RLS too).
  const { data: userData } = await supabase.auth.getUser();
  const currentUserId = userData.user?.id;
  if (!currentUserId) return [];

  const rows = (data ?? []).filter(
    (row) => row.recipient_user_id === currentUserId,
  ) as SharedChatRow[];

  // Backfill any missing sender names from user_profiles. Covers shares that
  // were created before sender_display_name was reliably populated, and keeps
  // names current if a sender updates their profile. A single batched query
  // fetches all missing names at once.
  const missingIds = [
    ...new Set(
      rows
        .filter((r) => !r.sender_display_name?.trim())
        .map((r) => r.sender_user_id),
    ),
  ];

  if (missingIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, display_name")
      .in("user_id", missingIds);

    if (profiles && profiles.length > 0) {
      const nameMap = new Map(profiles.map((p) => [p.user_id, p.display_name as string]));
      return rows.map((r) =>
        !r.sender_display_name?.trim() && nameMap.has(r.sender_user_id)
          ? { ...r, sender_display_name: nameMap.get(r.sender_user_id) ?? null }
          : r,
      );
    }
  }

  return rows;
}

// MARK: - Send share (sender)
// Builds a frozen snapshot from the caller's messages and inserts a row.
// Throws on failure so the caller can surface a toast.
export async function shareConversation(params: {
  recipientUserId: string;
  originalConversationId?: string | null;
  title?: string | null;
  senderDisplayName?: string | null;
  messages: ShareMessageInput[];
  note?: string | null;
}): Promise<string> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const senderId = userData.user?.id;
  if (!senderId) throw new Error("You need to be signed in to share chats.");
  if (senderId === params.recipientUserId) {
    throw new Error("You can't share a chat with yourself.");
  }
  if (params.messages.length === 0) {
    throw new Error("This chat doesn't have any messages to share yet.");
  }

  // Snapshot only the fields the recipient needs. Avoids leaking internal
  // conversation metadata (ids, is_deleted, etc.).
  const snapshot: SharedChatMessage[] = params.messages.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
    timestamp: m.created_at,
  }));

  const { data, error } = await supabase
    .from("brangus_shared_chats")
    .insert({
      sender_user_id: senderId,
      recipient_user_id: params.recipientUserId,
      original_conversation_id: params.originalConversationId ?? null,
      title: params.title ?? null,
      sender_display_name: params.senderDisplayName ?? null,
      messages: snapshot,
      note: (params.note ?? "").trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("shareConversation error:", error.message);
    throw new Error("Couldn't send the share. Please try again.");
  }
  return data!.id as string;
}

// MARK: - Mark read (recipient)
export async function markSharedChatRead(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("brangus_shared_chats")
    .update({ is_read: true })
    .eq("id", id);
  if (error) {
    console.error("markSharedChatRead error:", error.message);
  }
}

// MARK: - Soft delete (either side)
// Flips the correct flag based on whether the current user is sender or recipient.
export async function softDeleteSharedChat(id: string): Promise<void> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return;

  // Peek at the row to decide which flag to flip. RLS means the caller will only
  // ever get rows they have access to anyway.
  const { data: row, error: fetchErr } = await supabase
    .from("brangus_shared_chats")
    .select("sender_user_id, recipient_user_id")
    .eq("id", id)
    .single();
  if (fetchErr || !row) {
    console.error("softDeleteSharedChat fetch error:", fetchErr?.message);
    return;
  }

  const patch =
    row.sender_user_id === uid
      ? { is_deleted_by_sender: true }
      : row.recipient_user_id === uid
        ? { is_deleted_by_recipient: true }
        : null;
  if (!patch) return;

  const { error } = await supabase
    .from("brangus_shared_chats")
    .update(patch)
    .eq("id", id);
  if (error) {
    console.error("softDeleteSharedChat error:", error.message);
  }
}

// MARK: - Fetch one (detail view)
export async function fetchSharedChat(id: string): Promise<SharedChatRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("brangus_shared_chats")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("fetchSharedChat error:", error.message);
    return null;
  }
  return (data as SharedChatRow | null) ?? null;
}

// MARK: - Fetch discoverable producers for the picker
// Reuses the same filter the Producer Network directory uses so visibility is
// consistent. Excludes the current user.
export interface SharePickerProducer {
  user_id: string;
  display_name: string;
  property_name: string | null;
  state: string | null;
  region: string | null;
}

export async function fetchShareablePicks(): Promise<SharePickerProducer[]> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];

  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, property_name, state, region")
    .eq("role", "producer")
    .neq("user_id", uid)
    .order("display_name");
  if (error) {
    console.error("fetchShareablePicks error:", error.message);
    return [];
  }
  return (data ?? []) as SharePickerProducer[];
}
