import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MapPin, ChevronRight } from "lucide-react";

interface ClosestSaleyardsCardProps {
  yards: Array<{ name: string; shortName: string; locality?: string; value: number }>;
  hasLocation: boolean;
}

export function ClosestSaleyardsCard({ yards, hasLocation }: ClosestSaleyardsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
              <MapPin className="h-3.5 w-3.5 text-brand" />
            </div>
            <CardTitle>Closest Saleyards</CardTitle>
          </div>
          {hasLocation && yards.length > 0 && (
            <Link
              href="/dashboard/tools/reports/saleyard-comparison"
              className="text-xs font-medium text-brand hover:underline"
            >
              Compare all
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {!hasLocation || yards.length === 0 ? (
          <div className="rounded-lg bg-surface-lowest px-4 py-5 text-center">
            <p className="text-sm text-text-secondary">
              Add a location to your default property to see nearby saleyards.
            </p>
            <Link
              href="/dashboard/properties"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
            >
              Update properties
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <>
            <p className="pb-2 text-xs text-text-muted">
              Portfolio value if sold at each saleyard.
            </p>
            <ul className="divide-y divide-white/5">
              {yards.map((yard) => (
                <li key={yard.name}>
                  <Link
                    href="/dashboard/tools/reports/saleyard-comparison"
                    className="-mx-2 flex items-center justify-between rounded-lg px-2 py-3 transition-colors hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {yard.shortName}
                      </p>
                      {yard.locality && (
                        <p className="truncate text-xs text-text-muted">{yard.locality}</p>
                      )}
                    </div>
                    <div className="ml-4 flex flex-shrink-0 items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums text-text-primary">
                        ${Math.round(yard.value).toLocaleString()}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-text-muted" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
