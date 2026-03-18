"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();
const herdIdSchema = z.string().uuid();

// -- Muster Records --

const musterDataSchema = z.object({
  date: z.string().min(1),
  total_head_count: z.number().int().min(0).nullable(),
  cattle_yard: z.string().nullable(),
  weaners_count: z.number().int().min(0).nullable(),
  branders_count: z.number().int().min(0).nullable(),
  notes: z.string().nullable(),
});

export async function createMusterRecord(herdId: string, data: {
  date: string;
  total_head_count: number | null;
  cattle_yard: string | null;
  weaners_count: number | null;
  branders_count: number | null;
  notes: string | null;
}) {
  const herdIdResult = herdIdSchema.safeParse(herdId);
  if (!herdIdResult.success) return { error: "Invalid input" };

  const parsed = musterDataSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const v = parsed.data;
  const { error } = await supabase.from("muster_records").insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    herd_id: herdIdResult.data,
    date: v.date,
    total_head_count: v.total_head_count,
    cattle_yard: v.cattle_yard,
    weaners_count: v.weaners_count,
    branders_count: v.branders_count,
    notes: v.notes,
  });

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/herds/${herdIdResult.data}`);
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
  const idResult = idSchema.safeParse(id);
  if (!idResult.success) return { error: "Invalid input" };

  const herdIdResult = herdIdSchema.safeParse(herdId);
  if (!herdIdResult.success) return { error: "Invalid input" };

  const parsed = musterDataSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const v = parsed.data;
  const { error } = await supabase.from("muster_records").update({
    date: v.date,
    total_head_count: v.total_head_count,
    cattle_yard: v.cattle_yard,
    weaners_count: v.weaners_count,
    branders_count: v.branders_count,
    notes: v.notes,
  }).eq("id", idResult.data).eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/herds/${herdIdResult.data}`);
  return { success: true };
}

export async function deleteMusterRecord(id: string, herdId: string) {
  const idResult = idSchema.safeParse(id);
  if (!idResult.success) return { error: "Invalid input" };

  const herdIdResult = herdIdSchema.safeParse(herdId);
  if (!herdIdResult.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("muster_records").update({
    is_deleted: true,
    deleted_at: new Date().toISOString(),
  }).eq("id", idResult.data).eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/herds/${herdIdResult.data}`);
  return { success: true };
}

// -- Health Records --

const healthDataSchema = z.object({
  date: z.string().min(1),
  treatment_type: z.enum(["Vaccination", "Drenching", "Parasite Treatment", "Other"]),
  notes: z.string().nullable(),
});

export async function createHealthRecord(herdId: string, data: {
  date: string;
  treatment_type: "Vaccination" | "Drenching" | "Parasite Treatment" | "Other";
  notes: string | null;
}) {
  const herdIdResult = herdIdSchema.safeParse(herdId);
  if (!herdIdResult.success) return { error: "Invalid input" };

  const parsed = healthDataSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const v = parsed.data;
  const { error } = await supabase.from("health_records").insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    herd_id: herdIdResult.data,
    date: v.date,
    treatment_type: v.treatment_type,
    notes: v.notes,
  });

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/herds/${herdIdResult.data}`);
  return { success: true };
}

export async function updateHealthRecord(id: string, herdId: string, data: {
  date: string;
  treatment_type: "Vaccination" | "Drenching" | "Parasite Treatment" | "Other";
  notes: string | null;
}) {
  const idResult = idSchema.safeParse(id);
  if (!idResult.success) return { error: "Invalid input" };

  const herdIdResult = herdIdSchema.safeParse(herdId);
  if (!herdIdResult.success) return { error: "Invalid input" };

  const parsed = healthDataSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const v = parsed.data;
  const { error } = await supabase.from("health_records").update({
    date: v.date,
    treatment_type: v.treatment_type,
    notes: v.notes,
  }).eq("id", idResult.data).eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/herds/${herdIdResult.data}`);
  return { success: true };
}

export async function deleteHealthRecord(id: string, herdId: string) {
  const idResult = idSchema.safeParse(id);
  if (!idResult.success) return { error: "Invalid input" };

  const herdIdResult = herdIdSchema.safeParse(herdId);
  if (!herdIdResult.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("health_records").update({
    is_deleted: true,
    deleted_at: new Date().toISOString(),
  }).eq("id", idResult.data).eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/herds/${herdIdResult.data}`);
  return { success: true };
}
