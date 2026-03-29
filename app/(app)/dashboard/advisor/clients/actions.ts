"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyConnectionRequest } from "@/lib/advisory/notifications";

const searchQuerySchema = z.object({
  query: z.string().min(2).max(100),
});

const targetUserIdSchema = z.object({
  targetUserId: z.string().uuid(),
});

const connectionIdSchema = z.object({
  connectionId: z.string().uuid(),
});

export async function searchProducers(query: string) {
  const parsed = searchQuerySchema.safeParse({ query: query?.trim() });
  if (!parsed.success) return { producers: [] };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { producers: [] };

  // Sanitise input - letters, numbers, spaces, hyphens, apostrophes only
  const sanitised = query.replace(/[^a-zA-Z0-9\s\-']/g, "").trim();
  if (!sanitised) return { producers: [] };

  // Get existing connections to exclude
  const { data: existingConns } = await supabase
    .from("connection_requests")
    .select("target_user_id")
    .eq("requester_user_id", user.id)
    .eq("connection_type", "advisory")
    .in("status", ["pending", "approved"]);

  const excludeIds = [user.id, ...(existingConns ?? []).map((c) => c.target_user_id)];

  const { data: producers } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, company_name, state, region")
    .eq("role", "producer")
    .not("user_id", "in", `(${excludeIds.join(",")})`)
    .or(
      `display_name.ilike.%${sanitised}%,company_name.ilike.%${sanitised}%`
    )
    .order("display_name")
    .limit(10);

  return { producers: producers ?? [] };
}

export async function sendAdvisorConnectionRequest(targetUserId: string) {
  const parsed = targetUserIdSchema.safeParse({ targetUserId });
  if (!parsed.success) return { error: "Invalid input" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Check for existing advisory connection (any status)
  const { data: existing } = await supabase
    .from("connection_requests")
    .select("id, status")
    .eq("requester_user_id", user.id)
    .eq("target_user_id", targetUserId)
    .eq("connection_type", "advisory")
    .limit(1)
    .maybeSingle();

  if (existing && (existing.status === "pending" || existing.status === "approved")) {
    return { error: "You already have an active or pending connection with this producer." };
  }

  // Get advisor profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, role, company_name")
    .eq("user_id", user.id)
    .single();

  const requesterName = profile?.display_name || user.email || "Unknown";
  const requesterRole = profile?.role || "accountant";
  const requesterCompany = profile?.company_name || "";

  let connId: string;

  if (existing) {
    // Reactivate existing removed/denied/expired connection instead of creating a duplicate
    const { data: updated, error } = await supabase
      .from("connection_requests")
      .update({
        status: "pending",
        requester_name: requesterName,
        requester_role: requesterRole,
        requester_company: requesterCompany,
        permission_granted_at: null,
        permission_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("id")
      .single();

    if (error) return { error: error.message };
    connId = updated.id;
  } else {
    // Create new connection request
    const { data: conn, error } = await supabase
      .from("connection_requests")
      .insert({
        requester_user_id: user.id,
        target_user_id: targetUserId,
        requester_name: requesterName,
        requester_role: requesterRole,
        requester_company: requesterCompany,
        status: "pending",
        connection_type: "advisory",
      })
      .select("id")
      .single();

    if (error) return { error: error.message };
    connId = conn.id;
  }

  await notifyConnectionRequest(supabase, targetUserId, requesterName, connId);

  revalidatePath("/dashboard/advisor/clients");
  return { success: true };
}

export async function requestRenewal(connectionId: string) {
  const parsed = connectionIdSchema.safeParse({ connectionId });
  if (!parsed.success) return { error: "Invalid input" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Update the connection to pending renewal (re-set to pending so farmer can re-approve)
  const { data: conn, error } = await supabase
    .from("connection_requests")
    .update({ status: "pending" })
    .eq("id", connectionId)
    .eq("requester_user_id", user.id)
    .select("id, target_user_id")
    .single();

  if (error) return { error: error.message };

  // Get advisor name for notification
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();
  const advisorName = profile?.display_name || "An advisor";

  const { notifyRenewalRequested } = await import("@/lib/advisory/notifications");
  await notifyRenewalRequested(supabase, conn.target_user_id, advisorName, conn.id);

  revalidatePath("/dashboard/advisor/clients");
  revalidatePath(`/dashboard/advisor/clients/${connectionId}`);
  return { success: true };
}

export async function removeClient(connectionId: string) {
  const parsed = connectionIdSchema.safeParse({ connectionId });
  if (!parsed.success) return { error: "Invalid input" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Soft-delete: set status to "removed" so both platforms detect it.
  // Advisor is the requester, RLS policy "Requester can update own requests" allows this.
  const { error } = await supabase
    .from("connection_requests")
    .update({
      status: "removed",
      permission_expires_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", connectionId)
    .eq("requester_user_id", user.id);

  if (error) return { error: error.message };

  // Clean up advisor lenses and scenarios for this connection
  await supabase
    .from("advisor_lenses")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("client_connection_id", connectionId);

  await supabase
    .from("advisor_scenarios")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("client_connection_id", connectionId);

  revalidatePath("/dashboard/advisor/clients");
  return { success: true };
}
