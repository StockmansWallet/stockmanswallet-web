import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  CalendarDays,
  ChevronLeft,
  Crown,
  Lock,
  LogOut,
  Mail,
  ShieldCheck,
  Trash2,
  UserCircle,
} from "lucide-react";
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

      <div className="grid w-full max-w-[1400px] grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:self-start">
          <Card className="overflow-hidden">
            <div className="border-b border-white/[0.06] bg-white/[0.03] px-5 py-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
                Account Summary
              </p>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.08] bg-warning/15 text-lg font-bold text-warning">
                  {(user?.email?.charAt(0) ?? "S").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-text-primary">
                    {roleDisplayName(userRole)}
                  </p>
                  <p className="truncate text-sm text-text-muted">{user?.email}</p>
                </div>
              </div>
            </div>
            <CardContent className="space-y-4 p-5">
              <SummaryLine
                icon={<UserCircle />}
                label="Account type"
                value={isAdvisor ? "Advisor" : "Producer"}
                tone={isAdvisor ? "advisor" : "brand"}
              />
              <SummaryLine
                icon={<Crown />}
                label="Subscription"
                value={tierDisplayName(tier)}
                detail={tierInfo.subtitle}
                tone="warning"
              />
              <SummaryLine
                icon={<Mail />}
                label="Sign-in email"
                value={user?.email ?? "Not available"}
              />
              <SummaryLine
                icon={<CalendarDays />}
                label="Created"
                value={formatAccountDate(user?.created_at)}
              />
              <p className="border-t border-white/[0.06] pt-4 text-xs leading-relaxed text-text-muted">
                Subscription management is coming soon. Your account role is set during onboarding.
              </p>
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <SectionIcon icon={Lock} />
                <div>
                  <CardTitle>Security</CardTitle>
                  <p className="mt-1 text-xs text-text-muted">
                    Update the password used to sign in to Stockman&apos;s Wallet.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <PasswordForm />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <SectionIcon icon={ShieldCheck} variant="accent" />
                <div>
                  <CardTitle>Account Access</CardTitle>
                  <p className="mt-1 text-xs text-text-muted">
                    Manage this device session and account availability.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 px-5 pb-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center gap-2.5">
                  <SectionIcon icon={LogOut} />
                  <p className="text-sm font-semibold text-text-primary">Sign Out</p>
                </div>
                <p className="mb-4 text-xs leading-relaxed text-text-muted">
                  End the current browser session on this device.
                </p>
                <SignOutButton />
              </div>

              <div className="rounded-2xl border border-error/25 bg-error/[0.04] p-4">
                <div className="mb-3 flex items-center gap-2.5">
                  <SectionIcon icon={Trash2} variant="danger" />
                  <p className="text-sm font-semibold text-error">Delete Account</p>
                </div>
                <p className="mb-4 text-xs leading-relaxed text-text-muted">
                  Permanently delete your account and all associated data across web and iOS.
                </p>
                <DeleteAccountButton />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryLine({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactElement;
  label: string;
  value: string;
  detail?: string;
  tone?: "advisor" | "brand" | "warning";
}) {
  const toneClass =
    tone === "advisor" ? "text-advisor" : tone === "warning" ? "text-warning" : "text-brand";

  return (
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 text-text-muted [&>svg]:h-4 [&>svg]:w-4`} aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-muted">{label}</p>
        <p className={`mt-0.5 truncate text-sm font-semibold ${tone ? toneClass : "text-text-primary"}`}>
          {value}
        </p>
        {detail && <p className="mt-0.5 text-xs text-text-muted">{detail}</p>}
      </div>
    </div>
  );
}

function formatAccountDate(value: string | undefined) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
