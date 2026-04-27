import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { User, Bell, BellRing, MapPinned, Database, ChevronRight, CreditCard } from "lucide-react";

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
    <Link href={href} className="group block h-full">
      <Card className="h-full transition-colors hover:bg-white/[0.07]">
        <CardContent className="flex h-full items-start gap-3.5 p-4">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-primary">{label}</p>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">{description}</p>
          </div>
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-text-muted transition-all group-hover:translate-x-0.5 group-hover:text-text-secondary" />
        </CardContent>
      </Card>
    </Link>
  );
}

export default function SettingsPage() {
  return (
    <div className="w-full max-w-[1680px]">
      <PageHeader
        title="Settings"
        titleClassName="text-4xl font-bold text-brand"
        subtitle="Manage your account, preferences, and data."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
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
          iconBg="bg-markets/15"
          iconColor="text-markets"
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
      </div>
    </div>
  );
}
