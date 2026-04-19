import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { InsightCard } from "@/components/app/brangus/insight-card";
import { evaluateInsights } from "@/lib/brangus/insight-engine";

export const metadata = { title: "Insights" };

export default async function InsightsPage() {
  const insights = await evaluateInsights();

  return (
    <div className="max-w-4xl">
      <PageHeader feature="insights"
        title="Insights"
        titleClassName="text-4xl font-bold text-insights"
        subtitle="AI-powered intelligence for your operation."
      />

      {insights.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-insights/10">
              <Sparkles className="h-6 w-6 text-insights" />
            </div>
            <p className="text-sm font-medium text-text-primary">No insights yet</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-text-muted">
              Add some herds to your portfolio and insights will appear here automatically.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
