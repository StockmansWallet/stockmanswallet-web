import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  User,
  Bell,
  BellRing,
  MapPinned,
  Database,
  ChevronRight,
  FlaskConical,
  CreditCard,
} from "lucide-react";
import { isAdminUser } from "@/lib/data/admin";

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
      <ChevronRight className="h-4 w-4 shrink-0 text-text-muted transition-all group-hover:translate-x-0.5 group-hover:text-text-secondary" />
    </Link>
  );
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const isAdmin = await isAdminUser(supabase, user?.id);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Settings"
        titleClassName="text-4xl font-bold text-brand"
        subtitle="Manage your account, preferences, and data."
      />

      <div className="space-y-6">
        {/* Main settings navigation */}
        <Card>
          <CardContent className="divide-y divide-white/[0.06] p-0">
            <NavItem
              href="/dashboard/settings/profile"
              icon={User}
              iconBg="bg-brand/15"
              iconColor="text-brand"
              label="Profile"
              description="Name, contact details, bio, and visibility"
            />
            <NavItem
              href="/dashboard/settings/account"
              icon={CreditCard}
              iconBg="bg-warning/15"
              iconColor="text-warning"
              label="Account"
              description="Subscription, password, and account management"
            />
            <NavItem
              href="/dashboard/settings/notifications"
              icon={Bell}
              iconBg="bg-violet/15"
              iconColor="text-violet"
              label="Notifications"
              description="Alerts, reminders, and digests"
            />
            <NavItem
              href="/dashboard/settings/alerts"
              icon={BellRing}
              iconBg="bg-rose-500/15"
              iconColor="text-rose-400"
              label="Price alerts"
              description="Notify me when categories or saleyards cross a target"
            />
            <NavItem
              href="/dashboard/settings/sale-locations"
              icon={MapPinned}
              iconBg="bg-info/15"
              iconColor="text-info"
              label="Sale Locations"
              description="Custom saleyards and sale points"
            />
            <NavItem
              href="/dashboard/settings/data"
              icon={Database}
              iconBg="bg-warning/15"
              iconColor="text-warning"
              label="Data Management"
              description="Clear all data"
            />
            <NavItem
              href="/dashboard/settings/demo"
              icon={FlaskConical}
              iconBg="bg-emerald/15"
              iconColor="text-emerald"
              label="Demo Data"
              description="Load sample herds to explore the app"
            />
          </CardContent>
        </Card>


      </div>
    </div>
  );
}
