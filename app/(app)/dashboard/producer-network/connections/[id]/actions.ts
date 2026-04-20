"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createNotification, notifyProducerRequestDenied } from "@/lib/advisory/notifications";
import type { AdvisoryMessage, MessageType, MessageAttachment } from "@/lib/types/advisory";

const connectionIdSchema = z.object({
  connectionId: z.string().uuid(),
});

const herdAttachmentSchema = z.object({
  type: z.literal("herd"),
  herd_id: z.string().uuid(),
  name: z.string().max(200),
  species: z.string().max(40),
  breed: z.string().max(100),
  category: z.string().max(80),
  head_count: z.number().int().nonnegative(),
  current_weight: z.number().nullable(),
  initial_weight: z.number().nullable(),
  estimated_value: z.number().nullable(),
});

const priceAttachmentSchema = z.object({
  type: z.literal("price"),
  category: z.string().max(80),
  saleyard: z.string().max(100),
  price_per_kg: z.number().nonnegative(),
  weight_range: z.string().max(40).nullable(),
  breed: z.string().max(80).nullable(),
  data_date: z.string(),
});

const attachmentSchema = z.discriminatedUnion("type", [
  herdAttachmentSchema,
  priceAttachmentSchema,
]);

const sendMessageSchema = z.object({
  connectionId: z.string().uuid(),
  // Content is optional when an attachment is present so 'sharing a herd'
  // with no extra note still goes through.
  content: z.string().max(5000),
  attachment: attachmentSchema.nullable().optional(),
}).refine(
  (v) => v.content.trim().length > 0 || v.attachment != null,
  { message: "Message must have content or an attachment" },
);

export async function fetchProducerMessages(connectionId: string) {
  const parsed = connectionIdSchema.safeParse({ connectionId });
  if (!parsed.success) return { error: "Invalid input", messages: [] };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated", messages: [] };

  const { data: connection } = await supabase
    .from("connection_requests")
    .select("id, requester_user_id, target_user_id")
    .eq("id", connectionId)
    .eq("connection_type", "producer_peer")
    .eq("status", "approved")
    .single();

  if (!connection) return { error: "Connection not found", messages: [] };

  const isParty =
    connection.requester_user_id === user.id ||
    connection.target_user_id === user.id;
  if (!isParty) return { error: "Connection not found", messages: [] };

  const { data: messages } = await supabase
    .from("advisory_messages")
    .select("*")
    .eq("connection_id", connectionId)
    .order("created_at", { ascending: true });

  return { messages: (messages ?? []) as AdvisoryMessage[] };
}

