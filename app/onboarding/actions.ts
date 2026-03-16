"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type OnboardingProperty = {
  name: string;
  pic?: string;
  size?: number;
  sizeUnit?: "ha" | "ac";
  address?: string;
  suburb?: string;
  state: string;
  postcode?: string;
  isDefault: boolean;
};

export type OnboardingData = {
  accountType: "farmer_grazier" | "advisor";
  displayName?: string;
  // Producer fields
  properties: OnboardingProperty[];
  preferredSaleyard?: string;
  // Advisor fields
  companyName?: string;
  businessType?: string;
  advisorRole?: string;
  businessAddress?: string;
  // Account type role (for advisor sub-role from step 1)
  accountTypeRole?: string;
  // Preferences - producer
  isDiscoverableToAdvisors?: boolean;
  isVisibleOnFarmerNetwork?: boolean;
  // Preferences - advisor
  isListedInDirectory?: boolean;
  // Public profile
  contactEmail?: string;
  contactPhone?: string;
  bio?: string;
};

export async function completeOnboarding(data: OnboardingData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Build user_profiles update
  const profileUpdate: Record<string, unknown> = {
    role: data.accountType,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  };

  if (data.displayName) {
    profileUpdate.display_name = data.displayName;

    // Also update auth metadata so dashboard and profile settings can read it
    const nameParts = data.displayName.trim().split(/\s+/);
    const authFirstName = nameParts[0] || "";
    const authLastName = nameParts.slice(1).join(" ") || "";
    await supabase.auth.updateUser({
      data: { first_name: authFirstName, last_name: authLastName },
    });
  }

  if (data.contactEmail) {
    profileUpdate.contact_email = data.contactEmail;
  }
  if (data.contactPhone) {
    profileUpdate.contact_phone = data.contactPhone;
  }
  if (data.bio) {
    profileUpdate.bio = data.bio;
  }

  if (data.accountType === "farmer_grazier") {
    // Producer visibility
    profileUpdate.is_discoverable = data.isDiscoverableToAdvisors ?? false;
    profileUpdate.is_discoverable_to_farmers =
      data.isVisibleOnFarmerNetwork ?? false;

    // Store primary property info on profile for quick access
    const primaryProp = data.properties.find((p) => p.isDefault);
    if (primaryProp) {
      profileUpdate.property_name = primaryProp.name;
      profileUpdate.property_pic = primaryProp.pic || null;
      profileUpdate.state = primaryProp.state;
      profileUpdate.region = null;
    }
  } else {
    // Advisor fields
    if (data.companyName) profileUpdate.company_name = data.companyName;
    if (data.businessType) profileUpdate.business_type = data.businessType;
    if (data.advisorRole) profileUpdate.advisor_role = data.advisorRole;
    if (data.businessAddress)
      profileUpdate.business_address = data.businessAddress;

    profileUpdate.is_discoverable = data.isListedInDirectory ?? false;
    profileUpdate.is_listed_in_directory = data.isListedInDirectory ?? false;
  }

  // Upsert user_profiles
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

  // Create properties for producers
  if (data.accountType === "farmer_grazier" && data.properties.length > 0) {
    const { data: existingProps } = await supabase
      .from("properties")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .limit(1);

    if (!existingProps || existingProps.length === 0) {
      for (const prop of data.properties) {
        await supabase.from("properties").insert({
          id: crypto.randomUUID(),
          user_id: user.id,
          property_name: prop.name,
          property_pic: prop.pic || null,
          acreage: prop.size || null,
          address: prop.address || null,
          suburb: prop.suburb || null,
          state: prop.state || "QLD",
          postcode: prop.postcode || null,
          is_default: prop.isDefault,
          default_saleyard: prop.isDefault
            ? data.preferredSaleyard || null
            : null,
        });
      }
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

  const { data: existing } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("user_profiles")
      .update({
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
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
