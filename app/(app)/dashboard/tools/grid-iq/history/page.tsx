import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Kill Sheet History — Grid IQ" };

export default function GridIQHistoryPage() {
  return (
    <div className="max-w-6xl">
      <PageHeader title="Kill Sheet History" subtitle="Track historical kill sheet performance." />
      <Card>
        <EmptyState
          title="No kill sheets yet"
          description="Upload kill sheets to start tracking your over-the-hooks performance."
          actionLabel="Upload Kill Sheet"
          actionHref="/dashboard/tools/grid-iq/upload"
        />
      </Card>
    </div>
  );
}
