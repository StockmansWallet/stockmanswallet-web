import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

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
    <div className="max-w-3xl">
      <PageHeader title="Notifications" subtitle="Manage your alerts and reminders." />

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
