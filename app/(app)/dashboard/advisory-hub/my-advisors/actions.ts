"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyApproval, notifyDenial } from "@/lib/advisory/notifications";

const requestIdSchema = z.object({
  requestId: z.string().uuid(),
});

export async function approveRequest(requestId: string) {
  const parsed = requestIdSchema.safeParse({ requestId });
  if (!parsed.success) return { error: "Invalid input" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // 3-day permission window
  const now = new Date();
  const expires = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const { data: conn, error } = await supabase
    .from("connection_requests")
    .update({
      status: "approved",
      permission_granted_at: now.toISOString(),
      permission_expires_at: expires.toISOString(),
    })
    .eq("id", requestId)
    .eq("target_user_id", user.id)
    .select("id, requester_user_id")
    .single();

  if (error) return { error: error.message };

  // Get producer name for notification
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();
  const producerName = profile?.display_name || "A producer";

  await notifyApproval(supabase, conn.requester_user_id, producerName, conn.id);

  revalidatePath("/dashboard/advisory-hub");
  return { success: true };
}

export async function denyRequest(requestId: string) {
  const parsed = requestIdSchema.safeParse({ requestId });
  if (!parsed.success) return { error: "Invalid input" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: conn, error } = await supabase
    .from("connection_requests")
    .update({ status: "denied" })
    .eq("id", requestId)
    .eq("target_user_id", user.id)
    .select("id, requester_user_id")
    .single();

  if (error) return { error: error.message };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();
  const producerName = profile?.display_name || "A producer";

  await notifyDenial(supabase, conn.requester_user_id, producerName, conn.id);

  revalidatePath("/dashboard/advisory-hub");
  return { success: true };
}

export async function revokeAccess(requestId: string) {
  const parsed = requestIdSchema.safeParse({ requestId });
  if (!parsed.success) return { error: "Invalid input" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: conn, error } = await supabase
    .from("connection_requests")
    .update({
      status: "expired",
      permission_expires_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("target_user_id", user.id)
    .select("id, requester_user_id")
    .single();

  if (error) return { error: error.message };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();
  const producerName = profile?.display_name || "A producer";

  await notifyDenial(supabase, conn.requester_user_id, producerName, conn.id);

  revalidatePath("/dashboard/advisory-hub");
  return { success: true };
}
