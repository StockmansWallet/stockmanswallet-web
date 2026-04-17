"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const processorInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  address: z.string().trim().max(500).nullable(),
  location_latitude: z
    .number()
    .refine((n) => n >= -90 && n <= 90, "Latitude out of range")
    .nullable(),
  location_longitude: z
    .number()
    .refine((n) => n >= -180 && n <= 180, "Longitude out of range")
    .nullable(),
  contact_name: z.string().trim().max(200).nullable(),
  contact_phone: z.string().trim().max(50).nullable(),
  contact_email: z.string().trim().max(200).nullable(),
  notes: z.string().trim().max(2000).nullable(),
});

type ProcessorInput = z.infer<typeof processorInputSchema>;

function parseNumeric(raw: FormDataEntryValue | null): number | null {
  if (raw === null) return null;
  const str = String(raw).trim();
  if (str === "") return null;
  const n = Number(str);
  return Number.isFinite(n) ? n : null;
}

function readFormData(formData: FormData): ProcessorInput {
  return {
    name: String(formData.get("name") ?? ""),
    address: (formData.get("address") as string | null)?.trim() || null,
    location_latitude: parseNumeric(formData.get("location_latitude")),
    location_longitude: parseNumeric(formData.get("location_longitude")),
    contact_name: (formData.get("contact_name") as string | null)?.trim() || null,
    contact_phone: (formData.get("contact_phone") as string | null)?.trim() || null,
    contact_email: (formData.get("contact_email") as string | null)?.trim() || null,
    notes: (formData.get("notes") as string | null)?.trim() || null,
  };
}

export async function createProcessor(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = processorInputSchema.safeParse(readFormData(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // If this is the user's first processor, mark it primary so the Analyse
  // flow has a sensible default without any extra clicks.
  const { count } = await supabase
    .from("processors")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_deleted", false);

  const { data, error } = await supabase
    .from("processors")
    .insert({
      ...parsed.data,
      user_id: user.id,
      is_primary: (count ?? 0) === 0,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "A processor with this name already exists." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/tools/grid-iq/processors");

  // Allow the caller to come back to where they started (e.g. the Analyse
  // flow). Only accept safe same-origin paths under /dashboard/ to prevent
  // open-redirect abuse from a crafted query string.
  const rawReturnTo = formData.get("returnTo");
  const returnTo = typeof rawReturnTo === "string" ? rawReturnTo : null;
  if (returnTo && /^\/dashboard\//.test(returnTo) && !returnTo.includes("//")) {
    redirect(returnTo);
  }

  redirect(`/dashboard/tools/grid-iq/processors/${data!.id}`);
}

export async function setPrimaryProcessor(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Unset the current primary first to avoid tripping the unique index,
  // then promote the chosen row. Two round-trips but both fast and RLS-scoped.
  const { error: unsetError } = await supabase
    .from("processors")
    .update({ is_primary: false })
    .eq("user_id", user.id)
    .eq("is_primary", true);
  if (unsetError) return { error: unsetError.message };

  const { error: setError } = await supabase
    .from("processors")
    .update({ is_primary: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (setError) return { error: setError.message };

  revalidatePath("/dashboard/tools/grid-iq/processors");
  revalidatePath(`/dashboard/tools/grid-iq/processors/${id}`);
  return { success: true };
}

export async function clearPrimaryProcessor(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("processors")
    .update({ is_primary: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/tools/grid-iq/processors");
  revalidatePath(`/dashboard/tools/grid-iq/processors/${id}`);
  return { success: true };
}

export async function updateProcessor(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = processorInputSchema.safeParse(readFormData(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { error } = await supabase
    .from("processors")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "A processor with this name already exists." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/tools/grid-iq/processors");
  revalidatePath(`/dashboard/tools/grid-iq/processors/${id}`);
  return { success: true };
}

// Lightweight create used by inline "+ New processor" pickers elsewhere in
// the app. Returns the new row instead of redirecting.
export async function createProcessorInline(input: {
  name: string;
  address?: string | null;
  location_latitude?: number | null;
  location_longitude?: number | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" } as const;

  const trimmedName = input.name.trim();
  if (!trimmedName) return { error: "Name is required" } as const;

  const { data, error } = await supabase
    .from("processors")
    .insert({
      user_id: user.id,
      name: trimmedName,
      address: input.address ?? null,
      location_latitude: input.location_latitude ?? null,
      location_longitude: input.location_longitude ?? null,
    })
    .select("id, name, address, location_latitude, location_longitude")
    .single();

  if (error) {
    if (error.code === "23505") {
      // Already exists: return the existing row so the caller can use it.
      const { data: existing } = await supabase
        .from("processors")
        .select("id, name, address, location_latitude, location_longitude")
        .eq("user_id", user.id)
        .eq("is_deleted", false)
        .ilike("name", trimmedName)
        .maybeSingle();
      if (existing) return { processor: existing } as const;
    }
    return { error: error.message } as const;
  }

  revalidatePath("/dashboard/tools/grid-iq/processors");
  return { processor: data! } as const;
}
