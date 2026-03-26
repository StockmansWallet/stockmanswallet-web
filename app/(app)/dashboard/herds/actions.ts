"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { syncBreedingMilestonesForHerd } from "@/app/(app)/dashboard/tools/yard-book/actions";

// Debug: Master categories (Steer, Bull = Male; Heifer, Breeder, Dry Cow = Female)
function deriveSexFromCategory(category: string): "Male" | "Female" {
  if (category === "Steer" || category === "Bull") return "Male";
  if (category === "Heifer" || category === "Breeder" || category === "Dry Cow") return "Female";
  // Legacy fallback for non-master categories
  const MALE_KEYWORDS = ["Bull", "Steer", "Barrow", "Buck", "Wether"];
  return MALE_KEYWORDS.some((k) => category.includes(k)) ? "Male" : "Female";
}

// Debug: Helper to treat empty strings from form inputs as null.
// HTML form elements always submit strings, so optional fields send "" not null.
const emptyToNull = z.string().transform((v) => (v === "" ? null : v));
const optionalString = emptyToNull.nullable().optional();
const optionalEnum = <T extends [string, ...string[]]>(values: T) =>
  emptyToNull
    .nullable()
    .optional()
    .pipe(z.enum(values).nullable().optional());

const herdFormSchema = z.object({
  name: z.string().min(1),
  species: z.enum(["Cattle", "Sheep", "Pig", "Goat"]),
  breed: z.string().min(1),
  category: z.string().min(1),
  age_months: z.coerce.number().int().min(0).default(0),
  head_count: z.coerce.number().int().min(1).default(1),
  initial_weight: z.coerce.number().min(0).default(0),
  current_weight: z.coerce.number().min(0).optional(),
  daily_weight_gain: z.coerce.number().min(0).default(0),
  mortality_rate: z.coerce.number().min(0).max(100).default(0),
  is_breeder: z.string().optional(),
  is_pregnant: z.string().optional(),
  calving_rate: z.coerce.number().min(0).max(100).optional(),
  breeding_program_type: optionalEnum(["ai", "controlled", "uncontrolled"]),
  joining_period_start: optionalString,
  joining_period_end: optionalString,
  joined_date: optionalString,
  selected_saleyard: optionalString,
  paddock_name: optionalString,
  property_id: emptyToNull.nullable().optional().pipe(z.string().uuid().nullable().optional()),
  additional_info: optionalString,
  notes: optionalString,
  animal_id_number: optionalString,
  breed_premium_override: optionalString,
  lactation_status: optionalString,
  sub_category: optionalString,
  breeder_sub_type: optionalString,
  calf_weight_recorded_date: optionalString,
});

const idSchema = z.string().uuid();

