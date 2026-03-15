"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface SellHerdData {
  herdId: string;
  headCount: number;
  pricingType: "per_kg" | "per_head";
  pricePerKg: number;
  pricePerHead: number | null;
  averageWeight: number;
  saleType: string | null;
  saleLocation: string | null;
  saleDate: string;
  freightCost: number;
  freightDistance: number;
  notes: string | null;
  totalGrossValue: number;
  netValue: number;
  isFullSale: boolean;
}

export async function sellHerd(data: SellHerdData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify herd belongs to user and is not already sold
  const { data: herd, error: fetchError } = await supabase
    .from("herd_groups")
    .select("id, head_count, is_sold, is_demo_data")
    .eq("id", data.herdId)
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .single();

  if (fetchError || !herd) return { error: "Herd not found" };
  if (herd.is_sold) return { error: "This herd has already been sold" };
  if (data.headCount > herd.head_count) {
    return { error: "Cannot sell more head than available in herd" };
  }

  const now = new Date().toISOString();

  // Create sales record
  const { error: salesError } = await supabase.from("sales_records").insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    herd_group_id: data.herdId,
    sale_date: data.saleDate,
    head_count: data.headCount,
    average_weight: data.averageWeight,
    price_per_kg: data.pricePerKg,
    price_per_head: data.pricePerHead,
    pricing_type: data.pricingType,
    sale_type: data.saleType,
    sale_location: data.saleLocation,
    total_gross_value: data.totalGrossValue,
    freight_cost: data.freightCost,
    freight_distance: data.freightDistance,
    net_value: data.netValue,
    notes: data.notes,
    is_demo_data: herd.is_demo_data ?? false,
  });

  if (salesError) return { error: salesError.message };

  // Update herd: full sale marks as sold, partial reduces head count
  if (data.isFullSale) {
    const { error: updateError } = await supabase
      .from("herd_groups")
      .update({
        is_sold: true,
        sold_date: data.saleDate,
        sold_price: data.pricePerKg,
        updated_at: now,
      })
      .eq("id", data.herdId)
      .eq("user_id", user.id);

    if (updateError) return { error: updateError.message };
  } else {
    const newHeadCount = herd.head_count - data.headCount;
    const { error: updateError } = await supabase
      .from("herd_groups")
      .update({
        head_count: newHeadCount,
        updated_at: now,
      })
      .eq("id", data.herdId)
      .eq("user_id", user.id);

    if (updateError) return { error: updateError.message };
  }

  revalidatePath("/dashboard/herds");
  revalidatePath(`/dashboard/herds/${data.herdId}`);
  revalidatePath("/dashboard");

  if (data.isFullSale) {
    redirect("/dashboard/herds/sold");
  } else {
    redirect(`/dashboard/herds/${data.herdId}`);
  }
}
