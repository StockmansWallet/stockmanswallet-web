import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/app/sidebar";
import { MobileNav } from "@/components/app/mobile-nav";
import { TopBar } from "@/components/app/top-bar";
import { isAdvisorRole, roleDisplayName } from "@/lib/types/advisory";

// Prevent Next.js from caching this layout - auth state must be fresh on every request
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Fetch user role, subscription tier, and onboarding status
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("role, subscription_tier, onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  // Redirect new users to onboarding wizard
  // Fallback: if profile exists but onboarding_completed is false, check for existing herds.
  // iOS app completes onboarding locally and may not have set the flag on Supabase yet.
  if (!profile || !profile.onboarding_completed) {
    let hasExistingData = false;

    if (profile) {
      // Check if user has herds (they onboarded on iOS but the flag was not synced)
      const { data: herds } = await supabase
        .from("herds")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_deleted", false)
        .limit(1);

      if (herds && herds.length > 0) {
        hasExistingData = true;
        // Backfill the flag so this check does not run again
        await supabase
          .from("user_profiles")
          .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);
      }
    }

    if (!hasExistingData) {
      redirect("/onboarding");
    }
  }

  const isAdvisor = !!(profile?.role && isAdvisorRole(profile.role));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Mobile nav */}
      <div data-print-hide>
        <MobileNav userEmail={user.email} subscriptionTier={profile?.subscription_tier || "stockman"} isAdvisor={isAdvisor} />
      </div>

      {/* Desktop top header bar - full width, sticky */}
      <div data-print-hide className="sticky top-0 z-40">
        <TopBar
          firstName={user.user_metadata?.first_name || ""}
          lastName={user.user_metadata?.last_name || ""}
          email={user.email || ""}
          roleLabel={roleDisplayName(profile?.role || "farmer_grazier")}
        />
      </div>

      {/* Desktop sidebar + content */}
      <div className="flex flex-1">
        <div className="hidden lg:block">
          <div className="sticky top-20 h-[calc(100vh-5rem)] py-4 pl-6">
            <Sidebar userEmail={user.email} subscriptionTier={profile?.subscription_tier || "stockman"} isAdvisor={isAdvisor} />
          </div>
        </div>

        <main className="flex-1 overflow-y-auto px-6 pb-6 lg:px-8 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
