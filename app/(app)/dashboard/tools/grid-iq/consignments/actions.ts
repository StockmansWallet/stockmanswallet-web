"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const allocationItemSchema = z.object({
  herdGroupId: z.string().uuid(),
  headCount: z.number().int().positive(),
  category: z.string().max(100).optional().default(""),
});

const createConsignmentSchema = z.object({
  consignmentName: z.string().max(200).nullable(),
  processorName: z.string().min(1, "Processor name is required").max(200),
  plantLocation: z.string().max(200).nullable(),
  bookingReference: z.string().max(100).nullable(),
  killDate: z.string().max(30).nullable(),
  gridId: z.string().uuid().nullable(),
  notes: z.string().max(2000).nullable(),
  allocations: z.array(allocationItemSchema).min(1, "At least one herd allocation is required"),
});

const consignmentIdSchema = z.object({
  consignmentId: z.string().uuid(),
});

const linkKillSheetSchema = z.object({
  consignmentId: z.string().uuid(),
  killSheetId: z.string().uuid(),
});

const updateConsignmentSchema = z.object({
  consignmentId: z.string().uuid(),
  consignmentName: z.string().max(200).nullable(),
  processorName: z.string().max(200).nullable(),
  plantLocation: z.string().max(200).nullable(),
  bookingReference: z.string().max(100).nullable(),
  killDate: z.string().max(30).nullable(),
  notes: z.string().max(2000).nullable(),
  allocations: z.array(allocationItemSchema).min(1, "At least one herd allocation is required"),
});

