import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Add Yard Book Item" };

export default function NewYardBookItemPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Add Item" subtitle="Add a new item to your yard book." />
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-text-muted">Yard book item form coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
