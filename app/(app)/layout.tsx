import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/app/sidebar";
import { MobileNav } from "@/components/app/mobile-nav";
import { AppProviders } from "@/components/app/app-providers";
import { isAdvisorRole } from "@/lib/types/advisory";

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

  return (
    <AppProviders defaultMode={defaultMode}>
      <div className="flex min-h-screen bg-background">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-0 h-screen py-4 pl-6">
            <Sidebar userEmail={user.email} />
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 flex-col">
          <MobileNav userEmail={user.email} />
          <main className="flex-1 overflow-y-auto px-6 pb-6 lg:px-8 lg:pt-4 lg:pb-8">
            {children}
          </main>
        </div>
      </div>
    </AppProviders>
  );
}