export async function createHerd(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = herdFormSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    console.error("createHerd validation failed:", JSON.stringify(fieldErrors));
    const details = Object.entries(fieldErrors)
      .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
      .join("; ");
    return { error: `Validation failed: ${details}` };
  }

  const v = parsed.data;
  const sex = deriveSexFromCategory(v.category);
  const breedPremiumOverride = v.breed_premium_override
    ? parseFloat(v.breed_premium_override)
    : null;
  const isBreeder = v.is_breeder === "on";

  const herdId = crypto.randomUUID();
  const { error } = await supabase.from("herds").insert({
    id: herdId,
    user_id: user.id,
    name: v.name,
    species: v.species,
    breed: v.breed,
    sex,
    category: v.category,
    age_months: v.age_months,
    head_count: v.head_count,
    initial_weight: v.initial_weight,
    current_weight: v.current_weight ?? v.initial_weight,
    daily_weight_gain: v.daily_weight_gain,
    mortality_rate: v.mortality_rate / 100,
    is_breeder: isBreeder,
    calving_rate: isBreeder ? (v.calving_rate ?? 50) / 100 : 0.85,
    breeding_program_type: isBreeder ? (v.breeding_program_type ?? null) : null,
    joined_date: v.joined_date || null,
    joining_period_start: v.joining_period_start || null,
    joining_period_end: v.joining_period_end || null,
    selected_saleyard: v.selected_saleyard || null,
    paddock_name: v.paddock_name || null,
    property_id: v.property_id || null,
    additional_info: v.additional_info || null,
    calf_weight_recorded_date: v.calf_weight_recorded_date || null,
    breed_premium_override: breedPremiumOverride,
    sub_category: v.sub_category || null,
    breeder_sub_type: v.breeder_sub_type || null,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  // Debug: Auto-create Yard Book breeding milestones for breeder herds with joining data
  const didCreateMilestones =
    isBreeder && !!(v.joining_period_start || v.joined_date);
  if (didCreateMilestones) {
    await syncBreedingMilestonesForHerd(herdId, {
      name: v.name,
      species: v.species,
      joined_date: v.joined_date || null,
      joining_period_start: v.joining_period_start || null,
      joining_period_end: v.joining_period_end || null,
      is_breeder: true,
      property_id: v.property_id || null,
    });
  }

  revalidatePath("/dashboard/herds");
  // Debug: Add yardbook flag so the herds page can show a confirmation banner
  redirect(
    didCreateMilestones
      ? "/dashboard/herds?yardbook=created"
      : "/dashboard/herds"
  );
}

export async function updateHerd(id: string, formData: FormData) {
  const idResult = idSchema.safeParse(id);
  if (!idResult.success) return { error: "Invalid herd ID" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = herdFormSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    console.error("updateHerd validation failed:", JSON.stringify(fieldErrors));
    const details = Object.entries(fieldErrors)
      .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
      .join("; ");
    return { error: `Validation failed: ${details}` };
  }

  const v = parsed.data;
  const updateSex = deriveSexFromCategory(v.category);
  const updatePremiumOverride = v.breed_premium_override
    ? parseFloat(v.breed_premium_override)
    : null;

  const { error } = await supabase
    .from("herds")
    .update({
      name: v.name,
      species: v.species,
      breed: v.breed,
      sex: updateSex,
      category: v.category,
      age_months: v.age_months,
      head_count: v.head_count,
      initial_weight: v.initial_weight,
      current_weight: v.current_weight ?? v.initial_weight,
      daily_weight_gain: v.daily_weight_gain,
      mortality_rate: v.mortality_rate / 100,
      is_breeder: v.is_breeder === "on",
      is_pregnant: v.is_pregnant === "on",
      joined_date: v.joined_date || null,
      calving_rate: (v.calving_rate ?? 85) / 100,
      lactation_status: v.lactation_status || null,
      breeding_program_type: v.breeding_program_type || null,
      joining_period_start: v.joining_period_start || null,
      joining_period_end: v.joining_period_end || null,
      selected_saleyard: v.selected_saleyard || null,
      paddock_name: v.paddock_name || null,
      property_id: v.property_id || null,
      additional_info: v.additional_info || null,
      calf_weight_recorded_date: v.calf_weight_recorded_date || null,
      notes: v.notes || null,
      animal_id_number: v.animal_id_number || null,
      breed_premium_override: updatePremiumOverride,
      sub_category: v.sub_category || null,
      breeder_sub_type: v.breeder_sub_type || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", idResult.data)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  // Debug: Sync breeding milestones (handles create, update, and removal when breeder status changes)
  const didSyncMilestones =
    v.is_breeder === "on" && !!(v.joining_period_start || v.joined_date);
  await syncBreedingMilestonesForHerd(idResult.data, {
    name: v.name,
    species: v.species,
    joined_date: v.joined_date || null,
    joining_period_start: v.joining_period_start || null,
    joining_period_end: v.joining_period_end || null,
    is_breeder: v.is_breeder === "on",
    property_id: v.property_id || null,
  });

  revalidatePath("/dashboard/herds");
  revalidatePath(`/dashboard/herds/${idResult.data}`);
  // Debug: Add yardbook flag so the detail page can show a confirmation banner
  redirect(
    didSyncMilestones
      ? `/dashboard/herds/${idResult.data}?yardbook=updated`
      : `/dashboard/herds/${idResult.data}`
  );
}

export async function deleteHerd(id: string) {
  const idResult = idSchema.safeParse(id);
  if (!idResult.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("herds")
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", idResult.data)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/herds");
  redirect("/dashboard/herds");
}

export async function deleteHerds(ids: string[]) {
  if (!ids.length || ids.length > 200) return { error: "Invalid input" };

  for (const id of ids) {
    if (!idSchema.safeParse(id).success) return { error: "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("herds")
    .update({ is_deleted: true, deleted_at: now, updated_at: now })
    .in("id", ids)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/herds");
  revalidatePath("/dashboard");
  return { success: true };
}
