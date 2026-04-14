import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen } from "lucide-react";

interface YardBookItem {
  id: string;
  title: string;
  event_date: string;
  category_raw: string | null;
}

function formatDate(dateStr: string): string {
  // Extract date portion and parse as local time
  const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr.split(" ")[0];
  const [y, m, day] = datePart.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;

  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export function ComingUpCard({ items, limit = 3 }: { items: YardBookItem[]; limit?: number }) {
  const visible = items.slice(0, limit);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-lime-500/15">
              <BookOpen className="h-3.5 w-3.5 text-lime-400" />
            </div>
            <CardTitle>Yard Book – Coming Up</CardTitle>
          </div>
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
        <CardContent className="divide-y divide-white/[0.06] px-5 pb-5">
          {visible.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/tools/yard-book/${item.id}`}
              className="flex items-center justify-between py-3 transition-colors hover:opacity-80"
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
