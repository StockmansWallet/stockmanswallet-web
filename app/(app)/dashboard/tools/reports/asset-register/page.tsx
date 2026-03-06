import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Asset Register" };

export default function AssetRegisterPage() {
  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Asset Register"
        subtitle="Complete herd listing with current valuations."
        actions={<Button variant="secondary">Export PDF</Button>}
      />
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-text-muted">Asset register report coming soon. Will show all active herds with valuations, head counts, weights, and property assignments.</p>
        </CardContent>
      </Card>
    </div>
  );
}
