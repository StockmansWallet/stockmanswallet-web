"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createProperty(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("properties").insert({
    id: randomUUID(),
    user_id: user.id,
    property_name: formData.get("property_name") as string,
    state: formData.get("state") as string,
    property_pic: (formData.get("property_pic") as string) || null,
    region: (formData.get("region") as string) || null,
    address: (formData.get("address") as string) || null,
    suburb: (formData.get("suburb") as string) || null,
    postcode: (formData.get("postcode") as string) || null,
    latitude: formData.get("latitude")
      ? Number(formData.get("latitude"))
      : null,
    longitude: formData.get("longitude")
      ? Number(formData.get("longitude"))
      : null,
    acreage: formData.get("acreage") ? Number(formData.get("acreage")) : null,
    property_type: (formData.get("property_type") as string) || null,
    notes: (formData.get("notes") as string) || null,
    default_saleyard: (formData.get("default_saleyard") as string) || null,
    default_saleyard_distance: formData.get("default_saleyard_distance")
      ? Number(formData.get("default_saleyard_distance"))
      : null,
    mortality_rate: formData.get("mortality_rate")
      ? Number(formData.get("mortality_rate"))
      : 2,
    calving_rate: formData.get("calving_rate")
      ? Number(formData.get("calving_rate"))
      : 85,
    freight_cost_per_km: formData.get("freight_cost_per_km")
      ? Number(formData.get("freight_cost_per_km"))
      : 3,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/properties");
  redirect("/dashboard/properties");
}

export async function updateProperty(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("properties")
    .update({
      property_name: formData.get("property_name") as string,
      state: formData.get("state") as string,
      property_pic: (formData.get("property_pic") as string) || null,
      region: (formData.get("region") as string) || null,
      address: (formData.get("address") as string) || null,
      suburb: (formData.get("suburb") as string) || null,
      postcode: (formData.get("postcode") as string) || null,
      latitude: formData.get("latitude")
        ? Number(formData.get("latitude"))
        : null,
      longitude: formData.get("longitude")
        ? Number(formData.get("longitude"))
        : null,
      acreage: formData.get("acreage")
        ? Number(formData.get("acreage"))
        : null,
      property_type: (formData.get("property_type") as string) || null,
      notes: (formData.get("notes") as string) || null,
      default_saleyard: (formData.get("default_saleyard") as string) || null,
      default_saleyard_distance: formData.get("default_saleyard_distance")
        ? Number(formData.get("default_saleyard_distance"))
        : null,
      mortality_rate: formData.get("mortality_rate")
        ? Number(formData.get("mortality_rate"))
        : 2,
      calving_rate: formData.get("calving_rate")
        ? Number(formData.get("calving_rate"))
        : 85,
      freight_cost_per_km: formData.get("freight_cost_per_km")
        ? Number(formData.get("freight_cost_per_km"))
        : 3,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/properties");
  revalidatePath(`/dashboard/properties/${id}`);
  redirect(`/dashboard/properties/${id}`);
}

export async function deleteProperty(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("properties")
    .update({ is_deleted: true, deleted_at: now, updated_at: now })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/properties");
  redirect("/dashboard/properties");
}
