import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/app/onboarding/onboarding-wizard";

export const metadata = {
  title: "Welcome to Stockman's Wallet",
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Check if already onboarded
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed) {
    redirect("/dashboard");
  }

  // Google provides full_name/name, Apple provides first_name/last_name
  const meta = user.user_metadata;
  const userName =
    meta?.first_name
      ? [meta.first_name, meta.last_name].filter(Boolean).join(" ")
      : meta?.full_name || meta?.name || meta?.display_name || "";

  return <OnboardingWizard userName={userName} />;
}
