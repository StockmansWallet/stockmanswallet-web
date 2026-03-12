"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
    data: {
      first_name: firstName,
      last_name: lastName,
    },
  });

  if (authError) return { error: authError.message };

  // Update user_profiles table (role + display_name)
  if (role) {
    const displayName = [firstName, lastName].filter(Boolean).join(" ") || user.email || "";
    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({
        role,
        display_name: displayName,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (profileError) return { error: profileError.message };
  }

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

  const contactEmail = formData.get("contact_email") as string;
  const contactPhone = formData.get("contact_phone") as string;
  const companyName = formData.get("company_name") as string | null;
  const propertyName = formData.get("property_name") as string | null;

  const updates: Record<string, unknown> = {
    user_id: user.id,
    contact_email: contactEmail || null,
    contact_phone: contactPhone || null,
    updated_at: new Date().toISOString(),
  };

  if (companyName !== null) updates.company_name = companyName || null;
  if (propertyName !== null) updates.property_name = propertyName || null;

  const { error } = await supabase
    .from("user_profiles")
    .update(updates)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { success: "Contact details updated." };
}

export async function updateBio(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const bio = formData.get("bio") as string;

  const { error } = await supabase
    .from("user_profiles")
    .update({
      bio: bio || null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { success: "Bio updated." };
}

export async function updateVisibility(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Checkboxes only appear in FormData if checked
  const isDiscoverable = formData.has("is_discoverable");
  const isDiscoverableToFarmers = formData.has("is_discoverable_to_farmers");
  const isListedInDirectory = formData.has("is_listed_in_directory");

  const { error } = await supabase
    .from("user_profiles")
    .update({
      is_discoverable: isDiscoverable,
      is_discoverable_to_farmers: isDiscoverableToFarmers,
      is_listed_in_directory: isListedInDirectory,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { success: "Visibility settings updated." };
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

  if (newPassword.length < 6) {
    return { error: "Password must be at least 6 characters." };
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

  // Call the delete-account Edge Function
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

  // Sign out after account deletion
  await supabase.auth.signOut();
  redirect("/login");
}
