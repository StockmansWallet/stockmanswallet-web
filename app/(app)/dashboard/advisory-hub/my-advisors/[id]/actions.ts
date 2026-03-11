"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notifyNewMessage } from "@/lib/advisory/notifications";
import type { MessageType } from "@/lib/types/advisory";

export async function sendMessage(
  connectionId: string,
  content: string,
  messageType: MessageType
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify the user is the producer (target) on this connection
  const { data: connection } = await supabase
    .from("connection_requests")
    .select("id, requester_user_id, target_user_id, requester_name")
    .eq("id", connectionId)
    .single();

  if (!connection || connection.target_user_id !== user.id) {
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

  const senderName = profile?.display_name ?? "A producer";

  await notifyNewMessage(
    supabase,
    connection.requester_user_id,
    senderName,
    connectionId,
    false
  );

  revalidatePath(`/dashboard/advisory-hub/my-advisors/${connectionId}`);
  revalidatePath(`/dashboard/advisor/clients/${connectionId}`);

  return { success: true };
}
