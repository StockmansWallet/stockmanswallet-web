"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notifyNewMessage } from "@/lib/advisory/notifications";
import { parseSharingPermissions, type AdvisoryMessage, type MessageType, type SharingCategory } from "@/lib/types/advisory";

const sendMessageSchema = z.object({
  connectionId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  messageType: z.enum(["general_note", "access_request", "renewal_request", "review_request"]),
});

export async function sendMessage(
  connectionId: string,
  content: string,
  messageType: MessageType
) {
  const parsed = sendMessageSchema.safeParse({ connectionId, content, messageType });
  if (!parsed.success) return { error: "Invalid input" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify the user is involved in this connection (either direction)
  const { data: connection } = await supabase
    .from("connection_requests")
    .select("id, requester_user_id, target_user_id")
    .eq("id", connectionId)
    .single();

  if (!connection) return { error: "Connection not found" };
  const isRequester = connection.requester_user_id === user.id;
  const isTarget = connection.target_user_id === user.id;
  if (!isRequester && !isTarget) return { error: "Connection not found" };

  const recipientId = isRequester ? connection.target_user_id : connection.requester_user_id;

  const { error } = await supabase.from("advisory_messages").insert({
    connection_id: connectionId,
    sender_user_id: user.id,
    message_type: messageType,
    content,
  });

  if (error) return { error: error.message };

  // Get sender display name for notification
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();

  const senderName = profile?.display_name ?? "A producer";

  await notifyNewMessage(
    supabase,
    recipientId,
    senderName,
    connectionId,
    false
  );

  revalidatePath(`/dashboard/advisory-hub/my-advisors/${connectionId}`);
  revalidatePath(`/dashboard/advisor/clients/${connectionId}`);

  return { success: true };
}

const updatePermissionSchema = z.object({
  connectionId: z.string().uuid(),
  category: z.enum(["herds", "properties", "reports", "valuations"]),
  enabled: z.boolean(),
});

export async function updateSharingPermission(
  connectionId: string,
  category: SharingCategory,
  enabled: boolean
) {
  const parsed = updatePermissionSchema.safeParse({ connectionId, category, enabled });
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: connection } = await supabase
    .from("connection_requests")
    .select("id, target_user_id, permission_granted_at, sharing_permissions")
    .eq("id", connectionId)
    .single();

  if (!connection || connection.target_user_id !== user.id) {
    return { error: "Connection not found" };
  }

  if (!connection.permission_granted_at) {
    return { error: "Data access not currently granted" };
  }

  const current = parseSharingPermissions(connection.sharing_permissions);
  const updated = { ...current, [category]: enabled };

  const { error } = await supabase
    .from("connection_requests")
    .update({
      sharing_permissions: updated,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connectionId);
    /* RLS enforces ownership */

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/advisory-hub/my-advisors/${connectionId}`);
  revalidatePath(`/dashboard/advisor/clients/${connectionId}`);

  return { success: true };
}

// Fetch all messages for a connection (used by polling in ConnectionChatClient)
export async function fetchConnectionMessages(connectionId: string): Promise<{ messages?: AdvisoryMessage[]; error?: string }> {
  const parsed = z.string().uuid().safeParse(connectionId);
  if (!parsed.success) return { error: "Invalid connection ID" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: messages, error } = await supabase
    .from("advisory_messages")
    .select("*")
    .eq("connection_id", connectionId)
    .order("created_at", { ascending: true });

  if (error) return { error: error.message };
  return { messages: (messages ?? []) as AdvisoryMessage[] };
}
