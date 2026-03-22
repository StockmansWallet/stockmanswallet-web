import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Crown, Lock, Trash2, UserCircle } from "lucide-react";
import { PasswordForm } from "../password-form";
import { DeleteAccountButton } from "../delete-account-button";
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
      ? "bg-red-500/15"
      : variant === "accent"
        ? "bg-amber-500/15"
        : "bg-brand/15";
  const text =
    variant === "danger"
      ? "text-red-400"
      : variant === "accent"
        ? "text-amber-400"
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
  const userRole = profile?.role ?? "farmer_grazier";
  const isAdvisor = isAdvisorRole(userRole);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Account"
        subtitle="Subscription, security, and account management."
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
                isAdvisor ? "bg-purple-500/10 text-purple-400" : "bg-brand/10 text-brand"
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
                  {tierInfo.isFree ? "Free plan" : "Active subscription"} - {tierInfo.subtitle}
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
                {tierInfo.isFree ? "Free" : "Pro"}
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

        {/* Delete Account */}
        <Card className="ring-1 ring-inset ring-red-500/20">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <SectionIcon icon={Trash2} variant="danger" />
              <CardTitle className="text-red-400">Delete Account</CardTitle>
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
