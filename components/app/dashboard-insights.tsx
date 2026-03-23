import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { InsightCard } from "@/components/app/stockman-iq/insight-card";
import type { StockmanIQInsight } from "@/lib/stockman-iq/insight-engine";
import { Lightbulb } from "lucide-react";

export function DashboardInsights({ insights }: { insights: StockmanIQInsight[] }) {
  if (insights.length === 0) return null;

  const topInsights = insights.slice(0, 2);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
              <Lightbulb className="h-3.5 w-3.5 text-brand" />
            </div>
            <CardTitle>Insights</CardTitle>
          </div>
          <Link
            href="/dashboard/insights"
            className="text-xs font-medium text-brand hover:underline"
          >
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-5 pb-5">
        {topInsights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </CardContent>
    </Card>
  );
}
