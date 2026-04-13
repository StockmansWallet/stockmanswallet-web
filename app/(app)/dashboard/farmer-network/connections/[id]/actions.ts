"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createNotification, notifyDenial } from "@/lib/advisory/notifications";
import type { AdvisoryMessage, MessageType } from "@/lib/types/advisory";

const connectionIdSchema = z.object({
  connectionId: z.string().uuid(),
});

const sendMessageSchema = z.object({
  connectionId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  messageType: z.enum(["general_note", "valuation_report", "market_update", "action_required"]),
});

export async function fetchFarmerMessages(connectionId: string) {
  const parsed = connectionIdSchema.safeParse({ connectionId });
  if (!parsed.success) return { error: "Invalid input", messages: [] };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated", messages: [] };

  const { data: connection } = await supabase
    .from("connection_requests")
    .select("id, requester_user_id, target_user_id")
    .eq("id", connectionId)
    .eq("connection_type", "farmer_peer")
    .eq("status", "approved")
    .single();

  if (!connection) return { error: "Connection not found", messages: [] };

  const isParty =
    connection.requester_user_id === user.id ||
    connection.target_user_id === user.id;
  if (!isParty) return { error: "Connection not found", messages: [] };

  const { data: messages } = await supabase
    .from("advisory_messages")
    .select("*")
    .eq("connection_id", connectionId)
    .order("created_at", { ascending: true });

  return { messages: (messages ?? []) as AdvisoryMessage[] };
}

export async function sendFarmerMessage(
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

  // Verify user is a party on this farmer_peer connection
  const { data: connection } = await supabase
    .from("connection_requests")
    .select("id, requester_user_id, target_user_id")
    .eq("id", connectionId)
    .eq("connection_type", "farmer_peer")
    .eq("status", "approved")
    .single();

  if (!connection) return { error: "Connection not found" };

  const isRequester = connection.requester_user_id === user.id;
  const isTarget = connection.target_user_id === user.id;
  if (!isRequester && !isTarget) return { error: "Connection not found" };

  const { error } = await supabase.from("advisory_messages").insert({
    connection_id: connectionId,
    sender_user_id: user.id,
    message_type: "general_note",
    content,
  });

  if (error) return { error: error.message };

  // Notify the other party
  const recipientId = isRequester
    ? connection.target_user_id
    : connection.requester_user_id;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();
  const senderName = profile?.display_name ?? "A farmer";

  await createNotification(supabase, {
    userId: recipientId,
    type: "new_message",
    title: `New message from ${senderName}`,
    link: `/dashboard/farmer-network/connections/${connectionId}`,
    connectionId,
  });

  revalidatePath(`/dashboard/farmer-network/connections/${connectionId}`);
  return { success: true };
}

export async function disconnectFarmer(connectionId: string) {
  const parsed = connectionIdSchema.safeParse({ connectionId });
  if (!parsed.success) return { error: "Invalid input" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: connection } = await supabase
    .from("connection_requests")
    .select("id, requester_user_id, target_user_id")
    .eq("id", connectionId)
    .eq("connection_type", "farmer_peer")
    .single();

  if (!connection) return { error: "Connection not found" };

  const isRequester = connection.requester_user_id === user.id;
  const isTarget = connection.target_user_id === user.id;
  if (!isRequester && !isTarget) return { error: "Connection not found" };

  const { error } = await supabase
    .from("connection_requests")
    .update({ status: "expired" })
    .eq("id", connectionId);

  if (error) return { error: error.message };

  // Notify the other party
  const recipientId = isRequester
    ? connection.target_user_id
    : connection.requester_user_id;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();
  const name = profile?.display_name ?? "A farmer";

  await notifyDenial(supabase, recipientId, name, connectionId, "producer");

  revalidatePath("/dashboard/farmer-network");
  return { success: true };
}
