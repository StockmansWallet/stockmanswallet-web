"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleToSnakeCase } from "@/lib/types/advisory";

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
    role: existing?.role || "farmer_grazier",
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const firstName = formData.get("first_name") as string;
  const lastName = formData.get("last_name") as string;
  const role = formData.get("role") as string;

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const base = await getProfileBase(supabase, user.id, user.email);

  const contactEmail = formData.get("contact_email") as string;
  const contactPhone = formData.get("contact_phone") as string;
  const companyName = formData.get("company_name") as string | null;
  const propertyName = formData.get("property_name") as string | null;

  const fields: Record<string, unknown> = {
    contact_email: contactEmail || null,
    contact_phone: contactPhone || null,
  };

  if (companyName !== null) fields.company_name = companyName || null;
  if (propertyName !== null) fields.property_name = propertyName || null;

  const err = await upsertProfile(supabase, base, fields);
  if (err) return { error: err };

  revalidatePath("/dashboard/settings");
  return { success: "Contact details updated." };
}

export async function updateBio(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const base = await getProfileBase(supabase, user.id, user.email);
  const bio = formData.get("bio") as string;

  const err = await upsertProfile(supabase, base, { bio: bio || null });
  if (err) return { error: err };

  revalidatePath("/dashboard/settings");
  return { success: "Bio updated." };
}

export async function updateVisibilityToggle(field: string, value: boolean) {
  const allowed = ["is_discoverable", "is_discoverable_to_farmers", "is_listed_in_directory"];
  if (!allowed.includes(field)) return { error: "Invalid field" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const base = await getProfileBase(supabase, user.id, user.email);

  const err = await upsertProfile(supabase, base, { [field]: value });
  if (err) return { error: err };

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const newPassword = formData.get("new_password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  if (newPassword.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
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
