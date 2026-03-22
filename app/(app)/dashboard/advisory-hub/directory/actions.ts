"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyConnectionRequest } from "@/lib/advisory/notifications";

const targetUserIdSchema = z.object({
  targetUserId: z.string().uuid(),
});

export async function sendConnectionRequest(targetUserId: string) {
  const parsed = targetUserIdSchema.safeParse({ targetUserId });
  if (!parsed.success) return { error: "Invalid input" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Check for existing connection
  const { data: existing } = await supabase
    .from("connection_requests")
    .select("id, status")
    .eq("requester_user_id", user.id)
    .eq("target_user_id", targetUserId)
    .in("status", ["pending", "approved"]);

  if (existing && existing.length > 0) {
    return { error: "You already have an active or pending connection with this advisor." };
  }

  // Get requester profile for name/role/company
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
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await notifyConnectionRequest(supabase, targetUserId, requesterName, conn.id);

  revalidatePath("/dashboard/advisory-hub");
  return { success: true };
}
