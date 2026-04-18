"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/advisory/notifications";

const broadcastSchema = z.object({
  content: z.string().min(1).max(5000),
});

/**
 * Fans a single message out to every approved peer connection the caller
 * has. Each recipient sees it in their 1:1 chat as a standard general_note
 * message (no special broadcast flag - this is intentional so the recipient
 * can reply privately without knowing it was a broadcast). Attachments are
 * intentionally NOT supported here: broadcasting a frozen herd snapshot to
 * many recipients multiplies privacy risk, and the caller can still share
 * to individuals through the per-chat share menu.
 *
 * Returns the number of chats the message landed in, or an error. Best-
 * effort: if a single insert or notification fails, the rest still go out.
 */
export async function broadcastToPeerConnections(content: string) {
  const parsed = broadcastSchema.safeParse({ content });
  if (!parsed.success) return { error: "Message is required (max 5000 chars)" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: connections } = await supabase
    .from("connection_requests")
    .select("id, requester_user_id, target_user_id")
    .eq("connection_type", "farmer_peer")
    .eq("status", "approved")
    .or(`requester_user_id.eq.${user.id},target_user_id.eq.${user.id}`);

  if (!connections || connections.length === 0) {
    return { error: "You have no active connections to broadcast to" };
  }

  const trimmed = content.trim();
  const rows = connections.map((c) => ({
    connection_id: c.id,
    sender_user_id: user.id,
    message_type: "general_note" as const,
    content: trimmed,
  }));

  const { error: insertError } = await supabase.from("advisory_messages").insert(rows);
  if (insertError) return { error: insertError.message };

  // Lookup sender display name once for the notification body.
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();
  const senderName = profile?.display_name ?? "A producer";

  // Fire notifications in parallel (best-effort; don't fail the broadcast
  // if a single notification write errors).
  await Promise.all(
    connections.map((c) => {
      const recipientId =
        c.requester_user_id === user.id ? c.target_user_id : c.requester_user_id;
      return createNotification(supabase, {
        userId: recipientId,
        type: "new_message",
        title: `New message from ${senderName}`,
        link: `/dashboard/farmer-network/connections/${c.id}`,
        connectionId: c.id,
      }).catch(() => undefined);
    }),
  );

  revalidatePath("/dashboard/farmer-network/connections");
  return { success: true, recipientCount: connections.length };
}
