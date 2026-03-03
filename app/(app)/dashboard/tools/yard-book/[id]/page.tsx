import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Yard Book Item" };

export default async function YardBookItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Yard Book Item" subtitle={id} />
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-text-muted">Item detail coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
