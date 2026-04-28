"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyProducerConnectionRequest } from "@/lib/advisory/notifications";
import { sanitiseSearchQuery } from "@/lib/utils/search-sanitise";
import { fetchUserAvatars } from "@/lib/auth/fetch-user-avatars";
import { enrichProducers } from "@/lib/data/producer-enrichment";

const targetUserIdSchema = z.object({
  targetUserId: z.string().uuid(),
});

const connectionIdSchema = z.object({
  connectionId: z.string().uuid(),
});

const searchQuerySchema = z.object({
  query: z.string().min(2).max(100),
});

/**
 * Search for producers to offer as quick-connect candidates inside the
 * Producer Network's My Connections page. Excludes the caller and any
 * producer they already have an active / pending peer connection with.
 */
export async function searchProducersForPeer(query: string) {
  const parsed = searchQuerySchema.safeParse({ query: query?.trim() });
  if (!parsed.success) return { producers: [] };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { producers: [] };

  const sanitised = sanitiseSearchQuery(query);
  if (!sanitised) return { producers: [] };

  // Exclude self, producers already in an active / pending peer connection,
  // and any producer the caller has blocked.
  const [
    { data: existingConns },
    { data: blocks },
  ] = await Promise.all([
    supabase
      .from("connection_requests")
      .select("requester_user_id, target_user_id")
      .eq("connection_type", "producer_peer")
      .or(`requester_user_id.eq.${user.id},target_user_id.eq.${user.id}`)
      .in("status", ["pending", "approved"]),
    supabase
      .from("user_blocks")
      .select("blocked_user_id")
      .eq("blocker_user_id", user.id),
  ]);

  const excludeIds = [
    user.id,
    ...(existingConns ?? []).map((c) =>
      c.requester_user_id === user.id ? c.target_user_id : c.requester_user_id,
    ),
    ...(blocks ?? []).map((b) => b.blocked_user_id as string),
  ];

  const { data: producers } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, company_name, property_name, state, region, bio")
    .eq("role", "producer")
    .not("user_id", "in", `(${excludeIds.join(",")})`)
    .or(
      `display_name.ilike.%${sanitised}%,company_name.ilike.%${sanitised}%,property_name.ilike.%${sanitised}%`,
    )
    .order("display_name")
    .limit(8);

  const rows = producers ?? [];
  const resultIds = rows.map((producer) => producer.user_id);
  const [avatarMap, enrichmentMap] = await Promise.all([
    fetchUserAvatars(resultIds),
    enrichProducers(supabase, resultIds),
  ]);

  return {
    producers: rows.map((producer) => {
      const enrichment = enrichmentMap.get(producer.user_id);
      return {
        ...producer,
        avatar_url: avatarMap.get(producer.user_id) ?? null,
        primary_species: enrichment?.primary_species ?? null,
        total_head: enrichment?.total_head ?? 0,
        herd_size_bucket: enrichment?.herd_size_bucket ?? null,
        property_count: enrichment?.property_count ?? 0,
      };
    }),
  };
}

export async function sendProducerConnectionRequest(targetUserId: string) {
  const parsed = targetUserIdSchema.safeParse({ targetUserId });
  if (!parsed.success) return { error: "Invalid input" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Check for existing producer_peer connection
  const { data: existing } = await supabase
    .from("connection_requests")
    .select("id, status")
    .eq("connection_type", "producer_peer")
    .or(
      `and(requester_user_id.eq.${user.id},target_user_id.eq.${targetUserId}),and(requester_user_id.eq.${targetUserId},target_user_id.eq.${user.id})`
    )
    .in("status", ["pending", "approved"]);

  if (existing && existing.length > 0) {
    return { error: "You already have an active or pending connection with this producer." };
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
      connection_type: "producer_peer",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await notifyProducerConnectionRequest(supabase, targetUserId, requesterName, conn.id);

  revalidatePath("/dashboard/ch40");
  return { success: true };
}

/**
 * Cancels a pending connection request that the signed-in user sent.
 * Sets status to 'removed' (the DB trigger allows the requester to do this
 * but NOT to self-approve). Target is not notified, since the request never
 * reached a relationship.
 */
export async function cancelProducerConnectionRequest(connectionId: string) {
  const parsed = connectionIdSchema.safeParse({ connectionId });
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: connection } = await supabase
    .from("connection_requests")
    .select("id, requester_user_id, status")
    .eq("id", connectionId)
    .eq("connection_type", "producer_peer")
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

  revalidatePath("/dashboard/ch40");
  revalidatePath(`/dashboard/ch40/directory/${connection.requester_user_id}`);
  return { success: true };
}
