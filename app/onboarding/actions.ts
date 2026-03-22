"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const onboardingPropertySchema = z.object({
  name: z.string().min(1).max(200),
  pic: z.string().max(20).optional(),
  size: z.number().positive().optional(),
  sizeUnit: z.enum(["ha", "ac"]).optional(),
  address: z.string().max(300).optional(),
  suburb: z.string().max(100).optional(),
  state: z.string().min(1).max(10),
  postcode: z.string().max(10).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isDefault: z.boolean(),
});

const onboardingDataSchema = z.object({
  accountType: z.enum(["producer", "advisor"]),
  displayName: z.string().max(200).optional(),
  properties: z.array(onboardingPropertySchema).default([]),
  preferredSaleyard: z.string().max(200).optional(),
  companyName: z.string().max(200).optional(),
  businessType: z.string().max(100).optional(),
  advisorRole: z.string().max(100).optional(),
  businessAddress: z.string().max(300).optional(),
  accountTypeRole: z.string().max(100).optional(),
  isDiscoverableToAdvisors: z.boolean().optional(),
  isVisibleOnFarmerNetwork: z.boolean().optional(),
  isListedInDirectory: z.boolean().optional(),
  contactEmail: z.string().email().or(z.literal("")).optional(),
  contactPhone: z.string().max(30).optional(),
  bio: z.string().max(1000).optional(),
});

export type OnboardingProperty = z.infer<typeof onboardingPropertySchema>;

export type OnboardingData = z.infer<typeof onboardingDataSchema>;

export async function completeOnboarding(data: OnboardingData) {
  const parsed = onboardingDataSchema.safeParse(data);

  if (!parsed.success) return { error: "Invalid input" };

  // Use validated data from here on
  const validData = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Determine the actual DB role value
  // For advisors, use the specific role they selected (e.g. "Agribusiness Banker" -> "agribusiness_banker")
  let dbRole = validData.accountType;
  if (validData.accountType === "advisor" && validData.accountTypeRole) {
    dbRole = validData.accountTypeRole
      .toLowerCase()
      .replace(/\//g, "_")
      .replace(/\s+/g, "_");
  }

  // Build user_profiles update
  const profileUpdate: Record<string, unknown> = {
    role: dbRole,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  };

  if (validData.displayName) {
    profileUpdate.display_name = validData.displayName;

    // Also update auth metadata so dashboard and profile settings can read it
    const nameParts = validData.displayName.trim().split(/\s+/);
    const authFirstName = nameParts[0] || "";
    const authLastName = nameParts.slice(1).join(" ") || "";
    await supabase.auth.updateUser({
      data: { first_name: authFirstName, last_name: authLastName },
    });
  }

  if (validData.contactEmail) {
    profileUpdate.contact_email = validData.contactEmail;
  }
  if (validData.contactPhone) {
    profileUpdate.contact_phone = validData.contactPhone;
  }
  if (validData.bio) {
    profileUpdate.bio = validData.bio;
  }

  if (validData.accountType === "producer") {
    // Producer visibility
    profileUpdate.is_discoverable = validData.isDiscoverableToAdvisors ?? false;
    profileUpdate.is_discoverable_to_farmers =
      validData.isVisibleOnFarmerNetwork ?? false;

    // Store primary property info on profile for quick access
    const primaryProp = validData.properties.find((p) => p.isDefault);
    if (primaryProp) {
      profileUpdate.property_name = primaryProp.name;
      profileUpdate.property_pic = primaryProp.pic || null;
      profileUpdate.state = primaryProp.state;
      profileUpdate.region = null;
    }
  } else {
    // Advisor fields
    if (validData.companyName) profileUpdate.company_name = validData.companyName;
    if (validData.businessType) profileUpdate.business_type = validData.businessType;
    if (validData.advisorRole) profileUpdate.advisor_role = validData.advisorRole;
    if (validData.businessAddress)
      profileUpdate.business_address = validData.businessAddress;

    profileUpdate.is_discoverable = validData.isListedInDirectory ?? false;
    profileUpdate.is_listed_in_directory = validData.isListedInDirectory ?? false;
  }

  // Upsert user_profiles
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error: updateErr } = await supabase
      .from("user_profiles")
      .update(profileUpdate)
      .eq("user_id", user.id);
    if (updateErr) console.error("Onboarding profile update failed:", updateErr.message);
  } else {
    const { error: insertErr } = await supabase.from("user_profiles").insert({
      user_id: user.id,
      ...profileUpdate,
    });
    if (insertErr) console.error("Onboarding profile insert failed:", insertErr.message);
  }

  // Create properties for producers
  if (validData.accountType === "producer" && validData.properties.length > 0) {
    const { data: existingProps } = await supabase
      .from("properties")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .limit(1);

    if (!existingProps || existingProps.length === 0) {
      for (const prop of validData.properties) {
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
          latitude: prop.latitude || null,
          longitude: prop.longitude || null,
          is_default: prop.isDefault,
          default_saleyard: prop.isDefault
            ? validData.preferredSaleyard || null
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
