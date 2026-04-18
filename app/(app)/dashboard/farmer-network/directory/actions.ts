"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyFarmerConnectionRequest } from "@/lib/advisory/notifications";

const targetUserIdSchema = z.object({
  targetUserId: z.string().uuid(),
});

const connectionIdSchema = z.object({
  connectionId: z.string().uuid(),
});

export async function sendFarmerConnectionRequest(targetUserId: string) {
  const parsed = targetUserIdSchema.safeParse({ targetUserId });
  if (!parsed.success) return { error: "Invalid input" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Check for existing farmer_peer connection
  const { data: existing } = await supabase
    .from("connection_requests")
    .select("id, status")
    .eq("connection_type", "farmer_peer")
    .or(
      `and(requester_user_id.eq.${user.id},target_user_id.eq.${targetUserId}),and(requester_user_id.eq.${targetUserId},target_user_id.eq.${user.id})`
    )
    .in("status", ["pending", "approved"]);

  if (existing && existing.length > 0) {
    return { error: "You already have an active or pending connection with this farmer." };
  }

  // Get requester profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, role, company_name")
    .eq("user_id", user.id)
    .single();

  const requesterName = profile?.display_name || user.email || "Unknown";
  const requesterRole = profile?.role || "producer";
  const requesterCompany = profile?.company_name || "";

  const { data: conn, error } = await supabase
    .from("connection_requests")
    .insert({
      requester_user_id: user.id,
      target_user_id: targetUserId,
      requester_name: requesterName,
      requester_role: requesterRole,
      requester_company: requesterCompany,
      status: "pending",
      connection_type: "farmer_peer",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await notifyFarmerConnectionRequest(supabase, targetUserId, requesterName, conn.id);

  revalidatePath("/dashboard/farmer-network");
  return { success: true };
}

/**
 * Cancels a pending connection request that the signed-in user sent.
 * Sets status to 'removed' (the DB trigger allows the requester to do this
 * but NOT to self-approve). Target is not notified, since the request never
 * reached a relationship.
 */
export async function cancelFarmerConnectionRequest(connectionId: string) {
  const parsed = connectionIdSchema.safeParse({ connectionId });
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: connection } = await supabase
    .from("connection_requests")
    .select("id, requester_user_id, status")
    .eq("id", connectionId)
    .eq("connection_type", "farmer_peer")
    .single();

  if (!connection) return { error: "Request not found" };
  if (connection.requester_user_id !== user.id) {
    return { error: "Only the requester can cancel this request" };
  }
  if (connection.status !== "pending") {
    return { error: "Only pending requests can be cancelled" };
  }

  const { error } = await supabase
    .from("connection_requests")
    .update({ status: "removed", updated_at: new Date().toISOString() })
    .eq("id", connectionId)
    .eq("requester_user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/farmer-network");
  revalidatePath(`/dashboard/farmer-network/directory/${connection.requester_user_id}`);
  return { success: true };
}
