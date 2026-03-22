"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleToSnakeCase } from "@/lib/types/advisory";
import { z } from "zod";

const updateProfileSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().max(100).default(""),
  role: z.string().min(1),
});

const updateContactDetailsSchema = z.object({
  contact_email: z.string().email().or(z.literal("")).default(""),
  contact_phone: z.string().max(30).default(""),
  company_name: z.string().max(200).nullable().default(null),
  property_name: z.string().max(200).nullable().default(null),
});

const updateBioSchema = z.object({
  bio: z.string().max(1000).default(""),
});

const updateVisibilityToggleSchema = z.object({
  field: z.enum(["is_discoverable", "is_discoverable_to_farmers", "is_listed_in_directory"]),
  value: z.boolean(),
});

const updatePasswordSchema = z.object({
  new_password: z.string().min(8),
  confirm_password: z.string().min(8),
});

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Build the required base fields for user_profiles upsert.
 * Matches iOS FarmerDiscoveryService.UserProfilePayload pattern.
 */
async function getProfileBase(supabase: SupabaseClient, userId: string, email?: string) {
  // Try to read existing row for current display_name and role
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("display_name, role")
    .eq("user_id", userId)
    .single();

  // Get auth metadata for name
  const { data: { user } } = await supabase.auth.getUser();
  const firstName = user?.user_metadata?.first_name || "";
  const lastName = user?.user_metadata?.last_name || "";
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || email || "";

  return {
    user_id: userId,
    display_name: displayName || existing?.display_name || email || "",
    role: existing?.role || "producer",
  };
}

/**
 * Upsert user_profiles row. Matches iOS pattern:
 * .upsert(payload, onConflict: "user_id")
 */
async function upsertProfile(
  supabase: SupabaseClient,
  base: { user_id: string; display_name: string; role: string },
  fields: Record<string, unknown>,
) {
  const { error } = await supabase
    .from("user_profiles")
    .upsert(
      { ...base, ...fields, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  return error?.message || null;
}

export async function updateProfile(formData: FormData) {
  const parsed = updateProfileSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    role: formData.get("role"),
  });

  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { first_name: firstName, last_name: lastName, role } = parsed.data;

  // Update auth metadata (name)
  const { error: authError } = await supabase.auth.updateUser({
    data: { first_name: firstName, last_name: lastName },
  });

  if (authError) return { error: authError.message };

  // Upsert user_profiles
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || user.email || "";
  const err = await upsertProfile(
    supabase,
    { user_id: user.id, display_name: displayName, role: roleToSnakeCase(role) },
    {},
  );
  if (err) return { error: err };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { success: "Profile updated." };
}

export async function updateContactDetails(formData: FormData) {
  const parsed = updateContactDetailsSchema.safeParse({
    contact_email: formData.get("contact_email") ?? "",
    contact_phone: formData.get("contact_phone") ?? "",
    company_name: formData.get("company_name"),
    property_name: formData.get("property_name"),
  });

  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const base = await getProfileBase(supabase, user.id, user.email);

  const fields: Record<string, unknown> = {
    contact_email: parsed.data.contact_email || null,
    contact_phone: parsed.data.contact_phone || null,
  };

  if (parsed.data.company_name !== null) fields.company_name = parsed.data.company_name || null;
  if (parsed.data.property_name !== null) fields.property_name = parsed.data.property_name || null;

  const err = await upsertProfile(supabase, base, fields);
  if (err) return { error: err };

  revalidatePath("/dashboard/settings");
  return { success: "Contact details updated." };
}

export async function updateBio(formData: FormData) {
  const parsed = updateBioSchema.safeParse({
    bio: formData.get("bio") ?? "",
  });

  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const base = await getProfileBase(supabase, user.id, user.email);

  const err = await upsertProfile(supabase, base, { bio: parsed.data.bio || null });
  if (err) return { error: err };

  revalidatePath("/dashboard/settings");
  return { success: "Bio updated." };
}

export async function updateVisibilityToggle(field: string, value: boolean) {
  const parsed = updateVisibilityToggleSchema.safeParse({ field, value });

  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const base = await getProfileBase(supabase, user.id, user.email);

  const err = await upsertProfile(supabase, base, { [parsed.data.field]: parsed.data.value });
  if (err) return { error: err };

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const parsed = updatePasswordSchema.safeParse({
    new_password: formData.get("new_password"),
    confirm_password: formData.get("confirm_password"),
  });

  if (!parsed.success) return { error: "Invalid input" };

  if (parsed.data.new_password !== parsed.data.confirm_password) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.new_password,
  });

  if (error) return { error: error.message };

  return { success: "Password updated." };
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) return { error: error.message };

  redirect("/login");
}

export async function deleteAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: sessionData } = await supabase.auth.getSession();
  const jwt = sessionData.session?.access_token;
  if (!jwt) return { error: "No active session" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { error: body.error || `Server error (${response.status})` };
  }

  await supabase.auth.signOut();
  redirect("/login");
}

export async function updateAvatarUrl(avatarUrl: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.auth.updateUser({
    data: { avatar_url: avatarUrl },
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings/profile");
  revalidatePath("/dashboard", "layout");
  return { success: true };
}

export async function removeAvatar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.auth.updateUser({
    data: { avatar_url: null },
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings/profile");
  revalidatePath("/dashboard", "layout");
  return { success: true };
}
