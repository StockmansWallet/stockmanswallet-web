"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  const { error } = await supabase.from("yard_book_items").insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    title: formData.get("title") as string,
    event_date: formData.get("event_date") as string,
    is_all_day: formData.get("is_all_day") === "on",
    event_time: parseEventTime(eventTime),
    category_raw:
      (formData.get("category") as
        | "Livestock"
        | "Operations"
        | "Finance"
        | "Family"
        | "Me") || "Livestock",
    notes: (formData.get("notes") as string) || null,
    is_recurring: formData.get("is_recurring") === "on",
    recurrence_rule_raw:
      (formData.get("recurrence_rule") as
        | "Weekly"
        | "Fortnightly"
        | "Monthly"
        | "Annual") || null,
    recurrence_interval: formData.get("recurrence_interval")
      ? Number(formData.get("recurrence_interval"))
      : null,
    reminder_offsets: reminderOffsetsRaw
      ? JSON.parse(reminderOffsetsRaw)
      : null,
    linked_herd_ids: linkedHerdIdsRaw
      ? JSON.parse(linkedHerdIdsRaw)
      : null,
    property_id: (formData.get("property_id") as string) || null,
    is_completed: false,
    notifications_scheduled: false,
    is_demo_data: false,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/tools/yard-book");
  redirect("/dashboard/tools/yard-book");
}

export async function updateYardBookItem(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const reminderOffsetsRaw = formData.get("reminder_offsets") as string;
  const linkedHerdIdsRaw = formData.get("linked_herd_ids") as string;
  const eventTime = formData.get("event_time") as string;

  const { error } = await supabase
    .from("yard_book_items")
    .update({
      title: formData.get("title") as string,
      event_date: formData.get("event_date") as string,
      is_all_day: formData.get("is_all_day") === "on",
      event_time: parseEventTime(eventTime),
      category_raw:
        (formData.get("category") as
          | "Livestock"
          | "Operations"
          | "Finance"
          | "Family"
          | "Me") || "Livestock",
      notes: (formData.get("notes") as string) || null,
      is_recurring: formData.get("is_recurring") === "on",
      recurrence_rule_raw:
        (formData.get("recurrence_rule") as
          | "Weekly"
          | "Fortnightly"
          | "Monthly"
          | "Annual") || null,
      recurrence_interval: formData.get("recurrence_interval")
        ? Number(formData.get("recurrence_interval"))
        : null,
      reminder_offsets: reminderOffsetsRaw
        ? JSON.parse(reminderOffsetsRaw)
        : null,
      linked_herd_ids: linkedHerdIdsRaw
        ? JSON.parse(linkedHerdIdsRaw)
        : null,
      property_id: (formData.get("property_id") as string) || null,
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
