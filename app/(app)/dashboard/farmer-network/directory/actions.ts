"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyFarmerConnectionRequest } from "@/lib/advisory/notifications";

const targetUserIdSchema = z.object({
  targetUserId: z.string().uuid(),
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
