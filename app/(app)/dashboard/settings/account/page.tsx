import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { User, Lock, Trash2 } from "lucide-react";
import { ProfileForm } from "../profile-form";
import { PasswordForm } from "../password-form";
import { DeleteAccountButton } from "../delete-account-button";

export const revalidate = 0;

export const metadata = { title: "Account - Settings" };

function SectionIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
      <Icon className="h-3.5 w-3.5 text-brand" />
    </div>
  );
}

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user!.id)
    .single();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Account"
        subtitle="Manage your profile and password."
        actions={
          <Link
            href="/dashboard/settings"
            className="inline-flex h-8 items-center justify-center rounded-xl px-3.5 text-[13px] font-semibold text-text-secondary transition-all duration-150 hover:bg-white/8 hover:text-text-primary"
          >
            Back
          </Link>
        }
      />

      <div className="space-y-6">
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

        {/* Delete Account */}
        <Card className="ring-1 ring-inset ring-red-500/20">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/15">
                <Trash2 className="h-3.5 w-3.5 text-red-400" />
              </div>
              <CardTitle className="text-red-400">Delete Account</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-xs text-text-muted leading-relaxed">
              Permanently delete your account and all associated data including herds,
              properties, records, and settings. This affects both the web app and iOS app.
            </p>
            <DeleteAccountButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
