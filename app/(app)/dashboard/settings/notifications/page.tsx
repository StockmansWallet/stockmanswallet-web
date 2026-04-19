import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "Notifications" };

const notificationGroups = [
  {
    title: "Yard Book",
    items: [
      { label: "Task reminders", description: "Get notified before yard book items are due" },
      { label: "Overdue tasks", description: "Alert when tasks are past their due date" },
    ],
  },
  {
    title: "Market",
    items: [
      { label: "Price alerts", description: "Notify when cattle prices hit your targets" },
      { label: "Market reports", description: "Weekly market summary digest" },
    ],
  },
];

export default function NotificationsPage() {
  return (
    <div className="max-w-4xl">
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

      <div className="space-y-6">
        {notificationGroups.map((group) => (
          <Card key={group.title}>
            <CardHeader><CardTitle>{group.title}</CardTitle></CardHeader>
            <CardContent className="divide-y divide-white/[0.04] p-0">
              {group.items.map((item) => (
                <div key={item.label} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{item.label}</p>
                    <p className="text-xs text-text-muted">{item.description}</p>
                  </div>
                  <div className="h-6 w-10 rounded-full bg-white/8 ring-1 ring-inset ring-white/10" aria-label="Toggle coming soon" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
        <p className="text-xs text-text-muted">Notification preferences coming soon.</p>
      </div>
    </div>
  );
}
