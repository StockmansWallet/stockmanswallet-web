import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Upload, History, ChevronRight } from "lucide-react";

export const metadata = { title: "Grid IQ" };

export default function GridIQPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Grid IQ"
        subtitle="Analyse processor grids and kill sheets. Compare saleyard vs over-the-hooks."
        actions={
          <Link href="/dashboard/tools/grid-iq/upload">
            <Button>
              <Upload className="mr-1.5 h-4 w-4" />
              Upload Grid
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <Link href="/dashboard/tools/grid-iq/upload">
          <Card className="group h-full transition-all hover:bg-white/[0.07]">
            <CardContent className="flex items-start gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
                <Upload className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-text-primary">Processor Grids</h3>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">Upload and analyse processor price grids to find the best kill specification for your cattle.</p>
              </div>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-text-muted/50 transition-all group-hover:translate-x-0.5 group-hover:text-text-muted" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/tools/grid-iq/history">
          <Card className="group h-full transition-all hover:bg-white/[0.07]">
            <CardContent className="flex items-start gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
                <History className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-text-primary">Kill Sheet History</h3>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">Track historical kill sheet performance and compare against market benchmarks.</p>
              </div>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-text-muted/50 transition-all group-hover:translate-x-0.5 group-hover:text-text-muted" />
            </CardContent>
          </Card>
        </Link>
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
