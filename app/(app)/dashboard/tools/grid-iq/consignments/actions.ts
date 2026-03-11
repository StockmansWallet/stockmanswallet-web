"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  if (!processorName) return { error: "Processor name is required" };

  let allocations: { herdGroupId: string; headCount: number; category: string }[];
  try {
    allocations = JSON.parse(allocationsJSON || "[]");
  } catch {
    return { error: "Invalid allocations data" };
  }

  if (allocations.length === 0) return { error: "At least one herd allocation is required" };

  const totalHead = allocations.reduce((sum, a) => sum + a.headCount, 0);
  if (totalHead <= 0) return { error: "Total head count must be greater than zero" };

  // Validate head counts don't exceed herd availability
  for (const alloc of allocations) {
    const { data: herd } = await supabase
      .from("herd_groups")
      .select("head_count, name")
      .eq("id", alloc.herdGroupId)
      .eq("user_id", user.id)
      .single();
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
    herd_group_id: a.herdGroupId,
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

  // Process each allocation: deduct head, create sale record
  for (const alloc of allocations) {
    // Fetch current herd
    const { data: herd } = await supabase
      .from("herd_groups")
      .select("id, head_count, current_weight, name")
      .eq("id", alloc.herd_group_id)
      .eq("user_id", user.id)
      .single();

    if (!herd) continue;

    const remainingHead = (herd.head_count ?? 0) - alloc.head_count;

    // Deduct head from herd
    const herdUpdate: Record<string, unknown> = {
      head_count: Math.max(0, remainingHead),
    };
    // Mark as sold if all head gone
    if (remainingHead <= 0) {
      herdUpdate.is_sold = true;
      herdUpdate.sold_date = consignment.kill_date || new Date().toISOString();
    }

    await supabase
      .from("herd_groups")
      .update(herdUpdate)
      .eq("id", alloc.herd_group_id);

    // Create sale record with prorated values
    const headRatio = totalHeadInConsignment > 0 ? alloc.head_count / totalHeadInConsignment : 0;
    const proratedRevenue = Math.round(totalRevenue * headRatio);

    await supabase.from("sales_records").insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      herd_group_id: alloc.herd_group_id,
      sale_date: consignment.kill_date || new Date().toISOString(),
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

  // Update consignment status
  await supabase
    .from("consignments")
    .update({
      status: "completed",
      total_gross_value: totalRevenue,
      total_net_value: totalRevenue,
    })
    .eq("id", consignmentId);

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

  if (!consignmentId) return { error: "Consignment ID is required" };

  // Verify consignment exists and is editable
  const { data: existing } = await supabase
    .from("consignments")
    .select("id, status")
    .eq("id", consignmentId)
    .eq("user_id", user.id)
    .single();
  if (!existing) return { error: "Consignment not found" };
  if (existing.status === "completed") return { error: "Cannot edit a completed consignment" };

  let allocations: { herdGroupId: string; headCount: number; category: string }[];
  try {
    allocations = JSON.parse(allocationsJSON || "[]");
  } catch {
    return { error: "Invalid allocations data" };
  }
  if (allocations.length === 0) return { error: "At least one herd allocation is required" };

  const totalHead = allocations.reduce((sum, a) => sum + a.headCount, 0);
  if (totalHead <= 0) return { error: "Total head count must be greater than zero" };

  // Validate head counts
  for (const alloc of allocations) {
    const { data: herd } = await supabase
      .from("herd_groups")
      .select("head_count, name")
      .eq("id", alloc.herdGroupId)
      .eq("user_id", user.id)
      .single();
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

  await supabase.from("consignments").update(updateData).eq("id", consignmentId);

  // Replace allocations
  await supabase.from("consignment_allocations").delete().eq("consignment_id", consignmentId);
  const allocationRows = allocations.map((a) => ({
    consignment_id: consignmentId,
    herd_group_id: a.herdGroupId,
    head_count: a.headCount,
    category: a.category || null,
  }));
  await supabase.from("consignment_allocations").insert(allocationRows);

  revalidatePath("/dashboard/tools/grid-iq");
  return { success: true, consignmentId };
}

// Delete (soft) a consignment
export async function deleteConsignment(consignmentId: string) {
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
