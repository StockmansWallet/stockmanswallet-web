import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName = user?.user_metadata?.first_name || "Stockman";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={`G'day, ${firstName}`}
        subtitle="Here's your farm at a glance."
      />

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Portfolio Value" value="—" />
        <StatCard label="Total Head" value="—" />
        <StatCard label="Properties" value="—" />
        <StatCard label="Avg $/Head" value="—" />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Overview</CardTitle>
          </CardHeader>
          <EmptyState
            title="No herds yet"
            description="Your portfolio will appear here once your herds are synced. Add herds from your iOS app or create them here."
            actionLabel="Add Herd"
            actionHref="/dashboard/portfolio"
          />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Market Snapshot</CardTitle>
          </CardHeader>
          <EmptyState
            title="Market data loading"
            description="Live MLA cattle indicators and recent saleyard results will appear here."
          />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Yard Book</CardTitle>
          </CardHeader>
          <EmptyState
            title="No upcoming events"
            description="Your yard book events and reminders will show here."
            actionLabel="Open Yard Book"
            actionHref="/dashboard/tools"
          />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stockman IQ Insights</CardTitle>
          </CardHeader>
          <EmptyState
            title="No insights yet"
            description="AI-powered insights about your herd performance and market opportunities will appear here."
            actionLabel="Chat with Brangus"
            actionHref="/dashboard/stockman-iq"
          />
        </Card>
      </div>
    </div>
  );
}
