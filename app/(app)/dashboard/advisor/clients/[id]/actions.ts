"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notifyNewMessage } from "@/lib/advisory/notifications";
import type { MessageType } from "@/lib/types/advisory";

const sendMessageSchema = z.object({
  connectionId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  messageType: z.enum(["general_note", "valuation_report", "market_update", "action_required"]),
});

export async function sendAdvisorMessage(
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

  // Verify the user is the advisor (requester) on this connection
  const { data: connection } = await supabase
    .from("connection_requests")
    .select("id, requester_user_id, target_user_id")
    .eq("id", connectionId)
    .single();

  if (!connection || connection.requester_user_id !== user.id) {
    return { error: "Connection not found" };
  }

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

  const senderName = profile?.display_name ?? "An advisor";

  await notifyNewMessage(
    supabase,
    connection.target_user_id,
    senderName,
    connectionId,
    true
  );

  revalidatePath(`/dashboard/advisor/clients/${connectionId}`);
  revalidatePath(`/dashboard/advisory-hub/my-advisors/${connectionId}`);

  return { success: true };
}
