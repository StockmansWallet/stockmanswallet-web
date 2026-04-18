"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const userIdSchema = z.object({ userId: z.string().uuid() });

const reportSchema = z.object({
  userId: z.string().uuid(),
  reason: z.enum(["spam", "abusive", "impersonation", "other"]),
  description: z.string().max(1000).optional(),
});

/**
 * Block a producer. Side effects:
 *  - Insert into user_blocks (unique, prevents duplicate).
 *  - Tear down any existing peer connection with the blocked party by
 *    setting status='removed'. The trigger installed in Phase 1 permits
 *    this transition from either side.
 *  - Pending requests in either direction are flipped to 'removed' too,
 *    so a future request from the blocked party would be a fresh row that
 *    the block-check intercepts.
 */
export async function blockUser(userId: string, reason?: string) {
  const parsed = userIdSchema.safeParse({ userId });
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (user.id === userId) return { error: "You can't block yourself" };

  const { error: blockError } = await supabase
    .from("user_blocks")
    .insert({
      blocker_user_id: user.id,
      blocked_user_id: userId,
      reason: reason?.trim() || null,
    });
  // Unique constraint hit = already blocked; treat as idempotent success.
  if (blockError && !blockError.message.includes("duplicate")) {
    return { error: blockError.message };
  }

  // Tear down any peer connection in either direction. The trigger allows
  // both requester and target to set status='removed'.
  await supabase
    .from("connection_requests")
    .update({ status: "removed", updated_at: new Date().toISOString() })
    .eq("connection_type", "farmer_peer")
    .in("status", ["pending", "approved"])
    .or(
      `and(requester_user_id.eq.${user.id},target_user_id.eq.${userId}),and(requester_user_id.eq.${userId},target_user_id.eq.${user.id})`,
    );

  revalidatePath("/dashboard/farmer-network");
  revalidatePath(`/dashboard/farmer-network/directory/${userId}`);
  return { success: true };
}

export async function unblockUser(userId: string) {
  const parsed = userIdSchema.safeParse({ userId });
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_user_id", user.id)
    .eq("blocked_user_id", userId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/farmer-network");
  revalidatePath(`/dashboard/farmer-network/directory/${userId}`);
  return { success: true };
}

/**
 * File a report against a producer. Report is immutable once filed
 * (no UPDATE/DELETE policies) and surfaced to admin via service role.
 * Does NOT block the reported party - blocking is a separate action.
 */
export async function reportUser(userId: string, reason: string, description?: string) {
  const parsed = reportSchema.safeParse({ userId, reason, description });
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (user.id === userId) return { error: "You can't report yourself" };

  const { error } = await supabase.from("user_reports").insert({
    reporter_user_id: user.id,
    reported_user_id: userId,
    reason: parsed.data.reason,
    description: parsed.data.description?.trim() || null,
  });

  if (error) return { error: error.message };
  return { success: true };
}
