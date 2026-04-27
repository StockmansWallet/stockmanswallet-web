import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/app/sidebar";
import { MobileNav } from "@/components/app/mobile-nav";
import { SidebarNotificationsProvider } from "@/components/app/sidebar-notifications-provider";
import { DemoModeBanner } from "@/components/app/demo-mode-banner";
import { DemoModeProvider } from "@/components/app/demo-mode-provider";
import { AppHeader } from "@/components/app/app-header";
import { isAdvisorRole, roleDisplayName } from "@/lib/types/advisory";
import { ADVISOR_ENABLED } from "@/lib/feature-flags";
import PageBackground from "@/components/marketing/ui/page-background";

// Prevent Next.js from caching this layout - auth state must be fresh on every request
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Fetch user role, subscription tier, onboarding status, admin flag
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, role, subscription_tier, onboarding_completed, is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  const isAdmin = profile?.is_admin === true;

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

  // When advisor feature flag is off, never treat anyone as an advisor
  const isAdvisor = ADVISOR_ENABLED && !!(profile?.role && isAdvisorRole(profile.role));

  // Demo user check - email comparison is authoritative; RLS enforces read-only server-side.
  const isDemoUser = user.email?.toLowerCase() === process.env.DEMO_EMAIL?.toLowerCase();
  const authFirstName = user.user_metadata?.first_name || "";
  const authLastName = user.user_metadata?.last_name || "";
  const displayName =
    isDemoUser && authFirstName && authLastName
      ? `${authFirstName} ${authLastName}`
      : authFirstName || profile?.display_name?.split(" ")[0] || "Stockman";

  return (
    <DemoModeProvider isDemoUser={isDemoUser}>
      <SidebarNotificationsProvider>
        <PageBackground variant="app" />

        <div className="bg-background/0 flex min-h-screen flex-col">
          {isDemoUser && <DemoModeBanner />}

          {/* Mobile nav */}
          <div data-print-hide>
            <MobileNav
              userEmail={user.email}
              subscriptionTier={profile?.subscription_tier || "stockman"}
              isAdvisor={isAdvisor}
            />
          </div>

          <AppHeader
            displayName={displayName}
            email={user.email || ""}
            roleLabel={roleDisplayName(profile?.role || "producer")}
            avatarUrl={
              isDemoUser ? "/images/demo-user-profile.webp" : user.user_metadata?.avatar_url || ""
            }
          />

          {/* Desktop sidebar + content */}
          <div className="mx-auto flex w-full max-w-[1960px] flex-1 gap-3 px-3 pt-3 pb-3 lg:gap-4 lg:px-4 lg:pt-3 lg:pb-4">
            <div className="hidden lg:block">
              <div className="sticky top-[5.25rem] max-h-[calc(100vh-6.25rem)] overflow-y-auto">
                <Sidebar
                  isAdmin={isAdmin}
                  isAdvisor={isAdvisor}
                  isDemoUser={isDemoUser}
                  subscriptionTier={profile?.subscription_tier || "stockman"}
                />
              </div>
            </div>

            <main className="min-w-0 flex-1">
              {children}
            </main>
          </div>
        </div>
      </SidebarNotificationsProvider>
    </DemoModeProvider>
  );
}
