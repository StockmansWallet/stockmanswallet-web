import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Market Pulse" };

export default function MarketPulsePage() {
  return (
    <div className="max-w-6xl">
      <PageHeader title="Market Pulse" subtitle="Physical sales reports and regional price activity." />
      <Card>
        <EmptyState
          title="Market pulse coming soon"
          description="Live saleyard sale reports, regional price comparisons, and physical market activity will appear here."
        />
      </Card>
    </div>
  );
}
