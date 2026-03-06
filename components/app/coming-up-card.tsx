import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen } from "lucide-react";

interface YardBookItem {
  id: string;
  title: string;
  event_date: string;
  event_type: string | null;
  category_raw: string | null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;

  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export function ComingUpCard({ items }: { items: YardBookItem[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Coming Up</CardTitle>
          <Link
            href="/dashboard/tools/yard-book"
            className="text-xs font-medium text-brand hover:underline"
          >
            View all
          </Link>
        </div>
      </CardHeader>
      {items.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6 text-brand" />}
          title="Nothing coming up"
          description="Add events to your Yard Book to see them here."
          actionLabel="Open Yard Book"
          actionHref="/dashboard/tools/yard-book"
        />
      ) : (
        <CardContent className="divide-y divide-white/5 px-5 pb-5">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/tools/yard-book/${item.id}`}
              className="-mx-2 flex items-center justify-between rounded-lg px-2 py-3 transition-colors hover:bg-white/[0.03]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">
                  {item.title}
                </p>
                {item.category_raw && (
                  <p className="text-xs text-text-muted">{item.category_raw}</p>
                )}
              </div>
              <Badge variant="default" className="ml-3 flex-shrink-0">
                {formatDate(item.event_date)}
              </Badge>
            </Link>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
