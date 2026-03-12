import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/app/sidebar";
import { MobileNav } from "@/components/app/mobile-nav";
import { AppProviders } from "@/components/app/app-providers";
import { TopBar } from "@/components/app/top-bar";
import { isAdvisorRole } from "@/lib/types/advisory";
import { isAdminEmail } from "@/lib/data/admin";

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

  // Fetch user role for default view mode
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const defaultMode = profile?.role && isAdvisorRole(profile.role)
    ? "advisor" as const
    : "farmer" as const;

  const showViewToggle = isAdminEmail(user.email);

  return (
    <AppProviders defaultMode={defaultMode}>
      <div className="flex min-h-screen flex-col bg-background">
        {/* Mobile nav */}
        <MobileNav userEmail={user.email} />

        {/* Desktop top header bar - full width */}
        <TopBar
          showViewToggle={showViewToggle}
          firstName={user.user_metadata?.first_name || ""}
          lastName={user.user_metadata?.last_name || ""}
          email={user.email || ""}
        />

        {/* Desktop sidebar + content */}
        <div className="flex flex-1">
          <div className="hidden lg:block">
            <div className="sticky top-20 h-[calc(100vh-5rem)] py-4 pl-6">
              <Sidebar userEmail={user.email} />
            </div>
          </div>

          <main className="flex-1 overflow-y-auto px-6 pb-6 lg:px-8 lg:pb-8">
            {children}
          </main>
        </div>
      </div>
    </AppProviders>
  );
}
