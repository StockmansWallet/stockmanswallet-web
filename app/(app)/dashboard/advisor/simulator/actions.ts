"use server";

import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Create a new sandbox property for the advisor
export async function createSandboxProperty(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Property name is required" };

  const { error } = await supabase.from("properties").insert({
    id: randomUUID(),
    user_id: user.id,
    property_name: trimmed,
    is_simulated: true,
    is_default: false,
    state: "QLD",
    mortality_rate: 0.02,
    calving_rate: 0.85,
    freight_cost_per_km: 0,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/advisor/simulator");
  return { success: true };
}

// Delete a sandbox property and all its herds
export async function deleteSandboxProperty(propertyId: string) {
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

  // Soft-delete all herds on this property
  await supabase
    .from("herds")
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq("property_id", propertyId)
    .eq("user_id", user.id);

  // Soft-delete the property
  const { error } = await supabase
    .from("properties")
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq("id", propertyId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/advisor/simulator");
  return { success: true };
}

// Duplicate a connected client's herds into a new sandbox property
export async function duplicateClientHerds(
  clientUserId: string,
  sandboxName: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const trimmed = sandboxName.trim();
  if (!trimmed) return { error: "Sandbox name is required" };

  // Fetch client herds via RPC (checks permission inside)
  const { data: clientHerds, error: rpcError } = await supabase.rpc(
    "get_client_herds_for_advisor",
    { p_client_user_id: clientUserId }
  );

  if (rpcError) return { error: rpcError.message };
  if (!clientHerds || clientHerds.length === 0) {
    return { error: "No herds found for this client" };
  }

  // Create the sandbox property
  const propertyId = randomUUID();
  const { data: newProperty, error: propError } = await supabase
    .from("properties")
    .insert({
      id: propertyId,
      user_id: user.id,
      property_name: trimmed,
      is_simulated: true,
      is_default: false,
      state: "QLD",
      mortality_rate: 0.02,
      calving_rate: 0.85,
      freight_cost_per_km: 0,
    })
    .select("id")
    .single();

  if (propError || !newProperty) {
    return { error: propError?.message ?? "Failed to create sandbox property" };
  }

  // Clone each herd into the sandbox property (new UUID for each)
  const clonedHerds = clientHerds.map(
    (h: Record<string, unknown>) => ({
      id: randomUUID(),
      user_id: user.id,
      name: h.name,
      species: h.species,
      breed: h.breed,
      sex: h.sex,
      category: h.category,
      age_months: h.age_months,
      head_count: h.head_count,
      initial_weight: h.initial_weight,
      current_weight: h.current_weight,
      daily_weight_gain: h.daily_weight_gain,
      dwg_change_date: h.dwg_change_date,
      previous_dwg: h.previous_dwg,
      use_creation_date_for_weight: h.use_creation_date_for_weight ?? false,
      is_breeder: h.is_breeder ?? false,
      is_pregnant: h.is_pregnant ?? false,
      joined_date: h.joined_date,
      calving_rate: h.calving_rate ?? 0.85,
      lactation_status: h.lactation_status,
      breeding_program_type: h.breeding_program_type,
      joining_period_start: h.joining_period_start,
      joining_period_end: h.joining_period_end,
      selected_saleyard: h.selected_saleyard,
      sub_category: h.sub_category,
      breeder_sub_type: h.breeder_sub_type,
      paddock_name: h.paddock_name,
      breed_premium_override: h.breed_premium_override,
      additional_info: h.additional_info,
      notes: h.notes,
      mortality_rate: h.mortality_rate,
      property_id: newProperty.id,
      is_sold: false,
      is_deleted: false,
      is_demo_data: false,
    })
  );

  const { error: insertError } = await supabase
    .from("herds")
    .insert(clonedHerds);

  if (insertError) return { error: insertError.message };

  revalidatePath("/dashboard/advisor/simulator");
  return { success: true, propertyId: newProperty.id, herdCount: clonedHerds.length };
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
    head_count?: number;
    current_weight?: number;
    daily_weight_gain?: number;
    mortality_rate?: number | null;
    calving_rate?: number;
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

// Create a single sandbox herd on a sandbox property
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

// Fetch preview of client herds (count + total head)
export async function fetchClientHerdPreview(clientUserId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: herds, error } = await supabase.rpc(
    "get_client_herds_for_advisor",
    { p_client_user_id: clientUserId }
  );

  if (error) return { error: error.message };

  const herdList = (herds ?? []) as { head_count: number }[];
  return {
    herdCount: herdList.length,
    totalHead: herdList.reduce((sum, h) => sum + (h.head_count || 0), 0),
  };
}
