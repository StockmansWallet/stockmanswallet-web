"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Shared schema for create/update. Threshold arrives from the form as a
// dollar-per-kg value (e.g. "4.25") and is converted to integer cents here.
const alertSchema = z.object({
  target_kind: z.enum(["category", "saleyard"]),
  target_name: z.string().min(1).max(200),
  state: z.string().max(10).optional().nullable(),
  comparator: z.enum(["above", "below"]),
  threshold_dollars: z
    .string()
    .min(1)
    .transform((v) => Number(v))
    .refine((n) => Number.isFinite(n) && n > 0, {
      message: "Threshold must be a positive number",
    }),
  note: z.string().max(500).optional().nullable(),
});

function parseForm(formData: FormData) {
  const rawState = formData.get("state");
  const rawNote = formData.get("note");
  return alertSchema.safeParse({
    target_kind: formData.get("target_kind"),
    target_name: formData.get("target_name"),
    state: rawState && String(rawState).length > 0 ? String(rawState) : null,
    comparator: formData.get("comparator"),
    threshold_dollars: formData.get("threshold_dollars"),
    note: rawNote && String(rawNote).length > 0 ? String(rawNote) : null,
  });
}

type AlertWriteFields = {
  target_kind: "category" | "saleyard";
  target_name: string;
  state: string | null;
  comparator: "above" | "below";
  threshold_cents: number;
  note: string | null;
};

function toWriteFields(parsed: z.infer<typeof alertSchema>): AlertWriteFields {
  // Prices are stored as cents in category_prices, so keep alert thresholds
  // in cents too. Round to the nearest cent.
  const thresholdCents = Math.round(parsed.threshold_dollars * 100);
  return {
    target_kind: parsed.target_kind,
    target_name: parsed.target_name,
    state: parsed.target_kind === "category" ? parsed.state ?? null : null,
    comparator: parsed.comparator,
    threshold_cents: thresholdCents,
    note: parsed.note ?? null,
  };
}

export async function createAlert(formData: FormData) {
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const fields = toWriteFields(parsed.data);

  const { error } = await supabase
    .from("market_price_alerts")
    .insert({ user_id: user.id, ...fields, is_active: true });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings/alerts");
  return { success: "Alert created." };
}

export async function updateAlert(id: string, formData: FormData) {
  if (!id) return { error: "Missing alert id" };

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const fields = toWriteFields(parsed.data);

  const { error } = await supabase
    .from("market_price_alerts")
    .update(fields)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings/alerts");
  return { success: "Alert updated." };
}

export async function deleteAlert(id: string) {
  if (!id) return { error: "Missing alert id" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("market_price_alerts")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings/alerts");
  return { success: "Alert deleted." };
}

export async function toggleAlert(id: string, active: boolean) {
  if (!id) return { error: "Missing alert id" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("market_price_alerts")
    .update({ is_active: active })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings/alerts");
  return { success: true };
}
