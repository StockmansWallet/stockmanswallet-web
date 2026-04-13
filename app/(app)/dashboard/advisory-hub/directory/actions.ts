"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/advisory/notifications";

interface SharingPrefs {
  herds: boolean;
  properties: boolean;
  reports: boolean;
  valuations: boolean;
}

const DEFAULT_SHARING: SharingPrefs = { herds: true, properties: true, reports: true, valuations: true };

const targetUserIdSchema = z.object({
  targetUserId: z.string().uuid(),
});

// Producer-initiated connection request to an advisor.
// Sets status to "pending". The advisor must accept before data is shared.
// Sharing preferences are stored so they activate immediately on acceptance.
export async function sendConnectionRequest(targetUserId: string, sharing?: SharingPrefs) {
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
      status: "pending",
      sharing_permissions: sharing ?? DEFAULT_SHARING,
      connection_type: "advisory",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Notify the advisor of the pending request
  await createNotification(supabase, {
    userId: targetUserId,
    type: "new_connection_request",
    title: `${requesterName} wants to connect`,
    body: "Review and accept or decline this connection request.",
    link: "/dashboard/advisor/clients",
    connectionId: conn.id,
  });

  revalidatePath("/dashboard/advisory-hub");
  revalidatePath("/dashboard/advisor/clients");
  return { success: true };
}
