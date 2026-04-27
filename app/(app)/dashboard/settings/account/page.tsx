import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChevronLeft, Crown, Lock, LogOut, Trash2, UserCircle } from "lucide-react";
import { PasswordForm } from "../password-form";
import { DeleteAccountButton } from "../delete-account-button";
import { SignOutButton } from "../sign-out-button";
import {
  tierDisplayName,
  TIER_DISPLAY,
  type SubscriptionTier,
} from "@/lib/subscriptions/tiers";
import { isAdvisorRole, roleDisplayName } from "@/lib/types/advisory";

export const revalidate = 0;

export const metadata = { title: "Account - Settings" };

function SectionIcon({
  icon: Icon,
  variant,
}: {
  icon: React.ComponentType<{ className?: string }>;
  variant?: "danger" | "accent";
}) {
  const bg =
    variant === "danger"
      ? "bg-error/15"
      : variant === "accent"
        ? "bg-warning/15"
        : "bg-brand/15";
  const text =
    variant === "danger"
      ? "text-error"
      : variant === "accent"
        ? "text-warning"
        : "text-brand";

  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${bg}`}
    >
      <Icon className={`h-3.5 w-3.5 ${text}`} />
    </div>
  );
}

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch subscription tier and role from user_profiles
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("subscription_tier, role")
    .eq("user_id", user!.id)
    .single();

  const tier = (profile?.subscription_tier ?? "stockman") as SubscriptionTier;
  const tierInfo = TIER_DISPLAY[tier];
  const userRole = profile?.role ?? "producer";
  const isAdvisor = isAdvisorRole(userRole);

  return (
    <div className="w-full max-w-[1680px]">
      <div className="mb-4 sm:hidden">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 rounded-lg bg-surface-lowest px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Settings
        </Link>
      </div>
      <PageHeader
        title="Account"
        titleClassName="text-4xl font-bold text-warning"
        subtitle="Subscription, security, and account management."
      />

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {/* Account Type */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <SectionIcon icon={UserCircle} />
              <CardTitle>Account Type</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {roleDisplayName(userRole)}
                </p>
                <p className="text-xs text-text-muted">
                  {isAdvisor ? "Advisor account" : "Producer account"}
                </p>
              </div>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                isAdvisor ? "bg-advisor/10 text-advisor" : "bg-brand/10 text-brand"
              }`}>
                {isAdvisor ? "Advisor" : "Producer"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <SectionIcon icon={Crown} variant="accent" />
              <CardTitle>Subscription</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {tierDisplayName(tier)}
                </p>
                <p className="text-xs text-text-muted">
                  Active subscription - {tierInfo.subtitle}
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
                Pro
              </span>
            </div>
            <p className="mt-3 text-xs text-text-muted">
              Subscription management coming soon.
            </p>
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

        {/* Sign Out */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <SectionIcon icon={LogOut} />
              <CardTitle>Sign Out</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-xs leading-relaxed text-text-muted">
              Sign out of your account on this device.
            </p>
            <SignOutButton />
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="ring-1 ring-inset ring-error/20">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <SectionIcon icon={Trash2} variant="danger" />
              <CardTitle className="text-error">Delete Account</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-xs leading-relaxed text-text-muted">
              Permanently delete your account and all associated data including
              herds, properties, records, and settings. This affects both the web
              app and iOS app.
            </p>
            <DeleteAccountButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
