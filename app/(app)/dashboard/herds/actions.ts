"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Debug: Master categories (Steer, Bull = Male; Heifer, Breeder, Dry Cow = Female)
function deriveSexFromCategory(category: string): "Male" | "Female" {
  if (category === "Steer" || category === "Bull") return "Male";
  if (category === "Heifer" || category === "Breeder" || category === "Dry Cow") return "Female";
  // Legacy fallback for non-master categories
  const MALE_KEYWORDS = ["Bull", "Steer", "Barrow", "Buck", "Wether"];
  return MALE_KEYWORDS.some((k) => category.includes(k)) ? "Male" : "Female";
}

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
  breeding_program_type: z.enum(["ai", "controlled", "uncontrolled"]).optional().nullable(),
  joining_period_start: z.string().optional().nullable(),
  joining_period_end: z.string().optional().nullable(),
  joined_date: z.string().optional().nullable(),
  selected_saleyard: z.string().optional().nullable(),
  paddock_name: z.string().optional().nullable(),
  property_id: z.string().uuid().optional().nullable(),
  additional_info: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  animal_id_number: z.string().optional().nullable(),
  breed_premium_override: z.string().optional().nullable(),
  lactation_status: z.string().optional().nullable(),
  sub_category: z.string().optional().nullable(),
  breeder_sub_type: z.string().optional().nullable(),
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
  if (!parsed.success) return { error: "Invalid input" };

  const v = parsed.data;
  const sex = deriveSexFromCategory(v.category);
  const breedPremiumOverride = v.breed_premium_override
    ? parseFloat(v.breed_premium_override)
    : null;
  const isBreeder = v.is_breeder === "on";

  const { error } = await supabase.from("herds").insert({
    id: crypto.randomUUID(),
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
    calving_rate: isBreeder ? (v.calving_rate ?? 50) : 85,
    breeding_program_type: isBreeder ? (v.breeding_program_type ?? null) : null,
    joining_period_start: v.joining_period_start || null,
    joining_period_end: v.joining_period_end || null,
    selected_saleyard: v.selected_saleyard || null,
    paddock_name: v.paddock_name || null,
    property_id: v.property_id || null,
    additional_info: v.additional_info || null,
    breed_premium_override: breedPremiumOverride,
    sub_category: v.sub_category || null,
    breeder_sub_type: v.breeder_sub_type || null,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/herds");
  redirect("/dashboard/herds");
}

export async function updateHerd(id: string, formData: FormData) {
  const idResult = idSchema.safeParse(id);
  if (!idResult.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = herdFormSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid input" };

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
      calving_rate: v.calving_rate ?? 85,
      lactation_status: v.lactation_status || null,
      breeding_program_type: v.breeding_program_type || null,
      selected_saleyard: v.selected_saleyard || null,
      paddock_name: v.paddock_name || null,
      property_id: v.property_id || null,
      notes: v.notes || null,
      animal_id_number: v.animal_id_number || null,
      breed_premium_override: updatePremiumOverride,
      updated_at: new Date().toISOString(),
    })
    .eq("id", idResult.data)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/herds");
  revalidatePath(`/dashboard/herds/${idResult.data}`);
  redirect(`/dashboard/herds/${idResult.data}`);
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
