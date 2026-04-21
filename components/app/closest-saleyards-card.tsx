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
            <div className="bg-brand/15 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
              <MapPin className="text-brand h-3.5 w-3.5" />
            </div>
            <CardTitle>Closest Saleyards</CardTitle>
          </div>
          {hasLocation && yards.length > 0 && (
            <Link
              href="/dashboard/tools/reports/saleyard-comparison"
              className="bg-surface-raised text-text-secondary hover:bg-surface-high hover:text-text-primary inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-xs font-medium transition-colors"
            >
              Compare all
              <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {!hasLocation || yards.length === 0 ? (
          <div className="bg-surface-lowest rounded-lg px-4 py-5 text-center">
            <p className="text-text-secondary text-sm">
              Add a location to your default property to see nearby saleyards.
            </p>
            <Link
              href="/dashboard/properties"
              className="text-brand mt-3 inline-flex items-center gap-1 text-xs font-medium hover:underline"
            >
              Update properties
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <>
            <p className="text-text-muted pb-2 text-xs">
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
                      <p className="text-text-primary truncate text-sm font-semibold">
                        {yard.shortName}
                      </p>
                      {yard.locality && (
                        <p className="text-text-muted truncate text-xs">{yard.locality}</p>
                      )}
                    </div>
                    <div className="ml-4 flex flex-shrink-0 items-center gap-2">
                      <span className="text-text-primary text-sm font-semibold tabular-nums">
                        ${Math.round(yard.value).toLocaleString()}
                      </span>
                      <ChevronRight className="text-text-muted h-3.5 w-3.5" />
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
