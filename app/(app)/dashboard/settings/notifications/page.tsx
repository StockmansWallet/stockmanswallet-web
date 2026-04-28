import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Bell,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  ExternalLink,
  Mail,
  MessageCircle,
  Smartphone,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export const metadata = { title: "Notifications" };

const notificationGroups = [
  {
    title: "Yard Book",
    description: "Operational reminders for jobs and run sheets.",
    icon: ClipboardList,
    tone: "yard-book",
    items: [
      {
        label: "Task reminders",
        description: "Get notified before yard book items are due.",
        status: "Coming soon",
      },
      {
        label: "Overdue tasks",
        description: "Alert when tasks are past their due date.",
        status: "Coming soon",
      },
    ],
  },
  {
    title: "Markets",
    description: "Price movement alerts and market summaries.",
    icon: TrendingUp,
    tone: "markets",
    items: [
      {
        label: "Price alerts",
        description: "Notify when cattle prices hit your targets.",
        status: "Manage",
        href: "/dashboard/settings/alerts",
      },
      {
        label: "Market reports",
        description: "Weekly market summary digest.",
        status: "Coming soon",
      },
    ],
  },
  {
    title: "Ch 40",
    description: "Connection requests, chat messages, and shared activity.",
    icon: MessageCircle,
    tone: "producer-network",
    items: [
      {
        label: "Connection requests",
        description: "Know when another producer sends or accepts a request.",
        status: "In app",
      },
      {
        label: "Messages",
        description: "Unread producer-network conversations show in the sidebar.",
        status: "In app",
      },
    ],
  },
];

const channelStatus = [
  {
    label: "In-app alerts",
    description: "Sidebar badges and live activity inside Stockman's Wallet.",
    icon: Bell,
    status: "Active",
    active: true,
  },
  {
    label: "Email digests",
    description: "Weekly summaries and scheduled report emails.",
    icon: Mail,
    status: "Coming soon",
    active: false,
  },
  {
    label: "iOS push",
    description: "Push notifications from the mobile app when available.",
    icon: Smartphone,
    status: "iOS app",
    active: false,
  },
];

export default function NotificationsPage() {
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
        title="Notifications"
        titleClassName="text-4xl font-bold text-violet"
        subtitle="Manage your alerts and reminders."
      />

      <div className="grid w-full max-w-[1400px] grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:self-start">
          <Card className="overflow-hidden">
            <div className="border-b border-white/[0.06] bg-white/[0.03] px-5 py-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
                Notification Centre
              </p>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.08] bg-violet/15 text-violet">
                  <BellRing className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-text-primary">Alerts & reminders</p>
                  <p className="text-sm text-text-muted">Choose how updates reach you.</p>
                </div>
              </div>
            </div>
            <CardContent className="space-y-4 p-5">
              {channelStatus.map((channel) => (
                <ChannelRow key={channel.label} {...channel} />
              ))}
              <p className="border-t border-white/[0.06] pt-4 text-xs leading-relaxed text-text-muted">
                Preferences will expand as email digests and push notifications roll out.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-markets/15">
                  <CalendarClock className="h-3.5 w-3.5 text-markets" aria-hidden="true" />
                </div>
                <p className="text-sm font-semibold text-text-primary">Price Alert Rules</p>
              </div>
              <p className="mb-4 text-xs leading-relaxed text-text-muted">
                Create target-price rules for saleyards and categories from the dedicated price
                alerts page.
              </p>
              <Link
                href="/dashboard/settings/alerts"
                className="inline-flex h-9 items-center gap-2 rounded-full bg-markets/15 px-4 text-xs font-semibold text-markets transition-colors hover:bg-markets/25"
              >
                Manage alerts
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-4">
          {notificationGroups.map((group) => (
            <NotificationGroup key={group.title} group={group} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ChannelRow({
  label,
  description,
  icon: Icon,
  status,
  active,
}: {
  label: string;
  description: string;
  icon: LucideIcon;
  status: string;
  active: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-text-primary">{label}</p>
          <StatusPill label={status} active={active} />
        </div>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">{description}</p>
      </div>
    </div>
  );
}

function NotificationGroup({ group }: { group: (typeof notificationGroups)[number] }) {
  const Icon = group.icon;
  const toneClasses = getToneClasses(group.tone);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneClasses.bg}`}>
              <Icon className={`h-4 w-4 ${toneClasses.text}`} aria-hidden="true" />
            </div>
            <div>
              <CardTitle>{group.title}</CardTitle>
              <p className="mt-1 text-xs text-text-muted">{group.description}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
          {group.items.map((item) => (
            <NotificationRow key={item.label} item={item} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationRow({
  item,
}: {
  item: {
    label: string;
    description: string;
    status: string;
    href?: string;
  };
}) {
  const content = (
    <>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text-primary">{item.label}</p>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">{item.description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {item.href ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-markets/15 px-3 py-1 text-xs font-semibold text-markets">
            {item.status}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </span>
        ) : (
          <StatusPill label={item.status} active={item.status === "In app"} />
        )}
      </div>
    </>
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        className="flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-white/[0.04]"
      >
        {content}
      </Link>
    );
  }

  return <div className="flex items-center justify-between gap-4 px-4 py-4">{content}</div>;
}

function StatusPill({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        active ? "bg-success/15 text-success" : "bg-white/[0.05] text-text-muted"
      }`}
    >
      {active && <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
      {label}
    </span>
  );
}

function getToneClasses(tone: string) {
  switch (tone) {
    case "yard-book":
      return { bg: "bg-yard-book/15", text: "text-yard-book" };
    case "markets":
      return { bg: "bg-markets/15", text: "text-markets" };
    case "producer-network":
      return { bg: "bg-producer-network/15", text: "text-producer-network" };
    default:
      return { bg: "bg-violet/15", text: "text-violet" };
  }
}
