"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const propertyFormSchema = z.object({
  property_name: z.string().min(1),
  state: z.string().min(1),
  property_pic: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  lga: z.string().optional().nullable(),
  livestock_owner: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  suburb: z.string().optional().nullable(),
  postcode: z.string().optional().nullable(),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  acreage: z.coerce.number().min(0).optional().nullable(),
  property_type: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  default_saleyard: z.string().optional().nullable(),
  default_saleyard_distance: z.coerce.number().min(0).optional().nullable(),
  mortality_rate: z.coerce.number().min(0).max(100).optional().nullable(),
  calving_rate: z.coerce.number().min(0).max(100).optional().nullable(),
  freight_cost_per_km: z.coerce.number().min(0).optional().nullable(),
});

const idSchema = z.string().uuid();

function parsePropertyForm(formData: FormData) {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    // Treat empty strings as undefined so optional fields pass through
    raw[key] = value === "" ? undefined : value;
  }
  return propertyFormSchema.safeParse(raw);
}

export async function createProperty(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const parsed = parsePropertyForm(formData);
  if (!parsed.success) return { error: "Invalid input" };

  const v = parsed.data;

  const { error } = await supabase.from("properties").insert({
    id: randomUUID(),
    user_id: user.id,
    property_name: v.property_name,
    state: v.state,
    property_pic: v.property_pic || null,
    region: v.region || null,
    lga: v.lga || null,
    livestock_owner: v.livestock_owner || null,
    address: v.address || null,
    suburb: v.suburb || null,
    postcode: v.postcode || null,
    latitude: v.latitude ?? null,
    longitude: v.longitude ?? null,
    acreage: v.acreage ?? null,
    property_type: v.property_type || null,
    notes: v.notes || null,
    default_saleyard: v.default_saleyard || null,
    default_saleyard_distance: v.default_saleyard_distance ?? null,
    mortality_rate: v.mortality_rate ?? 2,
    calving_rate: (v.calving_rate ?? 85) / 100,
    freight_cost_per_km: v.freight_cost_per_km ?? 3,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/properties");
  redirect("/dashboard/properties");
}

export async function updateProperty(id: string, formData: FormData) {
  const idResult = idSchema.safeParse(id);
  if (!idResult.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const parsed = parsePropertyForm(formData);
  if (!parsed.success) return { error: "Invalid input" };

  const v = parsed.data;

  const { error } = await supabase
    .from("properties")
    .update({
      property_name: v.property_name,
      state: v.state,
      property_pic: v.property_pic || null,
      region: v.region || null,
      lga: v.lga || null,
      livestock_owner: v.livestock_owner || null,
      address: v.address || null,
      suburb: v.suburb || null,
      postcode: v.postcode || null,
      latitude: v.latitude ?? null,
      longitude: v.longitude ?? null,
      acreage: v.acreage ?? null,
      property_type: v.property_type || null,
      notes: v.notes || null,
      default_saleyard: v.default_saleyard || null,
      default_saleyard_distance: v.default_saleyard_distance ?? null,
      mortality_rate: v.mortality_rate ?? 2,
      calving_rate: (v.calving_rate ?? 85) / 100,
      freight_cost_per_km: v.freight_cost_per_km ?? 3,
      updated_at: new Date().toISOString(),
    })
    .eq("id", idResult.data)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/properties");
  revalidatePath(`/dashboard/properties/${idResult.data}`);
  redirect(`/dashboard/properties/${idResult.data}`);
}

export async function deleteProperty(id: string) {
  const idResult = idSchema.safeParse(id);
  if (!idResult.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("properties")
    .update({ is_deleted: true, deleted_at: now, updated_at: now })
    .eq("id", idResult.data)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/properties");
  redirect("/dashboard/properties");
}
