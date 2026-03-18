"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  notifyFarmerRequestApproved,
  notifyDenial,
} from "@/lib/advisory/notifications";

const requestIdSchema = z.object({
  requestId: z.string().uuid(),
});

export async function approveFarmerRequest(requestId: string) {
  const parsed = requestIdSchema.safeParse({ requestId });
  if (!parsed.success) return { error: "Invalid input" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: conn, error } = await supabase
    .from("connection_requests")
    .update({ status: "approved" })
    .eq("id", requestId)
    .eq("target_user_id", user.id)
    .eq("connection_type", "farmer_peer")
    .select("id, requester_user_id")
    .single();

  if (error) return { error: error.message };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();
  const name = profile?.display_name || "A farmer";

  await notifyFarmerRequestApproved(supabase, conn.requester_user_id, name, conn.id);

  revalidatePath("/dashboard/farmer-network");
  return { success: true };
}

export async function denyFarmerRequest(requestId: string) {
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
    .eq("connection_type", "farmer_peer")
    .select("id, requester_user_id")
    .single();

  if (error) return { error: error.message };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();
  const name = profile?.display_name || "A farmer";

  await notifyDenial(supabase, conn.requester_user_id, name, conn.id);

  revalidatePath("/dashboard/farmer-network");
  return { success: true };
}
