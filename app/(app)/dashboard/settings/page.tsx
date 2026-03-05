import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  User,
  Lock,
  Database,
  FlaskConical,
  Shield,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";
import { LoadDemoButton, ClearDataButton, ClearAllDataButton } from "./demo-buttons";
import { SignOutButton } from "./sign-out-button";
import { DeleteAccountButton } from "./delete-account-button";

export const revalidate = 0;

export const metadata = { title: "Settings" };

const ADMIN_EMAILS = [
  "leon@stockmanswallet.com.au",
  "mil@stockmanswallet.com.au",
  "luke@stockmanswallet.com.au",
];

function SectionIcon({
  icon: Icon,
  variant = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "danger";
}) {
  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
        variant === "danger" ? "bg-red-500/15" : "bg-brand/15"
      }`}
    >
      <Icon
        className={`h-3.5 w-3.5 ${
          variant === "danger" ? "text-red-400" : "text-brand"
        }`}
      />
    </div>
  );
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch user profile for role
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  const isAdmin = ADMIN_EMAILS.includes(user?.email ?? "");

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Settings"
        subtitle="Manage your account, preferences, and data."
      />

      <div className="space-y-6">
        {/* Profile + Password - Two column on desktop */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Profile */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <SectionIcon icon={User} />
                <CardTitle>Profile</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ProfileForm
                email={user?.email ?? ""}
                firstName={user?.user_metadata?.first_name ?? ""}
                lastName={user?.user_metadata?.last_name ?? ""}
                role={profile?.role ?? ""}
              />
            </CardContent>
          </Card>

          {/* Password */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <SectionIcon icon={Lock} />
                <CardTitle>Password</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <PasswordForm />
            </CardContent>
          </Card>
        </div>

        {/* Data & Sync */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <SectionIcon icon={Database} />
              <div>
                <CardTitle>Data & Sync</CardTitle>
                <p className="mt-1 text-xs text-text-muted">
                  Your data syncs automatically across all devices.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-text-primary">Clear all data</p>
              <p className="mt-1 text-xs text-text-muted leading-relaxed">
                Permanently deletes all your herds, records, and data from the cloud.
                Affects both this web app and the iOS app. Your account will remain active.
              </p>
              <div className="mt-3">
                <ClearAllDataButton />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Data */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <SectionIcon icon={FlaskConical} />
              <div>
                <CardTitle>Demo Data</CardTitle>
                <p className="mt-1 text-xs text-text-muted">
                  Load sample herds to explore the app without entering real data.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-text-primary">Doongara Station</p>
              <p className="mt-1 text-xs text-text-muted leading-relaxed">
                Loads 20 herds and a property from the demo dataset. Replaces any existing demo data.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <LoadDemoButton />
                <ClearDataButton />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Tools - conditional */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <SectionIcon icon={Shield} />
                <CardTitle>Admin Tools</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Link
                href="/dashboard/admin/mla-upload"
                className="group flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/[0.03]"
              >
                <div>
                  <p className="text-sm font-medium text-text-primary">MLA CSV Upload</p>
                  <p className="text-xs text-text-muted">
                    Upload MLA data to populate saleyard-specific pricing
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-text-muted/50 transition-all group-hover:translate-x-0.5 group-hover:text-text-muted" />
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Danger Zone */}
        <div>
          <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-red-400/70">
            Danger Zone
          </h2>
          <Card className="ring-1 ring-inset ring-red-500/20">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <SectionIcon icon={AlertTriangle} variant="danger" />
                <CardTitle className="text-red-400">Account</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 p-2">
              <SignOutButton />
              <DeleteAccountButton />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
