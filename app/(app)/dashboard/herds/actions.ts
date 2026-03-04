"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createHerd(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("herd_groups").insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    name: formData.get("name") as string,
    species: formData.get("species") as "Cattle" | "Sheep" | "Pig" | "Goat",
    breed: formData.get("breed") as string,
    sex: formData.get("sex") as "Male" | "Female",
    category: formData.get("category") as string,
    age_months: Number(formData.get("age_months")) || 0,
    head_count: Number(formData.get("head_count")) || 1,
    initial_weight: Number(formData.get("initial_weight")) || 0,
    current_weight: Number(formData.get("current_weight")) || 0,
    daily_weight_gain: Number(formData.get("daily_weight_gain")) || 0,
    is_breeder: formData.get("is_breeder") === "on",
    is_pregnant: formData.get("is_pregnant") === "on",
    joined_date: (formData.get("joined_date") as string) || null,
    calving_rate: Number(formData.get("calving_rate")) || 85,
    lactation_status: (formData.get("lactation_status") as string) || null,
    breeding_program_type:
      (formData.get("breeding_program_type") as
        | "ai"
        | "controlled"
        | "uncontrolled") || null,
    selected_saleyard:
      (formData.get("selected_saleyard") as string) || null,
    market_category: (formData.get("market_category") as string) || null,
    paddock_name: (formData.get("paddock_name") as string) || null,
    property_id: (formData.get("property_id") as string) || null,
    notes: (formData.get("notes") as string) || null,
    animal_id_number:
      (formData.get("animal_id_number") as string) || null,
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

  const { error } = await supabase
    .from("herd_groups")
    .update({
      name: formData.get("name") as string,
      species: formData.get("species") as
        | "Cattle"
        | "Sheep"
        | "Pig"
        | "Goat",
      breed: formData.get("breed") as string,
      sex: formData.get("sex") as "Male" | "Female",
      category: formData.get("category") as string,
      age_months: Number(formData.get("age_months")) || 0,
      head_count: Number(formData.get("head_count")) || 1,
      initial_weight: Number(formData.get("initial_weight")) || 0,
      current_weight: Number(formData.get("current_weight")) || 0,
      daily_weight_gain: Number(formData.get("daily_weight_gain")) || 0,
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
      market_category: (formData.get("market_category") as string) || null,
      paddock_name: (formData.get("paddock_name") as string) || null,
      property_id: (formData.get("property_id") as string) || null,
      notes: (formData.get("notes") as string) || null,
      animal_id_number:
        (formData.get("animal_id_number") as string) || null,
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
    .from("herd_groups")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/herds");
  redirect("/dashboard/herds");
}
