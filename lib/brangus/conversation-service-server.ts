// Brangus conversation persistence - server-side functions
// Uses next/headers via server Supabase client, must only be imported from Server Components

import { createClient } from "../supabase/server";
import type { Tables } from "../types/database";

export type BrangusConversationRow = Tables<"brangus_conversations">;
export type BrangusMessageRow = Tables<"brangus_messages">;

export async function fetchConversationsServer(): Promise<BrangusConversationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brangus_conversations")
    .select("*")
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch conversations:", error.message);
    return [];
  }
  return data ?? [];
}

export async function fetchMessagesServer(
  conversationId: string
): Promise<BrangusMessageRow[]> {
  const supabase = await createClient();
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
