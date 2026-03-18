"use server";

import { z } from "zod";
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

const sellHerdSchema = z.object({
  herdId: z.string().uuid(),
  headCount: z.number().int().min(1),
  pricingType: z.enum(["per_kg", "per_head"]),
  pricePerKg: z.number().min(0),
  pricePerHead: z.number().min(0).nullable(),
  averageWeight: z.number().min(0),
  saleType: z.string().nullable(),
  saleLocation: z.string().nullable(),
  saleDate: z.string().min(1),
  freightCost: z.number().min(0),
  freightDistance: z.number().min(0),
  notes: z.string().nullable(),
  totalGrossValue: z.number().min(0),
  netValue: z.number(),
  isFullSale: z.boolean(),
});

export async function sellHerd(data: SellHerdData) {
  const parsed = sellHerdSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid input" };

  const v = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify herd belongs to user and is not already sold
  const { data: herd, error: fetchError } = await supabase
    .from("herds")
    .select("id, head_count, is_sold, is_demo_data")
    .eq("id", v.herdId)
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .single();

  if (fetchError || !herd) return { error: "Herd not found" };
  if (herd.is_sold) return { error: "This herd has already been sold" };
  if (v.headCount > herd.head_count) {
    return { error: "Cannot sell more head than available in herd" };
  }

  const now = new Date().toISOString();

  // Create sales record
  const { error: salesError } = await supabase.from("sales_records").insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    herd_id: v.herdId,
    sale_date: v.saleDate,
    head_count: v.headCount,
    average_weight: v.averageWeight,
    price_per_kg: v.pricePerKg,
    price_per_head: v.pricePerHead,
    pricing_type: v.pricingType,
    sale_type: v.saleType,
    sale_location: v.saleLocation,
    total_gross_value: v.totalGrossValue,
    freight_cost: v.freightCost,
    freight_distance: v.freightDistance,
    net_value: v.netValue,
    notes: v.notes,
    is_demo_data: herd.is_demo_data ?? false,
  });

  if (salesError) return { error: salesError.message };

  // Update herd: full sale marks as sold, partial reduces head count
  if (v.isFullSale) {
    const { error: updateError } = await supabase
      .from("herds")
      .update({
        is_sold: true,
        sold_date: v.saleDate,
        sold_price: v.pricePerKg,
        updated_at: now,
      })
      .eq("id", v.herdId)
      .eq("user_id", user.id);

    if (updateError) return { error: updateError.message };
  } else {
    const newHeadCount = herd.head_count - v.headCount;
    const { error: updateError } = await supabase
      .from("herds")
      .update({
        head_count: newHeadCount,
        updated_at: now,
      })
      .eq("id", v.herdId)
      .eq("user_id", user.id);

    if (updateError) return { error: updateError.message };
  }

  revalidatePath("/dashboard/herds");
  revalidatePath(`/dashboard/herds/${v.herdId}`);
  revalidatePath("/dashboard");

  if (v.isFullSale) {
    redirect("/dashboard/herds/sold");
  } else {
    redirect(`/dashboard/herds/${v.herdId}`);
  }
}
