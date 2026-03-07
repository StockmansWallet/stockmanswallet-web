import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  User,
  Bell,
  MapPinned,
  Database,
  Shield,
  Calculator,
  ChevronRight,
} from "lucide-react";
import { isAdminEmail } from "@/lib/data/admin";

export const revalidate = 0;

export const metadata = { title: "Settings" };

interface NavItemProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  label: string;
  description: string;
}

function NavItem({ href, icon: Icon, iconBg, iconColor, label, description }: NavItemProps) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-white/[0.03]"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-muted">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-text-muted/50 transition-all group-hover:translate-x-0.5 group-hover:text-text-muted" />
    </Link>
  );
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const isAdmin = isAdminEmail(user?.email);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Settings"
        subtitle="Manage your account, preferences, and data."
      />

      <div className="space-y-6">
        {/* Main settings navigation */}
        <Card>
          <CardContent className="divide-y divide-white/[0.04] p-0">
            <NavItem
              href="/dashboard/settings/account"
              icon={User}
              iconBg="bg-brand/15"
              iconColor="text-brand"
              label="Account"
              description="Profile, password, and role"
            />
            <NavItem
              href="/dashboard/settings/notifications"
              icon={Bell}
              iconBg="bg-purple-500/15"
              iconColor="text-purple-400"
              label="Notifications"
              description="Alerts, reminders, and digests"
            />
            <NavItem
              href="/dashboard/settings/sale-locations"
              icon={MapPinned}
              iconBg="bg-sky-500/15"
              iconColor="text-sky-400"
              label="Sale Locations"
              description="Custom saleyards and sale points"
            />
            <NavItem
              href="/dashboard/settings/data"
              icon={Database}
              iconBg="bg-amber-500/15"
              iconColor="text-amber-400"
              label="Data Management"
              description="Clear data, demo datasets"
            />
          </CardContent>
        </Card>

        {/* Admin Tools */}
        {isAdmin && (
          <Card>
            <CardContent className="divide-y divide-white/[0.04] p-0">
              <NavItem
                href="/dashboard/admin/mla-upload"
                icon={Shield}
                iconBg="bg-emerald-500/15"
                iconColor="text-emerald-400"
                label="MLA Data Upload"
                description="Upload MLA CSV files for pricing"
              />
              <NavItem
                href="/dashboard/admin/valuation"
                icon={Calculator}
                iconBg="bg-amber-500/15"
                iconColor="text-amber-400"
                label="Valuation Validator"
                description="Full calculation breakdown and testing"
              />
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