// Create a new consignment with herd allocations
export async function createConsignment(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const consignmentName = (formData.get("consignmentName") as string) || null;
  const processorName = formData.get("processorName") as string;
  const plantLocation = (formData.get("plantLocation") as string) || null;
  const bookingReference = (formData.get("bookingReference") as string) || null;
  const killDate = (formData.get("killDate") as string) || null;
  const gridId = (formData.get("gridId") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const allocationsJSON = formData.get("allocations") as string;

  let allocations: { herdGroupId: string; headCount: number; category: string }[];
  try {
    allocations = JSON.parse(allocationsJSON || "[]");
  } catch {
    return { error: "Invalid allocations data" };
  }

  const parsed = createConsignmentSchema.safeParse({
    consignmentName,
    processorName,
    plantLocation,
    bookingReference,
    killDate,
    gridId,
    notes,
    allocations,
  });
  if (!parsed.success) return { error: "Invalid input" };

  if (allocations.length === 0) return { error: "At least one herd allocation is required" };

  const totalHead = allocations.reduce((sum, a) => sum + a.headCount, 0);
  if (totalHead <= 0) return { error: "Total head count must be greater than zero" };

  // Validate head counts don't exceed herd availability. Batched with .in()
  // instead of N sequential round-trips.
  const herdIdsForValidation = allocations.map((a) => a.herdGroupId);
  const { data: herdsForValidation } = await supabase
    .from("herds")
    .select("id, head_count, name")
    .in("id", herdIdsForValidation)
    .eq("user_id", user.id)
    .eq("is_deleted", false);
  const herdMap = new Map((herdsForValidation ?? []).map((h) => [h.id, h]));
  for (const alloc of allocations) {
    const herd = herdMap.get(alloc.herdGroupId);
    if (!herd) return { error: `Herd not found: ${alloc.herdGroupId}` };
    if (alloc.headCount > (herd.head_count ?? 0)) {
      return { error: `Cannot allocate ${alloc.headCount} head from "${herd.name}" - only ${herd.head_count} available` };
    }
  }

  const consignmentId = crypto.randomUUID();

  // Insert consignment
  const { error: insertError } = await supabase.from("consignments").insert({
    id: consignmentId,
    user_id: user.id,
    consignment_name: consignmentName,
    processor_name: processorName,
    plant_location: plantLocation,
    booking_reference: bookingReference,
    kill_date: killDate || null,
    status: "draft",
    total_head_count: totalHead,
    processor_grid_id: gridId || null,
    notes,
  });

  if (insertError) return { error: `Failed to create consignment: ${insertError.message}` };

  // Insert allocations
  const allocationRows = allocations.map((a) => ({
    consignment_id: consignmentId,
    herd_id: a.herdGroupId,
    head_count: a.headCount,
    category: a.category || null,
  }));

  const { error: allocError } = await supabase
    .from("consignment_allocations")
    .insert(allocationRows);

  if (allocError) return { error: `Failed to create allocations: ${allocError.message}` };

  revalidatePath("/dashboard/tools/grid-iq");
  return { consignmentId };
}

// Link a kill sheet to a consignment
export async function linkKillSheet(consignmentId: string, killSheetId: string) {
  const parsed = linkKillSheetSchema.safeParse({ consignmentId, killSheetId });
  if (!parsed.success) return { error: "Invalid input" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("consignments")
    .update({ kill_sheet_record_id: killSheetId })
    .eq("id", consignmentId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  // Also update the kill sheet to reference the consignment
  await supabase
    .from("kill_sheet_records")
    .update({ consignment_id: consignmentId })
    .eq("id", killSheetId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard/tools/grid-iq");
  return { success: true };
}

// Complete a consignment - deduct head from herds, create sales records
export async function completeSale(consignmentId: string) {
  const parsed = consignmentIdSchema.safeParse({ consignmentId });
  if (!parsed.success) return { error: "Invalid input" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch consignment with allocations
  const { data: consignment } = await supabase
    .from("consignments")
    .select("*, processor_grid_id, kill_sheet_record_id")
    .eq("id", consignmentId)
    .eq("user_id", user.id)
    .single();

  if (!consignment) return { error: "Consignment not found" };
  if (consignment.status === "completed") return { error: "Consignment already completed" };

  const { data: allocations } = await supabase
    .from("consignment_allocations")
    .select("*")
    .eq("consignment_id", consignmentId);

  if (!allocations?.length) return { error: "No allocations found for this consignment" };

  // Fetch kill sheet for revenue data (if linked)
  let totalRevenue = 0;
  let avgPricePerKg = 0;
  if (consignment.kill_sheet_record_id) {
    const { data: ks } = await supabase
      .from("kill_sheet_records")
      .select("total_gross_value, total_body_weight, average_price_per_kg")
      .eq("id", consignment.kill_sheet_record_id)
      .single();
    if (ks) {
      totalRevenue = ks.total_gross_value ?? 0;
      avgPricePerKg = ks.average_price_per_kg ?? (ks.total_body_weight > 0 ? ks.total_gross_value / ks.total_body_weight : 0);
    }
  }

  const totalHeadInConsignment = allocations.reduce((sum, a) => sum + a.head_count, 0);

  // Batch-read every allocated herd up front so per-allocation processing
  // doesn't need its own round-trip.
  const allocHerdIds = allocations.map((a) => a.herd_id);
  const { data: allocHerds } = await supabase
    .from("herds")
    .select("id, head_count, current_weight, name")
    .in("id", allocHerdIds)
    .eq("user_id", user.id)
    .eq("is_deleted", false);
  const allocHerdMap = new Map((allocHerds ?? []).map((h) => [h.id, h]));

  const nowIso = new Date().toISOString();
  const killDateIso = consignment.kill_date || nowIso;
  const herdUpdates: Array<{ id: string; update: Record<string, unknown> }> = [];
  const saleRows: Record<string, unknown>[] = [];

  for (const alloc of allocations) {
    const herd = allocHerdMap.get(alloc.herd_id);
    if (!herd) continue;

    const remainingHead = (herd.head_count ?? 0) - alloc.head_count;
    const herdUpdate: Record<string, unknown> = {
      head_count: Math.max(0, remainingHead),
    };
    if (remainingHead <= 0) {
      herdUpdate.is_sold = true;
      herdUpdate.sold_date = killDateIso;
    }
    herdUpdates.push({ id: alloc.herd_id, update: herdUpdate });

    const headRatio = totalHeadInConsignment > 0 ? alloc.head_count / totalHeadInConsignment : 0;
    const proratedRevenue = Math.round(totalRevenue * headRatio);

    saleRows.push({
      id: crypto.randomUUID(),
      user_id: user.id,
      herd_id: alloc.herd_id,
      sale_date: killDateIso,
      head_count: alloc.head_count,
      average_weight: alloc.average_weight ?? herd.current_weight ?? 0,
      price_per_kg: avgPricePerKg,
      pricing_type: "per_kg",
      sale_type: "Over-the-Hooks",
      sale_location: consignment.plant_location || consignment.processor_name,
      total_gross_value: proratedRevenue,
      freight_cost: 0,
      freight_distance: 0,
      net_value: proratedRevenue,
      consignment_id: consignmentId,
      notes: `Consignment: ${consignment.booking_reference || consignment.processor_name}`,
    });
  }

  // Fan out herd updates in parallel (each update is per-row so can't be batched in one statement).
  await Promise.all(
    herdUpdates.map((h) =>
      supabase.from("herds").update(h.update).eq("id", h.id).eq("user_id", user.id),
    ),
  );
  if (saleRows.length > 0) {
    await supabase.from("sales_records").insert(saleRows);
  }

  // Update consignment status
  await supabase
    .from("consignments")
    .update({
      status: "completed",
      total_gross_value: totalRevenue,
      total_net_value: totalRevenue,
    })
    .eq("id", consignmentId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard/tools/grid-iq");
  revalidatePath("/dashboard/portfolio");
  revalidatePath("/dashboard");
  return { success: true };
}

// Update an existing consignment - replaces allocations and metadata
export async function updateConsignment(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const consignmentId = formData.get("consignmentId") as string;
  const consignmentName = formData.get("consignmentName") as string | null;
  const processorName = (formData.get("processorName") as string) || null;
  const plantLocation = (formData.get("plantLocation") as string) || null;
  const bookingReference = (formData.get("bookingReference") as string) || null;
  const killDate = (formData.get("killDate") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const allocationsJSON = formData.get("allocations") as string;

  let allocations: { herdGroupId: string; headCount: number; category: string }[];
  try {
    allocations = JSON.parse(allocationsJSON || "[]");
  } catch {
    return { error: "Invalid allocations data" };
  }

  const parsed = updateConsignmentSchema.safeParse({
    consignmentId,
    consignmentName,
    processorName,
    plantLocation,
    bookingReference,
    killDate,
    notes,
    allocations,
  });
  if (!parsed.success) return { error: "Invalid input" };

  // Verify consignment exists and is editable
  const { data: existing } = await supabase
    .from("consignments")
    .select("id, status")
    .eq("id", consignmentId)
    .eq("user_id", user.id)
    .single();
  if (!existing) return { error: "Consignment not found" };
  if (existing.status === "completed") return { error: "Cannot edit a completed consignment" };

  const totalHead = allocations.reduce((sum, a) => sum + a.headCount, 0);
  if (totalHead <= 0) return { error: "Total head count must be greater than zero" };

  // Validate head counts. Batched with .in() instead of N sequential round-trips.
  const herdIdsForUpdate = allocations.map((a) => a.herdGroupId);
  const { data: herdsForUpdate } = await supabase
    .from("herds")
    .select("id, head_count, name")
    .in("id", herdIdsForUpdate)
    .eq("user_id", user.id)
    .eq("is_deleted", false);
  const herdMapForUpdate = new Map((herdsForUpdate ?? []).map((h) => [h.id, h]));
  for (const alloc of allocations) {
    const herd = herdMapForUpdate.get(alloc.herdGroupId);
    if (!herd) return { error: `Herd not found: ${alloc.herdGroupId}` };
    if (alloc.headCount > (herd.head_count ?? 0)) {
      return { error: `Cannot allocate ${alloc.headCount} head from "${herd.name}" - only ${herd.head_count} available` };
    }
  }

  // Update consignment metadata
  const updateData: Record<string, unknown> = {
    total_head_count: totalHead,
    updated_at: new Date().toISOString(),
  };
  if (consignmentName !== null) updateData.consignment_name = consignmentName || null;
  if (processorName) updateData.processor_name = processorName;
  if (plantLocation !== null) updateData.plant_location = plantLocation;
  if (bookingReference !== null) updateData.booking_reference = bookingReference;
  if (killDate !== null) updateData.kill_date = killDate || null;
  if (notes !== null) updateData.notes = notes;

  await supabase
    .from("consignments")
    .update(updateData)
    .eq("id", consignmentId)
    .eq("user_id", user.id);

  // Replace allocations. Consignment ownership verified above, so deleting
  // allocations scoped to consignment_id is safe under the existing RLS.
  await supabase.from("consignment_allocations").delete().eq("consignment_id", consignmentId);
  const allocationRows = allocations.map((a) => ({
    consignment_id: consignmentId,
    herd_id: a.herdGroupId,
    head_count: a.headCount,
    category: a.category || null,
  }));
  await supabase.from("consignment_allocations").insert(allocationRows);

  revalidatePath("/dashboard/tools/grid-iq");
  return { success: true, consignmentId };
}

// Delete (soft) a consignment
export async function deleteConsignment(consignmentId: string) {
  const parsed = consignmentIdSchema.safeParse({ consignmentId });
  if (!parsed.success) return { error: "Invalid input" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("consignments")
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq("id", consignmentId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/tools/grid-iq");
  return { success: true };
}