export async function sendProducerMessage(
  connectionId: string,
  content: string,
  _messageType: MessageType = "general_note",
  attachment: MessageAttachment | null = null,
) {
  const parsed = sendMessageSchema.safeParse({ connectionId, content, attachment });
  if (!parsed.success) return { error: "Invalid input" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify user is a party on this producer_peer connection
  const { data: connection } = await supabase
    .from("connection_requests")
    .select("id, requester_user_id, target_user_id")
    .eq("id", connectionId)
    .eq("connection_type", "producer_peer")
    .eq("status", "approved")
    .single();

  if (!connection) return { error: "Connection not found" };

  const isRequester = connection.requester_user_id === user.id;
  const isTarget = connection.target_user_id === user.id;
  if (!isRequester && !isTarget) return { error: "Connection not found" };

  // Re-verify the attachment payload server-side. If the user claimed to
  // share a herd, confirm that herd actually belongs to them before
  // writing the snapshot, so a caller can't fabricate a shared herd from
  // someone else's data.
  let verifiedAttachment: MessageAttachment | null = null;
  if (attachment && attachment.type === "herd") {
    const { data: herd } = await supabase
      .from("herds")
      .select("id, name, species, breed, category, head_count, current_weight, initial_weight")
      .eq("id", attachment.herd_id)
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .maybeSingle();
    if (!herd) return { error: "Herd not found or not yours to share" };
    verifiedAttachment = {
      type: "herd",
      herd_id: herd.id as string,
      name: herd.name as string,
      species: herd.species as string,
      breed: herd.breed as string,
      category: herd.category as string,
      head_count: (herd.head_count as number) ?? 0,
      current_weight: (herd.current_weight as number) ?? null,
      initial_weight: (herd.initial_weight as number) ?? null,
      estimated_value: attachment.estimated_value,
    };
  } else if (attachment && attachment.type === "price") {
    // Prices are public reference data; no ownership check needed.
    verifiedAttachment = attachment;
  }

  const { error } = await supabase.from("advisory_messages").insert({
    connection_id: connectionId,
    sender_user_id: user.id,
    message_type: "general_note",
    content: content.trim(),
    attachment: verifiedAttachment,
  });

  if (error) return { error: error.message };

  // Notify the other party
  const recipientId = isRequester
    ? connection.target_user_id
    : connection.requester_user_id;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();
  const senderName = profile?.display_name ?? "A producer";

  await createNotification(supabase, {
    userId: recipientId,
    type: "new_message",
    title: `New message from ${senderName}`,
    link: `/dashboard/producer-network/connections/${connectionId}`,
    connectionId,
  });

  revalidatePath(`/dashboard/producer-network/connections/${connectionId}`);
  return { success: true };
}

/**
 * Returns the caller's active herds formatted as share candidates. Each
 * row is the subset of columns the picker surfaces; the final snapshot
 * is re-read server-side in sendProducerMessage for defence in depth.
 */
export async function listMyHerdsForShare() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { herds: [] as Array<Record<string, unknown>> };

  const { data } = await supabase
    .from("herds")
    .select("id, name, species, breed, category, head_count, current_weight, initial_weight")
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .eq("is_sold", false)
    .neq("is_demo_data", true)
    .order("name");

  return { herds: data ?? [] };
}

/**
 * Returns recent market prices the user might want to share. Pulled from
 * the latest_saleyard_prices RPC already used by the dashboard, scoped
 * to the user's default saleyard where available and otherwise returning
 * the National Indicator slice as the most universally useful baseline.
 */
export async function listMarketPricesForShare() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { prices: [] as Array<Record<string, unknown>> };

  // Producer's default saleyard (if any) comes from their default property.
  const { data: prop } = await supabase
    .from("properties")
    .select("default_saleyard")
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .eq("is_default", true)
    .maybeSingle();

  const saleyards = prop?.default_saleyard
    ? [prop.default_saleyard as string, "National"]
    : ["National"];

  const { data: rows } = await supabase.rpc("latest_saleyard_prices", {
    p_saleyards: saleyards,
    p_categories: [] as string[],
  }) as unknown as { data: Array<{ category: string; saleyard: string; price_per_kg: number; weight_range: string | null; breed: string | null; data_date: string }> | null };

  // price_per_kg from this RPC is in cents - divide at render time to
  // match the rest of the app. Send up to 12 most relevant rows.
  return { prices: (rows ?? []).slice(0, 12) };
}

export async function disconnectProducer(connectionId: string) {
  const parsed = connectionIdSchema.safeParse({ connectionId });
  if (!parsed.success) return { error: "Invalid input" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: connection } = await supabase
    .from("connection_requests")
    .select("id, requester_user_id, target_user_id")
    .eq("id", connectionId)
    .eq("connection_type", "producer_peer")
    .single();

  if (!connection) return { error: "Connection not found" };

  const isRequester = connection.requester_user_id === user.id;
  const isTarget = connection.target_user_id === user.id;
  if (!isRequester && !isTarget) return { error: "Connection not found" };

  const { error } = await supabase
    .from("connection_requests")
    .update({ status: "expired" })
    .eq("id", connectionId);

  if (error) return { error: error.message };

  // Notify the other party
  const recipientId = isRequester
    ? connection.target_user_id
    : connection.requester_user_id;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();
  const name = profile?.display_name ?? "A producer";

  await notifyProducerRequestDenied(supabase, recipientId, name, connectionId, "disconnected");

  revalidatePath("/dashboard/producer-network");
  return { success: true };
}
