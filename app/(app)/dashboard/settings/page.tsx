import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";
import { LoadDemoButton, ClearDataButton } from "./demo-buttons";

export const metadata = { title: "Settings" };

const settingsSections = [
  {
    heading: "Features",
    items: [
      { label: "Sale Locations", description: "Manage saleyards and custom locations", href: "/dashboard/settings/sale-locations" },
      { label: "Notifications", description: "Yard book reminders and alerts", href: "/dashboard/settings/notifications" },
    ],
  },
];

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" subtitle="Manage your account and preferences." />

      <div className="space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent>
            <ProfileForm
              email={user?.email ?? ""}
              firstName={user?.user_metadata?.first_name ?? ""}
              lastName={user?.user_metadata?.last_name ?? ""}
            />
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
          <CardContent><PasswordForm /></CardContent>
        </Card>

        {/* Demo Data */}
        <div>
          <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Demo Data
          </h2>
          <Card>
            <CardContent className="p-5 space-y-4">
              <div>
                <p className="text-sm font-medium text-text-primary">Doongara Station demo</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  Loads 20 herds and a property from the iOS app demo data. Replaces any existing data.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <LoadDemoButton />
                <ClearDataButton />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature sections */}
        {settingsSections.map((section) => (
          <div key={section.heading}>
            <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
              {section.heading}
            </h2>
            <Card>
              <CardContent className="divide-y divide-white/[0.04] p-0">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/[0.03]"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">{item.label}</p>
                      <p className="text-xs text-text-muted">{item.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-text-muted/50 transition-all group-hover:translate-x-0.5 group-hover:text-text-muted" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
