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
    .eq("role", "farmer_grazier")
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

  // Check for existing advisory connection (either direction)
  const { data: existing } = await supabase
    .from("connection_requests")
    .select("id, status")
    .eq("connection_type", "advisory")
    .or(
      `and(requester_user_id.eq.${user.id},target_user_id.eq.${targetUserId}),and(requester_user_id.eq.${targetUserId},target_user_id.eq.${user.id})`
    )
    .in("status", ["pending", "approved"]);

  if (existing && existing.length > 0) {
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

  await notifyConnectionRequest(supabase, targetUserId, requesterName, conn.id);

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

  // Note: RLS only allows target_user_id to update, so advisor needs
  // a different approach. For now, we set status to expired via a server action
  // that uses the requester perspective.
  const { error } = await supabase
    .from("connection_requests")
    .update({
      status: "expired",
      permission_expires_at: new Date().toISOString(),
    })
    .eq("id", connectionId)
    .eq("target_user_id", user.id);

  // If the above fails (advisor is requester, not target), try the other direction
  if (error) {
    // This will work if we update RLS, for now it may fail gracefully
    return { error: "Cannot remove - contact the producer to revoke access." };
  }

  revalidatePath("/dashboard/advisor/clients");
  return { success: true };
}
