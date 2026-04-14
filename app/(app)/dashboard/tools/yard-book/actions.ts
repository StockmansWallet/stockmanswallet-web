"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveJoinedDate } from "@/lib/data/breeding";

const yardBookItemSchema = z.object({
  title: z.string().min(1).max(200),
  event_date: z.string().min(1).max(30),
  is_all_day: z.boolean(),
  event_time: z.string().max(10).nullable(),
  category: z.enum(["Livestock", "Operations", "Finance", "Family", "Me"]).default("Livestock"),
  notes: z.string().max(2000).nullable(),
  is_recurring: z.boolean(),
  recurrence_rule: z.enum(["Weekly", "Fortnightly", "Monthly", "Annual"]).nullable(),
  recurrence_interval: z.number().int().positive().nullable(),
  reminder_offsets: z.array(z.number().int()).nullable(),
  linked_herd_ids: z.array(z.string().uuid()).nullable(),
  property_id: z.string().uuid().nullable(),
});

const yardBookIdSchema = z.object({
  id: z.string().uuid(),
});

const toggleCompleteSchema = z.object({
  id: z.string().uuid(),
  isCompleted: z.boolean(),
});

// event_time column is timestamptz - convert "HH:MM" from <input type="time"> to full ISO timestamp
function parseEventTime(time: string | null): string | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export async function createYardBookItem(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const reminderOffsetsRaw = formData.get("reminder_offsets") as string;
  const linkedHerdIdsRaw = formData.get("linked_herd_ids") as string;
  const eventTime = formData.get("event_time") as string;

  let reminderOffsets: number[] | null = null;
  let linkedHerdIds: string[] | null = null;
  try {
    if (reminderOffsetsRaw) reminderOffsets = JSON.parse(reminderOffsetsRaw);
  } catch { /* ignore */ }
  try {
    if (linkedHerdIdsRaw) linkedHerdIds = JSON.parse(linkedHerdIdsRaw);
  } catch { /* ignore */ }

  const parsed = yardBookItemSchema.safeParse({
    title: formData.get("title"),
    event_date: formData.get("event_date"),
    is_all_day: formData.get("is_all_day") === "on",
    event_time: eventTime || null,
    category: formData.get("category") || "Livestock",
    notes: (formData.get("notes") as string) || null,
    is_recurring: formData.get("is_recurring") === "on",
    recurrence_rule: (formData.get("recurrence_rule") as string) || null,
    recurrence_interval: formData.get("recurrence_interval")
      ? Number(formData.get("recurrence_interval"))
      : null,
    reminder_offsets: reminderOffsets,
    linked_herd_ids: linkedHerdIds,
    property_id: (formData.get("property_id") as string) || null,
  });
  if (!parsed.success) return { error: "Invalid input" };

  const v = parsed.data;

  const { error } = await supabase.from("yard_book_items").insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    title: v.title,
    event_date: v.event_date,
    is_all_day: v.is_all_day,
    event_time: parseEventTime(v.event_time),
    category_raw: v.category,
    notes: v.notes,
    is_recurring: v.is_recurring,
    recurrence_rule_raw: v.recurrence_rule,
    recurrence_interval: v.recurrence_interval,
    reminder_offsets: v.reminder_offsets,
    linked_herd_ids: v.linked_herd_ids,
    property_id: v.property_id,
    is_completed: false,
    notifications_scheduled: false,
    is_demo_data: false,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/tools/yard-book");
  redirect("/dashboard/tools/yard-book");
}

