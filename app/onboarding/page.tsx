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

  const userName =
    user.user_metadata?.first_name ||
    user.user_metadata?.display_name ||
    "";

  return <OnboardingWizard userName={userName} />;
}
