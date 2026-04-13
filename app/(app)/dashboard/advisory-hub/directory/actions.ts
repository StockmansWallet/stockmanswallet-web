"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/advisory/notifications";

const DEFAULT_SHARING = { herds: true, properties: true, reports: true, valuations: true };

const targetUserIdSchema = z.object({
  targetUserId: z.string().uuid(),
});

// Producer-initiated connection request to an advisor.
// Auto-approves with full sharing permissions since the producer
// is voluntarily sharing their data with the advisor.
export async function sendConnectionRequest(targetUserId: string) {
  const parsed = targetUserIdSchema.safeParse({ targetUserId });
  if (!parsed.success) return { error: "Invalid input" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Check for existing connection in either direction
  const { data: existing } = await supabase
    .from("connection_requests")
    .select("id, status")
    .or(`and(requester_user_id.eq.${user.id},target_user_id.eq.${targetUserId}),and(requester_user_id.eq.${targetUserId},target_user_id.eq.${user.id})`)
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
      status: "approved",
      permission_granted_at: new Date().toISOString(),
      sharing_permissions: DEFAULT_SHARING,
      connection_type: "advisory",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Notify the advisor they have a new client (not a pending request)
  await createNotification(supabase, {
    userId: targetUserId,
    type: "request_approved",
    title: `${requesterName} has connected with you`,
    body: "You can now view their portfolio data.",
    link: `/dashboard/advisor/clients/${conn.id}`,
    connectionId: conn.id,
  });

  revalidatePath("/dashboard/advisory-hub");
  revalidatePath("/dashboard/advisor/clients");
  return { success: true };
}
