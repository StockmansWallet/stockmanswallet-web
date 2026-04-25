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
  // Form field "on" when the primary toggle is checked, undefined otherwise.
  is_primary: z.literal("on").optional(),
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

  // Determine if this should become the primary property.
  // First non-deleted property is auto-promoted; otherwise honour the form toggle.
  const { count: existingCount } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .eq("is_simulated", false);

  const isFirstProperty = (existingCount ?? 0) === 0;
  const wantsPrimary = v.is_primary === "on";
  const shouldBePrimary = isFirstProperty || wantsPrimary;

  // If promoting an existing user from non-primary to primary on insert,
  // unset any existing primary first to satisfy the partial unique index.
  if (shouldBePrimary && !isFirstProperty) {
    await supabase
      .from("properties")
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_default", true)
      .eq("is_deleted", false);
  }

  const { error } = await supabase.from("properties").insert({
    id: randomUUID(),
    user_id: user.id,
    property_name: v.property_name,
    state: v.state,
    property_pic: v.property_pic || null,
    region: v.region || null,
    lga: v.lga || null,
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
    is_default: shouldBePrimary,
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
  const wantsPrimary = v.is_primary === "on";

  // Promotion to primary requires unsetting the existing primary first
  // (partial unique index forbids two is_default=true rows per user).
  if (wantsPrimary) {
    await supabase
      .from("properties")
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_default", true)
      .eq("is_deleted", false)
      .neq("id", idResult.data);
  }

  const updatePayload: Record<string, unknown> = {
    property_name: v.property_name,
    state: v.state,
    property_pic: v.property_pic || null,
    region: v.region || null,
    lga: v.lga || null,
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
  };
  if (wantsPrimary) {
    updatePayload.is_default = true;
  }

  const { error } = await supabase
    .from("properties")
    .update(updatePayload)
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

  // Read whether this row is currently primary so we can promote a fallback after delete.
  const { data: target } = await supabase
    .from("properties")
    .select("is_default")
    .eq("id", idResult.data)
    .eq("user_id", user.id)
    .single();

  const now = new Date().toISOString();

  // Soft-delete first AND clear is_default in the same update so the
  // partial unique index allows a fallback to be promoted in the next step.
  const { error } = await supabase
    .from("properties")
    .update({ is_deleted: true, deleted_at: now, updated_at: now, is_default: false })
    .eq("id", idResult.data)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  if (target?.is_default) {
    const { data: fallback } = await supabase
      .from("properties")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .eq("is_simulated", false)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (fallback?.id) {
      await supabase
        .from("properties")
        .update({ is_default: true, updated_at: now })
        .eq("id", fallback.id)
        .eq("user_id", user.id);
    }
  }

  revalidatePath("/dashboard/properties");
  redirect("/dashboard/properties");
}
