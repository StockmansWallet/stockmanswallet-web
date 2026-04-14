"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/advisory/notifications";
import { DEFAULT_SHARING_PERMISSIONS, ALL_OFF_SHARING_PERMISSIONS } from "@/lib/types/advisory";

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

  // Get existing connections to exclude (both directions)
  const { data: existingConns } = await supabase
    .from("connection_requests")
    .select("requester_user_id, target_user_id")
    .or(`requester_user_id.eq.${user.id},target_user_id.eq.${user.id}`)
    .in("status", ["pending", "approved"]);

  const excludeIds = [user.id, ...(existingConns ?? []).map((c) =>
    c.requester_user_id === user.id ? c.target_user_id : c.requester_user_id
  )];

  const { data: producers } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, company_name, state, region, property_name, bio")
    .eq("role", "producer")
    .not("user_id", "in", `(${excludeIds.join(",")})`)
    .or(
      `display_name.ilike.%${sanitised}%,company_name.ilike.%${sanitised}%,property_name.ilike.%${sanitised}%`
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

  // Check for existing active connection in either direction
  const { data: existingList } = await supabase
    .from("connection_requests")
    .select("id, status")
    .or(`and(requester_user_id.eq.${user.id},target_user_id.eq.${targetUserId}),and(requester_user_id.eq.${targetUserId},target_user_id.eq.${user.id})`)
    .in("status", ["pending", "approved"]);

  if (existingList && existingList.length > 0) {
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

  // Always create a fresh connection (simpler than reactivating old ones)
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
  const connId = conn.id;

  await createNotification(supabase, {
    userId: targetUserId,
    type: "new_connection_request",
    title: `${requesterName} wants to connect`,
    body: "Review and accept or decline this connection request.",
    link: "/dashboard/advisory-hub/my-advisors",
    connectionId: connId,
  });

  revalidatePath("/dashboard/advisor/clients");
  revalidatePath("/dashboard/advisory-hub/my-advisors");
  revalidatePath("/dashboard/advisory-hub");
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

  // Fetch the connection to identify the other party
  const { data: connCheck } = await supabase
    .from("connection_requests")
    .select("id, requester_user_id, target_user_id")
    .eq("id", connectionId)
    .single();

  if (!connCheck) return { error: "Connection not found" };
  const isRequester = connCheck.requester_user_id === user.id;
  const isTarget = connCheck.target_user_id === user.id;
  if (!isRequester && !isTarget) return { error: "Connection not found" };

  // The other party (producer) who needs to re-approve
  const producerUserId = isRequester ? connCheck.target_user_id : connCheck.requester_user_id;

  // Update the connection to pending renewal (re-set to pending so farmer can re-approve)
  const { data: conn, error } = await supabase
    .from("connection_requests")
    .update({ status: "pending" })
    .eq("id", connectionId)
    .select("id")
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
  await notifyRenewalRequested(supabase, producerUserId, advisorName, conn.id, "producer");

  revalidatePath("/dashboard/advisor/clients");
  revalidatePath(`/dashboard/advisor/clients/${connectionId}`);
  revalidatePath("/dashboard/advisory-hub/my-advisors");
  revalidatePath("/dashboard/advisory-hub");
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

  // Fetch connection to resolve the other party before removing
  const { data: conn } = await supabase
    .from("connection_requests")
    .select("id, requester_user_id, target_user_id")
    .eq("id", connectionId)
    .single();

  if (!conn) return { error: "Connection not found" };
  const isRequester = conn.requester_user_id === user.id;
  const isTarget = conn.target_user_id === user.id;
  if (!isRequester && !isTarget) return { error: "Connection not found" };

  const otherUserId = isRequester ? conn.target_user_id : conn.requester_user_id;

  // Soft-delete: set status to "removed", clear all permissions.
  // Matches iOS disconnectAdvisor() and web disconnectAdvisor().
  const { error } = await supabase
    .from("connection_requests")
    .update({
      status: "removed",
      permission_granted_at: null,
      permission_expires_at: new Date().toISOString(),
      sharing_permissions: ALL_OFF_SHARING_PERMISSIONS,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connectionId);

  if (error) return { error: error.message };

  // Notify the other party so their page auto-updates
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();

  await createNotification(supabase, {
    userId: otherUserId,
    type: "request_denied",
    title: `${profile?.display_name || "An advisor"} removed the connection`,
    link: "/dashboard/advisory-hub/my-advisors",
    connectionId,
  });

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
  revalidatePath("/dashboard/advisory-hub/my-advisors");
  revalidatePath("/dashboard/advisory-hub");
  return { success: true };
}

// Advisor accepts a pending connection request from a producer.
// Sets status to "approved" and activates the sharing permissions the producer chose.
export async function acceptClientRequest(connectionId: string) {
  const parsed = connectionIdSchema.safeParse({ connectionId });
  if (!parsed.success) return { error: "Invalid input" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: connection } = await supabase
    .from("connection_requests")
    .select("id, requester_user_id, target_user_id, status")
    .eq("id", connectionId)
    .eq("status", "pending")
    .single();

  if (!connection) return { error: "Request not found" };
  const isRequester = connection.requester_user_id === user.id;
  const isTarget = connection.target_user_id === user.id;
  if (!isRequester && !isTarget) return { error: "Request not found" };

  const producerUserId = isTarget ? connection.requester_user_id : connection.target_user_id;

  const { error } = await supabase
    .from("connection_requests")
    .update({
      status: "approved",
      permission_granted_at: new Date().toISOString(),
      sharing_permissions: DEFAULT_SHARING_PERMISSIONS,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connectionId);

  if (error) return { error: error.message };

  // Notify the producer that their request was accepted
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();
  const advisorName = profile?.display_name || "Your advisor";

  await createNotification(supabase, {
    userId: producerUserId,
    type: "request_approved",
    title: `${advisorName} accepted your connection`,
    body: "You are now connected. Your advisor can view your shared data.",
    link: `/dashboard/advisory-hub/my-advisors/${connectionId}`,
    connectionId,
  });

  revalidatePath("/dashboard/advisor/clients");
  revalidatePath("/dashboard/advisory-hub/my-advisors");
  return { success: true };
}

// Advisor declines a pending connection request from a producer.
export async function declineClientRequest(connectionId: string) {
  const parsed = connectionIdSchema.safeParse({ connectionId });
  if (!parsed.success) return { error: "Invalid input" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: connection } = await supabase
    .from("connection_requests")
    .select("id, requester_user_id, target_user_id, status")
    .eq("id", connectionId)
    .eq("status", "pending")
    .single();

  if (!connection) return { error: "Request not found" };
  const isRequester = connection.requester_user_id === user.id;
  const isTarget = connection.target_user_id === user.id;
  if (!isRequester && !isTarget) return { error: "Request not found" };

  const producerUserId = isTarget ? connection.requester_user_id : connection.target_user_id;

  const { error } = await supabase
    .from("connection_requests")
    .update({ status: "denied", updated_at: new Date().toISOString() })
    .eq("id", connectionId);

  if (error) return { error: error.message };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();

  await createNotification(supabase, {
    userId: producerUserId,
    type: "request_denied",
    title: `${profile?.display_name || "An advisor"} declined your request`,
    link: `/dashboard/advisory-hub/my-advisors`,
    connectionId,
  });

  revalidatePath("/dashboard/advisor/clients");
  revalidatePath("/dashboard/advisory-hub/my-advisors");
  return { success: true };
}
