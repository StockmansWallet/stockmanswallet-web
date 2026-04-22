import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/app/sidebar";
import { MobileNav } from "@/components/app/mobile-nav";
import { TopBar } from "@/components/app/top-bar";
import { SidebarNotificationsProvider } from "@/components/app/sidebar-notifications-provider";
import { DemoModeBanner } from "@/components/app/demo-mode-banner";
import { DemoModeProvider } from "@/components/app/demo-mode-provider";
import { isAdvisorRole, roleDisplayName } from "@/lib/types/advisory";
import { ADVISOR_ENABLED } from "@/lib/feature-flags";

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
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("role, subscription_tier, onboarding_completed, is_admin")
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

  return (
    <DemoModeProvider isDemoUser={isDemoUser}>
      <SidebarNotificationsProvider>
        {/* Fixed background: single div, CSS-only stack. One compositing layer, no mix-blend-mode,
          no next/Image. */}
        <div
          data-print-hide
          aria-hidden
          className="bg-background pointer-events-none fixed inset-0 -z-10"
          style={{
            backgroundImage: [
              // Dark bottom gradient (fades image into page background)
              "linear-gradient(to bottom, rgba(20,17,15,0) 0%, rgba(20,17,15,0.35) 25%, rgba(20,17,15,0.7) 55%, rgba(20,17,15,1) 90%)",
              // Darken on the hero image (65% pure black)
              "linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65))",
              // Hero image
              "url('/images/landing-bg.webp')",
            ].join(","),
            backgroundSize: "100% 100%, 100% 100%, cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />

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

          {/* Desktop top header bar - full width, sticky */}
          <div data-print-hide className="sticky top-0 z-40">
            <TopBar
              firstName={user.user_metadata?.first_name || ""}
              lastName={user.user_metadata?.last_name || ""}
              email={user.email || ""}
              roleLabel={roleDisplayName(profile?.role || "producer")}
              avatarUrl={
                isDemoUser ? "/images/demo-user-profile.webp" : user.user_metadata?.avatar_url || ""
              }
              subscriptionTier={profile?.subscription_tier || "stockman"}
            />
          </div>

          {/* Desktop sidebar + content */}
          <div className="flex flex-1">
            <div className="hidden lg:block">
              <div className="sticky top-20 h-[calc(100vh-5rem)] py-4 pl-6">
                <Sidebar isAdmin={isAdmin} isAdvisor={isAdvisor} isDemoUser={isDemoUser} />
              </div>
            </div>

            <main className="flex-1 overflow-y-auto px-6 pb-6 lg:px-8 lg:pb-8">{children}</main>
          </div>
        </div>
      </SidebarNotificationsProvider>
    </DemoModeProvider>
  );
}
