"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const typesSchema = z.object({
  types: z.array(z.string().min(1)).min(1).max(20),
});

const connectionIdReadSchema = z.object({
  connectionId: z.string().uuid(),
});

// Used by per-feature sidebar badges: when the user lands on a feature's
// route, its owned notification types are marked read. Idempotent, no-ops
// when nothing is unread.
export async function markNotificationsReadByTypes(types: string[]) {
  const parsed = typesSchema.safeParse({ types });
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false)
    .in("type", parsed.data.types);

  if (error) return { error: error.message };

  return { success: true };
}

// Used by the chat detail page to clear unread notifications tied to a
// single conversation. Keeps the sidebar badge honest when messages
// arrive while the user is already reading the thread, without
// disturbing unread counts for other conversations.
export async function markConnectionNotificationsAsRead(connectionId: string) {
  const parsed = connectionIdReadSchema.safeParse({ connectionId });
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("related_connection_id", parsed.data.connectionId)
    .eq("is_read", false);

  if (error) return { error: error.message };

  return { success: true };
}
