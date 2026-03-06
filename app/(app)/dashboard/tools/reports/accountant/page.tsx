import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Accountant Report" };

export default function AccountantReportPage() {
  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Accountant Report"
        subtitle="Professional summary report for your accountant or bank manager."
        actions={<Button variant="secondary" size="sm">Export PDF</Button>}
      />
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-text-muted">Accountant report coming soon. Will include portfolio valuation, asset breakdown, sales history, and financial summary suitable for professional use.</p>
        </CardContent>
      </Card>
    </div>
  );
}
