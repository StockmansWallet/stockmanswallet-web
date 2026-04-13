"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyApproval, notifyDenial } from "@/lib/advisory/notifications";
import { DEFAULT_SHARING_PERMISSIONS, ALL_OFF_SHARING_PERMISSIONS } from "@/lib/types/advisory";

const requestIdSchema = z.object({
  requestId: z.string().uuid(),
});

// Approve connection only. Does NOT grant data access.
// The producer must separately grant data access via grantDataAccess().
export async function approveRequest(requestId: string) {
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
      status: "approved",
      permission_granted_at: new Date().toISOString(),
      sharing_permissions: DEFAULT_SHARING_PERMISSIONS,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    /* RLS enforces ownership */
    .select("id, requester_user_id, target_user_id")
    .single();

  if (error) return { error: error.message };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();
  const myName = profile?.display_name || "A user";
  const advisorUserId = conn.requester_user_id === user.id ? conn.target_user_id : conn.requester_user_id;

  await notifyApproval(supabase, advisorUserId, myName, conn.id, "advisor");

  revalidatePath("/dashboard/advisory-hub");
  return { success: true };
}

// Grant data access to an approved advisor. Open-ended until producer stops sharing.
export async function grantDataAccess(requestId: string) {
  const parsed = requestIdSchema.safeParse({ requestId });
  if (!parsed.success) return { error: "Invalid input" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("connection_requests")
    .update({
      permission_granted_at: new Date().toISOString(),
      permission_expires_at: null,
      sharing_permissions: DEFAULT_SHARING_PERMISSIONS,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    /* RLS enforces ownership */
    .eq("status", "approved");

  if (error) return { error: error.message };

  revalidatePath("/dashboard/advisory-hub");
  return { success: true };
}

// Stop sharing data with an advisor. Keeps the connection active.
export async function stopSharing(requestId: string) {
  const parsed = requestIdSchema.safeParse({ requestId });
  if (!parsed.success) return { error: "Invalid input" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("connection_requests")
    .update({
      permission_granted_at: null,
      permission_expires_at: null,
      sharing_permissions: ALL_OFF_SHARING_PERMISSIONS,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    /* RLS enforces ownership */
    .eq("status", "approved");

  if (error) return { error: error.message };

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
    /* RLS enforces ownership */
    .select("id, requester_user_id, target_user_id")
    .single();

  if (error) return { error: error.message };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();
  const myName = profile?.display_name || "A user";
  const otherUserId = conn.requester_user_id === user.id ? conn.target_user_id : conn.requester_user_id;

  await notifyDenial(supabase, otherUserId, myName, conn.id, "advisor");

  revalidatePath("/dashboard/advisory-hub");
  return { success: true };
}

// Disconnect advisor entirely. Removes from client list.
export async function disconnectAdvisor(requestId: string) {
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
      status: "removed",
      permission_granted_at: null,
      permission_expires_at: null,
      sharing_permissions: ALL_OFF_SHARING_PERMISSIONS,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    /* RLS enforces ownership */
    .select("id, requester_user_id, target_user_id")
    .single();

  if (error) return { error: error.message };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();
  const myName = profile?.display_name || "A user";
  const otherUserId = conn.requester_user_id === user.id ? conn.target_user_id : conn.requester_user_id;

  await notifyDenial(supabase, otherUserId, myName, conn.id, "advisor");

  revalidatePath("/dashboard/advisory-hub");
  return { success: true };
}
