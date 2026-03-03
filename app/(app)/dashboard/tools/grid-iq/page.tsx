import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Grid IQ" };

export default function GridIQPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Grid IQ"
        subtitle="Analyse processor grids and kill sheets. Compare saleyard vs over-the-hooks."
        actions={
          <Link href="/dashboard/tools/grid-iq/upload">
            <Button>Upload Grid</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-1 text-sm font-semibold text-text-primary">Processor Grids</h3>
            <p className="mb-4 text-xs text-text-muted">Upload and analyse processor price grids to find the best kill specification for your cattle.</p>
            <Link href="/dashboard/tools/grid-iq/upload">
              <Button variant="secondary" size="sm">Upload Grid</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-1 text-sm font-semibold text-text-primary">Kill Sheet History</h3>
            <p className="mb-4 text-xs text-text-muted">Track historical kill sheet performance and compare against market benchmarks.</p>
            <Link href="/dashboard/tools/grid-iq/history">
              <Button variant="secondary" size="sm">View History</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <EmptyState
            title="No grids uploaded yet"
            description="Upload a processor grid or kill sheet PDF to get started with Grid IQ analysis."
            actionLabel="Upload Grid"
            actionHref="/dashboard/tools/grid-iq/upload"
          />
        </Card>
      </div>
    </div>
  );
}
