"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();
const herdIdSchema = z.string().uuid();
const photoPathsSchema = z
  .array(z.string().min(1).max(512))
  .max(5)
  .default([]);
const RECORD_PHOTO_BUCKET = "record-photos";

// -- Muster Records --

const musterDataSchema = z.object({
  date: z.string().min(1),
  total_head_count: z.number().int().min(0).nullable(),
  cattle_yard: z.string().nullable(),
  weaners_count: z.number().int().min(0).nullable(),
  branders_count: z.number().int().min(0).nullable(),
  notes: z.string().nullable(),
  photo_paths: photoPathsSchema,
});

const musterCreateSchema = musterDataSchema.extend({
  id: z.string().uuid(),
});

export async function createMusterRecord(herdId: string, data: {
  id: string;
  date: string;
  total_head_count: number | null;
  cattle_yard: string | null;
  weaners_count: number | null;
  branders_count: number | null;
  notes: string | null;
  photo_paths: string[];
}) {
  const herdIdResult = herdIdSchema.safeParse(herdId);
  if (!herdIdResult.success) return { error: "Invalid input" };

  const parsed = musterCreateSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const v = parsed.data;
  if (!photoPathsBelongToUser(v.photo_paths, user.id)) {
    return { error: "Invalid photo path" };
  }

  const { error } = await supabase.from("muster_records").insert({
    id: v.id,
    user_id: user.id,
    herd_id: herdIdResult.data,
    date: v.date,
    total_head_count: v.total_head_count,
    cattle_yard: v.cattle_yard,
    weaners_count: v.weaners_count,
    branders_count: v.branders_count,
    notes: v.notes,
    photo_paths: v.photo_paths,
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
  photo_paths: string[];
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
  if (!photoPathsBelongToUser(v.photo_paths, user.id)) {
    return { error: "Invalid photo path" };
  }

  // Reap storage objects that the user removed in the form so we don't accumulate orphans.
  const { data: existing } = await supabase
    .from("muster_records")
    .select("photo_paths")
    .eq("id", idResult.data)
    .eq("user_id", user.id)
    .maybeSingle();
  const previous: string[] = existing?.photo_paths ?? [];
  const removed = previous.filter((p) => !v.photo_paths.includes(p));
  if (removed.length > 0) {
    void supabase.storage.from(RECORD_PHOTO_BUCKET).remove(removed);
  }

  const { error } = await supabase.from("muster_records").update({
    date: v.date,
    total_head_count: v.total_head_count,
    cattle_yard: v.cattle_yard,
    weaners_count: v.weaners_count,
    branders_count: v.branders_count,
    notes: v.notes,
    photo_paths: v.photo_paths,
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
  photo_paths: photoPathsSchema,
});

const healthCreateSchema = healthDataSchema.extend({
  id: z.string().uuid(),
});

export async function createHealthRecord(herdId: string, data: {
  id: string;
  date: string;
  treatment_type: "Vaccination" | "Drenching" | "Parasite Treatment" | "Other";
  notes: string | null;
  photo_paths: string[];
}) {
  const herdIdResult = herdIdSchema.safeParse(herdId);
  if (!herdIdResult.success) return { error: "Invalid input" };

  const parsed = healthCreateSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const v = parsed.data;
  if (!photoPathsBelongToUser(v.photo_paths, user.id)) {
    return { error: "Invalid photo path" };
  }

  const { error } = await supabase.from("health_records").insert({
    id: v.id,
    user_id: user.id,
    herd_id: herdIdResult.data,
    date: v.date,
    treatment_type: v.treatment_type,
    notes: v.notes,
    photo_paths: v.photo_paths,
  });

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/herds/${herdIdResult.data}`);
  return { success: true };
}

export async function updateHealthRecord(id: string, herdId: string, data: {
  date: string;
  treatment_type: "Vaccination" | "Drenching" | "Parasite Treatment" | "Other";
  notes: string | null;
  photo_paths: string[];
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
  if (!photoPathsBelongToUser(v.photo_paths, user.id)) {
    return { error: "Invalid photo path" };
  }

  const { data: existing } = await supabase
    .from("health_records")
    .select("photo_paths")
    .eq("id", idResult.data)
    .eq("user_id", user.id)
    .maybeSingle();
  const previous: string[] = existing?.photo_paths ?? [];
  const removed = previous.filter((p) => !v.photo_paths.includes(p));
  if (removed.length > 0) {
    void supabase.storage.from(RECORD_PHOTO_BUCKET).remove(removed);
  }

  const { error } = await supabase.from("health_records").update({
    date: v.date,
    treatment_type: v.treatment_type,
    notes: v.notes,
    photo_paths: v.photo_paths,
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

// Storage RLS already prevents cross-user access, but we double-check the path
// prefix server-side so a tampered client can't sneak someone else's path into
// our DB rows.
function photoPathsBelongToUser(paths: string[], userId: string): boolean {
  return paths.every((p) => p.startsWith(`${userId}/`));
}
