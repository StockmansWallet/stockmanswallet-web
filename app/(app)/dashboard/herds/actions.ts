"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const MALE_KEYWORDS = ["Bull", "Steer", "Barrow", "Buck", "Wether"];

function deriveSexFromCategory(category: string): "Male" | "Female" {
  return MALE_KEYWORDS.some((k) => category.includes(k)) ? "Male" : "Female";
}

export async function createHerd(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const category = formData.get("category") as string;
  const sex = deriveSexFromCategory(category);
  const breedPremiumRaw = formData.get("breed_premium_override") as string;
  const breedPremiumOverride = breedPremiumRaw ? parseFloat(breedPremiumRaw) : null;

  const isBreeder = formData.get("is_breeder") === "on";

  const { error } = await supabase.from("herds").insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    name: formData.get("name") as string,
    species: formData.get("species") as "Cattle" | "Sheep" | "Pig" | "Goat",
    breed: formData.get("breed") as string,
    sex,
    category,
    age_months: Number(formData.get("age_months")) || 0,
    head_count: Number(formData.get("head_count")) || 1,
    initial_weight: Number(formData.get("initial_weight")) || 0,
    current_weight: Number(formData.get("current_weight")) || Number(formData.get("initial_weight")) || 0,
    daily_weight_gain: Number(formData.get("daily_weight_gain")) || 0,
    mortality_rate: (Number(formData.get("mortality_rate")) || 0) / 100,
    is_breeder: isBreeder,
    calving_rate: isBreeder ? (Number(formData.get("calving_rate")) || 50) : 85,
    breeding_program_type: isBreeder
      ? ((formData.get("breeding_program_type") as "ai" | "controlled" | "uncontrolled") || null)
      : null,
    joining_period_start: (formData.get("joining_period_start") as string) || null,
    joining_period_end: (formData.get("joining_period_end") as string) || null,
    selected_saleyard: (formData.get("selected_saleyard") as string) || null,
    paddock_name: (formData.get("paddock_name") as string) || null,
    property_id: (formData.get("property_id") as string) || null,
    additional_info: (formData.get("additional_info") as string) || null,
    breed_premium_override: breedPremiumOverride,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/herds");
  redirect("/dashboard/herds");
}

export async function updateHerd(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const updateCategory = formData.get("category") as string;
  const updateSex = deriveSexFromCategory(updateCategory);
  const updatePremiumRaw = formData.get("breed_premium_override") as string;
  const updatePremiumOverride = updatePremiumRaw ? parseFloat(updatePremiumRaw) : null;

  const { error } = await supabase
    .from("herds")
    .update({
      name: formData.get("name") as string,
      species: formData.get("species") as
        | "Cattle"
        | "Sheep"
        | "Pig"
        | "Goat",
      breed: formData.get("breed") as string,
      sex: updateSex,
      category: updateCategory,
      age_months: Number(formData.get("age_months")) || 0,
      head_count: Number(formData.get("head_count")) || 1,
      initial_weight: Number(formData.get("initial_weight")) || 0,
      current_weight: Number(formData.get("current_weight")) || Number(formData.get("initial_weight")) || 0,
      daily_weight_gain: Number(formData.get("daily_weight_gain")) || 0,
      mortality_rate: (Number(formData.get("mortality_rate")) || 0) / 100,
      is_breeder: formData.get("is_breeder") === "on",
      is_pregnant: formData.get("is_pregnant") === "on",
      joined_date: (formData.get("joined_date") as string) || null,
      calving_rate: Number(formData.get("calving_rate")) || 85,
      lactation_status:
        (formData.get("lactation_status") as string) || null,
      breeding_program_type:
        (formData.get("breeding_program_type") as
          | "ai"
          | "controlled"
          | "uncontrolled") || null,
      selected_saleyard:
        (formData.get("selected_saleyard") as string) || null,
      paddock_name: (formData.get("paddock_name") as string) || null,
      property_id: (formData.get("property_id") as string) || null,
      notes: (formData.get("notes") as string) || null,
      animal_id_number:
        (formData.get("animal_id_number") as string) || null,
      breed_premium_override: updatePremiumOverride,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/herds");
  revalidatePath(`/dashboard/herds/${id}`);
  redirect(`/dashboard/herds/${id}`);
}

export async function deleteHerd(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("herds")
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/herds");
  redirect("/dashboard/herds");
}