export async function updateYardBookItem(id: string, formData: FormData) {
  const idParsed = yardBookIdSchema.safeParse({ id });
  if (!idParsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const reminderOffsetsRaw = formData.get("reminder_offsets") as string;
  const linkedHerdIdsRaw = formData.get("linked_herd_ids") as string;
  const eventTime = formData.get("event_time") as string;

  let reminderOffsets: number[] | null = null;
  let linkedHerdIds: string[] | null = null;
  try {
    if (reminderOffsetsRaw) reminderOffsets = JSON.parse(reminderOffsetsRaw);
  } catch { /* ignore */ }
  try {
    if (linkedHerdIdsRaw) linkedHerdIds = JSON.parse(linkedHerdIdsRaw);
  } catch { /* ignore */ }

  const parsed = yardBookItemSchema.safeParse({
    title: formData.get("title"),
    event_date: formData.get("event_date"),
    is_all_day: formData.get("is_all_day") === "on",
    event_time: eventTime || null,
    category: formData.get("category") || "Livestock",
    notes: (formData.get("notes") as string) || null,
    is_recurring: formData.get("is_recurring") === "on",
    recurrence_rule: (formData.get("recurrence_rule") as string) || null,
    recurrence_interval: formData.get("recurrence_interval")
      ? Number(formData.get("recurrence_interval"))
      : null,
    reminder_offsets: reminderOffsets,
    linked_herd_ids: linkedHerdIds,
    property_id: (formData.get("property_id") as string) || null,
  });
  if (!parsed.success) return { error: "Invalid input" };

  const v = parsed.data;

  const { error } = await supabase
    .from("yard_book_items")
    .update({
      title: v.title,
      event_date: v.event_date,
      is_all_day: v.is_all_day,
      event_time: parseEventTime(v.event_time),
      category_raw: v.category,
      notes: v.notes,
      is_recurring: v.is_recurring,
      recurrence_rule_raw: v.recurrence_rule,
      recurrence_interval: v.recurrence_interval,
      reminder_offsets: v.reminder_offsets,
      linked_herd_ids: v.linked_herd_ids,
      property_id: v.property_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/tools/yard-book");
  revalidatePath(`/dashboard/tools/yard-book/${id}`);
  redirect(`/dashboard/tools/yard-book/${id}`);
}

export async function deleteYardBookItem(id: string) {
  const parsed = yardBookIdSchema.safeParse({ id });
  if (!parsed.success) return { error: "Invalid input" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("yard_book_items")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/tools/yard-book");
  redirect("/dashboard/tools/yard-book");
}

export async function toggleYardBookItemComplete(
  id: string,
  isCompleted: boolean
) {
  const parsed = toggleCompleteSchema.safeParse({ id, isCompleted });
  if (!parsed.success) return { error: "Invalid input" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("yard_book_items")
    .update({
      is_completed: isCompleted,
      completed_date: isCompleted ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/tools/yard-book");
  revalidatePath(`/dashboard/tools/yard-book/${id}`);
}

// MARK: - Breeding Milestone Auto-Creation
// Debug: Cattle gestation and pregnancy testing constants
const GESTATION_DAYS = 283;
const PREG_TEST_DAYS = 60;

// Debug: Adds days to a date string and returns ISO date string (yyyy-MM-dd)
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// Debug: Auto-create Yard Book breeding milestone items when herd joining dates are set.
// Uses packId "breeding-milestones-{herdId}" for grouping and deduplication.
// Delete-and-recreate strategy: soft-deletes uncompleted items, preserves completed ones.
export async function syncBreedingMilestonesForHerd(
  herdId: string,
  herd: {
    name: string;
    species: string;
    joined_date: string | null;
    joining_period_start: string | null;
    joining_period_end: string | null;
    breeding_program_type?: string | null;
    is_breeder: boolean;
    property_id: string | null;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const packId = `breeding-milestones-${herdId}`;

  // Step 1: Soft-delete existing uncompleted milestone items
  await supabase
    .from("yard_book_items")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("pack_id", packId)
    .eq("is_deleted", false)
    .eq("is_completed", false);

  // Step 2: Derive effective joined date (mirrors iOS Herd.effectiveJoinedDate)
  const effectiveJoinedDateObj = getEffectiveJoinedDate(herd);
  const effectiveJoinedDate = effectiveJoinedDateObj
    ? `${effectiveJoinedDateObj.getFullYear()}-${String(effectiveJoinedDateObj.getMonth() + 1).padStart(2, "0")}-${String(effectiveJoinedDateObj.getDate()).padStart(2, "0")}`
    : null;

  if (!herd.is_breeder || !effectiveJoinedDate) {
    revalidatePath("/dashboard/tools/yard-book");
    return;
  }

  // Step 3: Check which milestones are already completed (don't recreate those)
  const { data: completedItems } = await supabase
    .from("yard_book_items")
    .select("title")
    .eq("user_id", user.id)
    .eq("pack_id", packId)
    .eq("is_completed", true)
    .eq("is_deleted", false);

  const completedPrefixes = new Set(
    (completedItems ?? []).map((item) => {
      const dashIdx = item.title.indexOf(" - ");
      return dashIdx >= 0 ? item.title.substring(dashIdx + 3) : item.title;
    })
  );

  // Step 4: Build milestone items
  const now = new Date().toISOString();
  const today = now.split("T")[0];
  const items: Array<Record<string, unknown>> = [];

  // Milestone 1: Expected Calving (joinedDate + 283 days)
  if (!completedPrefixes.has("Expected Calving")) {
    const calvingDate = addDays(effectiveJoinedDate, GESTATION_DAYS);
    items.push({
      id: crypto.randomUUID(),
      user_id: user.id,
      title: `${herd.name} - Expected Calving`,
      event_date: calvingDate,
      is_all_day: true,
      category_raw: "Livestock",
      notes: `Auto-created from breeding data. Schedule calving preparations for ${herd.name}.`,
      reminder_offsets: [21, 7, 1, 0],
      linked_herd_ids: [herdId],
      property_id: herd.property_id,
      pack_id: packId,
      pack_item_index: 0,
      is_completed: false,
      notifications_scheduled: false,
      is_demo_data: false,
    });
  }

  // Milestone 2: Pregnancy Testing (joinedDate + 60 days)
  if (!completedPrefixes.has("Pregnancy Testing")) {
    const pregTestDate = addDays(effectiveJoinedDate, PREG_TEST_DAYS);
    items.push({
      id: crypto.randomUUID(),
      user_id: user.id,
      title: `${herd.name} - Pregnancy Testing`,
      event_date: pregTestDate,
      is_all_day: true,
      category_raw: "Operations",
      notes: `Auto-created from breeding data. Schedule pregnancy scanning for ${herd.name}.`,
      reminder_offsets: [7, 1],
      linked_herd_ids: [herdId],
      property_id: herd.property_id,
      pack_id: packId,
      pack_item_index: 1,
      is_completed: false,
      notifications_scheduled: false,
      is_demo_data: false,
    });
  }

  // Breeding-type-specific titles for period start/end milestones
  const isAI = herd.breeding_program_type === "ai";
  const startTitle = isAI ? "Insemination Started" : "Put Bulls In";
  const endTitle = isAI ? "Insemination Complete" : "Pull Bulls Out";
  const startNote = isAI ? "Insemination program begins." : "Bulls put in with herd.";
  const endNote = isAI ? "Insemination program complete." : "Bulls pulled out of herd.";

  // Milestone 3: Period Start (only if set and in the future)
  // Also check legacy title "Joining Period Start" for completed items migration
  if (
    herd.joining_period_start &&
    herd.joining_period_start.split("T")[0] > today &&
    !completedPrefixes.has(startTitle) &&
    !completedPrefixes.has("Joining Period Start")
  ) {
    items.push({
      id: crypto.randomUUID(),
      user_id: user.id,
      title: `${herd.name} - ${startTitle}`,
      event_date: herd.joining_period_start.split("T")[0],
      is_all_day: true,
      category_raw: "Livestock",
      notes: `Auto-created from breeding data. ${startNote}`,
      reminder_offsets: [7, 1],
      linked_herd_ids: [herdId],
      property_id: herd.property_id,
      pack_id: packId,
      pack_item_index: 2,
      is_completed: false,
      notifications_scheduled: false,
      is_demo_data: false,
    });
  }

  // Milestone 4: Period End (only if set and in the future)
  // Also check legacy title "Joining Period End" for completed items migration
  if (
    herd.joining_period_end &&
    herd.joining_period_end.split("T")[0] > today &&
    !completedPrefixes.has(endTitle) &&
    !completedPrefixes.has("Joining Period End")
  ) {
    items.push({
      id: crypto.randomUUID(),
      user_id: user.id,
      title: `${herd.name} - ${endTitle}`,
      event_date: herd.joining_period_end.split("T")[0],
      is_all_day: true,
      category_raw: "Livestock",
      notes: `Auto-created from breeding data. ${endNote}`,
      reminder_offsets: [7, 1],
      linked_herd_ids: [herdId],
      property_id: herd.property_id,
      pack_id: packId,
      pack_item_index: 3,
      is_completed: false,
      notifications_scheduled: false,
      is_demo_data: false,
    });
  }

  // Step 5: Batch insert
  if (items.length > 0) {
    await supabase.from("yard_book_items").insert(items);
  }

  revalidatePath("/dashboard/tools/yard-book");
}
