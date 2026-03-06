import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Sales Summary" };

export default function SalesSummaryPage() {
  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Sales Summary"
        subtitle="Transaction history and performance metrics."
        actions={<Button variant="secondary" size="sm">Export PDF</Button>}
      />
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-text-muted">Sales summary report coming soon. Will show all sales records, revenue by period, average price per head, and performance trends.</p>
        </CardContent>
      </Card>
    </div>
  );
}
