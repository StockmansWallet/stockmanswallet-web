import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Add Sale Location" };

export default function NewSaleLocationPage() {
  return (
    <div>
      <PageHeader title="Add Sale Location" subtitle="Add a custom sale location." />
      <Card>
        <CardContent className="p-6">
          <p className="text-text-muted text-sm">Sale location form coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
