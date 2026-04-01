"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Ensure the advisor has a single sandbox property. Creates one if missing.
// The property is invisible to the user; it exists to satisfy the herds FK.
export async function ensureSandboxProperty(): Promise<{ propertyId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Check for existing sandbox property
  const { data: existing } = await supabase
    .from("properties")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_simulated", true)
    .eq("is_deleted", false)
    .limit(1)
    .maybeSingle();

  if (existing) return { propertyId: existing.id };

  // Auto-create one
  const newId = randomUUID();
  const { error } = await supabase.from("properties").insert({
    id: newId,
    user_id: user.id,
    property_name: "Simulator Sandbox",
    is_simulated: true,
    is_default: false,
    state: "QLD",
    mortality_rate: 0.02,
    calving_rate: 0.85,
    freight_cost_per_km: 0,
  });

  if (error) {
    // Race condition: another tab may have created it simultaneously
    const { data: retry } = await supabase
      .from("properties")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_simulated", true)
      .eq("is_deleted", false)
      .limit(1)
      .maybeSingle();
    if (retry) return { propertyId: retry.id };
    return { error: error.message };
  }

  return { propertyId: newId };
}

// Delete a single sandbox herd
export async function deleteSandboxHerd(herdId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("herds")
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq("id", herdId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/advisor/simulator");
  return { success: true };
}

// Update a sandbox herd's editable fields
export async function updateSandboxHerd(
  herdId: string,
  updates: {
    name?: string;
    breed?: string;
    category?: string;
    sex?: string;
    head_count?: number;
    age_months?: number;
    initial_weight?: number;
    current_weight?: number;
    daily_weight_gain?: number;
    mortality_rate?: number | null;
    calving_rate?: number | null;
    is_breeder?: boolean;
    breeder_sub_type?: string | null;
    sub_category?: string | null;
    selected_saleyard?: string | null;
    paddock_name?: string | null;
    breed_premium_override?: number | null;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("herds")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", herdId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/advisor/simulator");
  return { success: true };
}

// Create a single sandbox herd on the sandbox property
export async function createSandboxHerd(
  propertyId: string,
  data: {
    name: string;
    species: string;
    breed: string;
    category: string;
    sex: string;
    head_count: number;
    age_months: number;
    initial_weight: number;
    daily_weight_gain: number;
    mortality_rate?: number;
    calving_rate?: number;
    breeder_sub_type?: string;
    selected_saleyard?: string;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify this is a simulated property owned by the user
  const { data: property } = await supabase
    .from("properties")
    .select("id, is_simulated")
    .eq("id", propertyId)
    .eq("user_id", user.id)
    .eq("is_simulated", true)
    .single();

  if (!property) return { error: "Sandbox property not found" };

  const isBreeder = data.category === "Breeder";

  const { error } = await supabase.from("herds").insert({
    id: randomUUID(),
    user_id: user.id,
    property_id: propertyId,
    name: data.name.trim(),
    species: data.species,
    breed: data.breed,
    category: data.category,
    sex: data.sex,
    head_count: data.head_count,
    age_months: data.age_months,
    initial_weight: data.initial_weight,
    current_weight: data.initial_weight,
    daily_weight_gain: data.daily_weight_gain,
    mortality_rate: data.mortality_rate ?? null,
    calving_rate: isBreeder ? (data.calving_rate ?? 0.85) : null,
    is_breeder: isBreeder,
    breeder_sub_type: isBreeder ? (data.breeder_sub_type ?? "Cow") : null,
    sub_category: data.category === "Dry Cow" ? "Cows" : null,
    selected_saleyard: data.selected_saleyard ?? null,
    use_creation_date_for_weight: false,
    is_sold: false,
    is_deleted: false,
    is_demo_data: false,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/advisor/simulator");
  return { success: true };
}

// Shared helpers for FormData-based herd creation (matches herds/actions.ts schema)
function deriveSexFromCategory(category: string): "Male" | "Female" {
  if (category === "Steer" || category === "Bull") return "Male";
  if (category === "Heifer" || category === "Breeder" || category === "Dry Cow") return "Female";
  const MALE_KEYWORDS = ["Bull", "Steer", "Barrow", "Buck", "Wether"];
  return MALE_KEYWORDS.some((k) => category.includes(k)) ? "Male" : "Female";
}

const emptyToNull = z.string().transform((v) => (v === "" ? null : v));
const optionalString = emptyToNull.nullable().optional();
const optionalEnum = <T extends [string, ...string[]]>(values: T) =>
  emptyToNull.nullable().optional().pipe(z.enum(values).nullable().optional());

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
  calving_rate: z.coerce.number().min(0).max(100).optional(),
  breeding_program_type: optionalEnum(["ai", "controlled", "uncontrolled"]),
  joining_period_start: optionalString,
  joining_period_end: optionalString,
  selected_saleyard: optionalString,
  paddock_name: optionalString,
  property_id: emptyToNull.nullable().optional().pipe(z.string().uuid().nullable().optional()),
  additional_info: optionalString,
  breed_premium_override: optionalString,
  sub_category: optionalString,
  breeder_sub_type: optionalString,
  calf_weight_recorded_date: optionalString,
});

// FormData-based herd creation for the Simulator add herd form.
// Uses the same schema and insert logic as the producer createHerd action,
// but redirects back to the Simulator page.
export async function createSimulatorHerdFromForm(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = herdFormSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
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
  const isBreeder = v.category === "Breeder" || v.category === "Dry Cow";

  const herdId = randomUUID();
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
    joined_date: (() => {
      if (!isBreeder) return null;
      const prog = v.breeding_program_type;
      if ((prog === "ai" || prog === "controlled") && v.joining_period_start && v.joining_period_end) {
        const start = new Date(v.joining_period_start).getTime();
        const end = new Date(v.joining_period_end).getTime();
        return new Date((start + end) / 2).toISOString().split("T")[0];
      }
      return null;
    })(),
    joining_period_start: (isBreeder && (v.breeding_program_type === "ai" || v.breeding_program_type === "controlled")) ? (v.joining_period_start || null) : null,
    joining_period_end: (isBreeder && (v.breeding_program_type === "ai" || v.breeding_program_type === "controlled")) ? (v.joining_period_end || null) : null,
    selected_saleyard: v.selected_saleyard || null,
    paddock_name: v.paddock_name || null,
    property_id: v.property_id || null,
    additional_info: v.additional_info || null,
    calf_weight_recorded_date: v.calf_weight_recorded_date || null,
    breed_premium_override: breedPremiumOverride,
    sub_category: v.sub_category || null,
    breeder_sub_type: v.breeder_sub_type || null,
    is_sold: false,
    is_deleted: false,
    is_demo_data: false,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/advisor/simulator");
  redirect("/dashboard/advisor/simulator");
}

// FormData-based herd update for the Simulator edit page.
// Same schema as createSimulatorHerdFromForm but updates an existing herd.
export async function updateSimulatorHerd(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = herdFormSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
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
  const isBreeder = v.category === "Breeder" || v.category === "Dry Cow";

  const { error } = await supabase
    .from("herds")
    .update({
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
      joined_date: (() => {
        if (!isBreeder) return null;
        const prog = v.breeding_program_type;
        if ((prog === "ai" || prog === "controlled") && v.joining_period_start && v.joining_period_end) {
          const start = new Date(v.joining_period_start).getTime();
          const end = new Date(v.joining_period_end).getTime();
          return new Date((start + end) / 2).toISOString().split("T")[0];
        }
        return null;
      })(),
      joining_period_start: (isBreeder && (v.breeding_program_type === "ai" || v.breeding_program_type === "controlled")) ? (v.joining_period_start || null) : null,
      joining_period_end: (isBreeder && (v.breeding_program_type === "ai" || v.breeding_program_type === "controlled")) ? (v.joining_period_end || null) : null,
      selected_saleyard: v.selected_saleyard || null,
      paddock_name: v.paddock_name || null,
      property_id: v.property_id || null,
      additional_info: v.additional_info || null,
      calf_weight_recorded_date: v.calf_weight_recorded_date || null,
      breed_premium_override: breedPremiumOverride,
      sub_category: v.sub_category || null,
      breeder_sub_type: v.breeder_sub_type || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/advisor/simulator");
  revalidatePath(`/dashboard/advisor/simulator/herd/${id}`);
  redirect(`/dashboard/advisor/simulator/herd/${id}`);
}
