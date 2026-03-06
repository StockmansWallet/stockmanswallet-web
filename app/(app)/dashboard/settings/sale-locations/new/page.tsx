import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Add Sale Location" };

export default function NewSaleLocationPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="Add Sale Location" subtitle="Add a custom sale location." />
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-text-muted">Sale location form coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
