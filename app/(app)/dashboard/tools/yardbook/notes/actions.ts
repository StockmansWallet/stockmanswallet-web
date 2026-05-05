"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const yardbookNoteSchema = z.object({
  title: z.string().max(200),
  body: z.string().max(20000),
  is_pinned: z.boolean(),
  linked_herd_ids: z.array(z.string().uuid()).nullable(),
  attachment_file_ids: z.array(z.string().uuid()).nullable(),
  property_id: z.string().uuid().nullable(),
});

const idSchema = z.object({ id: z.string().uuid() });

function parseHerdIds(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function parseUuidArray(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export async function createYardbookNote(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = yardbookNoteSchema.safeParse({
    title: ((formData.get("title") as string) || "").trim(),
    body: ((formData.get("body") as string) || "").trim(),
    is_pinned: formData.get("is_pinned") === "on",
    linked_herd_ids: parseHerdIds(formData.get("linked_herd_ids") as string | null),
    attachment_file_ids: parseUuidArray(formData.get("attachment_file_ids") as string | null),
    property_id: (formData.get("property_id") as string) || null,
  });
  if (!parsed.success) return { error: "Invalid input" };

  const v = parsed.data;
  // Note must have either title or body
  if (!v.title && !v.body) return { error: "Add a title or some text first." };

  const { error } = await supabase.from("yard_book_notes").insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    title: v.title,
    body: v.body,
    is_pinned: v.is_pinned,
    linked_herd_ids: v.linked_herd_ids,
    attachment_file_ids: v.attachment_file_ids,
    property_id: v.property_id,
    is_demo_data: false,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/tools/yardbook");
  redirect("/dashboard/tools/yardbook?tab=notes");
}

export async function updateYardbookNote(id: string, formData: FormData) {
  const idParsed = idSchema.safeParse({ id });
  if (!idParsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = yardbookNoteSchema.safeParse({
    title: ((formData.get("title") as string) || "").trim(),
    body: ((formData.get("body") as string) || "").trim(),
    is_pinned: formData.get("is_pinned") === "on",
    linked_herd_ids: parseHerdIds(formData.get("linked_herd_ids") as string | null),
    attachment_file_ids: parseUuidArray(formData.get("attachment_file_ids") as string | null),
    property_id: (formData.get("property_id") as string) || null,
  });
  if (!parsed.success) return { error: "Invalid input" };

  const v = parsed.data;
  if (!v.title && !v.body) return { error: "Add a title or some text first." };

  const { error } = await supabase
    .from("yard_book_notes")
    .update({
      title: v.title,
      body: v.body,
      is_pinned: v.is_pinned,
      linked_herd_ids: v.linked_herd_ids,
      attachment_file_ids: v.attachment_file_ids,
      property_id: v.property_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/tools/yardbook");
  revalidatePath(`/dashboard/tools/yardbook/notes/${id}/edit`);
  redirect("/dashboard/tools/yardbook?tab=notes");
}

export async function deleteYardbookNote(id: string) {
  const parsed = idSchema.safeParse({ id });
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("yard_book_notes")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/tools/yardbook");
  redirect("/dashboard/tools/yardbook?tab=notes");
}

export async function toggleYardbookNotePin(id: string, isPinned: boolean) {
  const parsed = idSchema.safeParse({ id });
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("yard_book_notes")
    .update({
      is_pinned: isPinned,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/tools/yardbook");
  return { success: true };
}
