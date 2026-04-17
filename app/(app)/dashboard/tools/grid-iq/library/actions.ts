"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const idListSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
});

async function softDelete(table: "processor_grids" | "kill_sheet_records", ids: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from(table)
    .update({ is_deleted: true, deleted_at: now })
    .in("id", ids)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/tools/grid-iq/library");
  return { success: true as const };
}

export async function bulkDeleteProcessorGrids(rawIds: unknown) {
  const parsed = idListSchema.safeParse({ ids: rawIds });
  if (!parsed.success) return { error: "Invalid selection" };
  return softDelete("processor_grids", parsed.data.ids);
}

export async function bulkDeleteKillSheets(rawIds: unknown) {
  const parsed = idListSchema.safeParse({ ids: rawIds });
  if (!parsed.success) return { error: "Invalid selection" };
  return softDelete("kill_sheet_records", parsed.data.ids);
}
