import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Saleyard Comparison" };

export default function SaleyardComparisonPage() {
  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Saleyard Comparison"
        subtitle="Compare prices across saleyards to find the best market."
        actions={<Button variant="secondary">Export PDF</Button>}
      />
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-text-muted">Saleyard comparison coming soon. Will show price comparisons across your selected saleyards for your herd categories.</p>
        </CardContent>
      </Card>
    </div>
  );
}
