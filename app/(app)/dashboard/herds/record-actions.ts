"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ── Muster Records ──

export async function createMusterRecord(herdId: string, data: {
  date: string;
  total_head_count: number | null;
  cattle_yard: string | null;
  weaners_count: number | null;
  branders_count: number | null;
  notes: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("muster_records").insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    herd_id: herdId,
    date: data.date,
    total_head_count: data.total_head_count,
    cattle_yard: data.cattle_yard,
    weaners_count: data.weaners_count,
    branders_count: data.branders_count,
    notes: data.notes,
  });

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/herds/${herdId}`);
  return { success: true };
}

export async function updateMusterRecord(id: string, herdId: string, data: {
  date: string;
  total_head_count: number | null;
  cattle_yard: string | null;
  weaners_count: number | null;
  branders_count: number | null;
  notes: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("muster_records").update({
    date: data.date,
    total_head_count: data.total_head_count,
    cattle_yard: data.cattle_yard,
    weaners_count: data.weaners_count,
    branders_count: data.branders_count,
    notes: data.notes,
  }).eq("id", id).eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/herds/${herdId}`);
  return { success: true };
}

export async function deleteMusterRecord(id: string, herdId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("muster_records").update({
    is_deleted: true,
    deleted_at: new Date().toISOString(),
  }).eq("id", id).eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/herds/${herdId}`);
  return { success: true };
}

// ── Health Records ──

export async function createHealthRecord(herdId: string, data: {
  date: string;
  treatment_type: "Vaccination" | "Drenching" | "Parasite Treatment" | "Other";
  notes: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("health_records").insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    herd_id: herdId,
    date: data.date,
    treatment_type: data.treatment_type,
    notes: data.notes,
  });

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/herds/${herdId}`);
  return { success: true };
}

export async function updateHealthRecord(id: string, herdId: string, data: {
  date: string;
  treatment_type: "Vaccination" | "Drenching" | "Parasite Treatment" | "Other";
  notes: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("health_records").update({
    date: data.date,
    treatment_type: data.treatment_type,
    notes: data.notes,
  }).eq("id", id).eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/herds/${herdId}`);
  return { success: true };
}

export async function deleteHealthRecord(id: string, herdId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("health_records").update({
    is_deleted: true,
    deleted_at: new Date().toISOString(),
  }).eq("id", id).eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/herds/${herdId}`);
  return { success: true };
}
