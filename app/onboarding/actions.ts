"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type OnboardingData = {
  accountType: "farmer_grazier" | "advisor";
  // Farmer fields
  propertyName?: string;
  state?: string;
  region?: string;
  // Advisor fields
  companyName?: string;
  // Shared
  displayName?: string;
  preferredSaleyard?: string;
  isDiscoverable?: boolean;
};

export async function completeOnboarding(data: OnboardingData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Update user_profiles with role and preferences
  const profileUpdate: Record<string, unknown> = {
    role: data.accountType,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  };

  if (data.displayName) {
    profileUpdate.display_name = data.displayName;
  }

  if (data.accountType === "farmer_grazier") {
    if (data.propertyName) profileUpdate.property_name = data.propertyName;
    if (data.state) profileUpdate.state = data.state;
    if (data.region) profileUpdate.region = data.region;
  } else {
    if (data.companyName) profileUpdate.company_name = data.companyName;
    profileUpdate.is_discoverable = data.isDiscoverable ?? false;
    profileUpdate.is_listed_in_directory = data.isDiscoverable ?? false;
  }

  // Check if profile exists
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("user_profiles")
      .update(profileUpdate)
      .eq("user_id", user.id);
  } else {
    await supabase.from("user_profiles").insert({
      user_id: user.id,
      ...profileUpdate,
    });
  }

  // Create a default property for farmers
  if (data.accountType === "farmer_grazier" && data.propertyName) {
    const { data: existingProperty } = await supabase
      .from("properties")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .limit(1);

    if (!existingProperty || existingProperty.length === 0) {
      await supabase.from("properties").insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        property_name: data.propertyName,
        state: data.state || "QLD",
        region: data.region || null,
        is_default: true,
        default_saleyard: data.preferredSaleyard || null,
      });
    }
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function skipOnboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Check if profile exists
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("user_profiles")
      .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
  } else {
    await supabase.from("user_profiles").insert({
      user_id: user.id,
      onboarding_completed: true,
    });
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
