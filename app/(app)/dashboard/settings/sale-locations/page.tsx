import Link from "next/link";
import type { ComponentType } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ChevronLeft,
  CircleCheck,
  MapPinned,
  MapPinPlus,
  Navigation,
  Store,
} from "lucide-react";

export const metadata = { title: "Sale Locations" };

export default function SaleLocationsPage() {
  return (
    <div className="w-full max-w-[1680px]">
      <div className="mb-4 sm:hidden">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 rounded-lg bg-surface-lowest px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Settings
        </Link>
      </div>
      <PageHeader
        title="Sale Locations"
        titleClassName="text-4xl font-bold text-info"
        subtitle="Manage your saleyards and custom sale locations."
        actions={
          <Link href="/dashboard/settings/sale-locations/new">
            <Button variant="sky" size="sm">
              <MapPinPlus className="mr-1.5 h-3.5 w-3.5" />
              Add Location
            </Button>
          </Link>
        }
      />

      <div className="grid w-full max-w-[1400px] grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:self-start">
          <Card className="overflow-hidden">
            <div className="border-b border-white/[0.06] bg-white/[0.03] px-5 py-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
                Location Library
              </p>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-info/20 bg-info/15 text-info">
                  <MapPinned className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-text-primary">Sale points</p>
                  <p className="text-sm text-text-muted">Standard yards plus your private locations.</p>
                </div>
              </div>
            </div>
            <CardContent className="space-y-4 p-5">
              <LocationSummaryLine
                icon={Store}
                label="Standard saleyards"
                value="Included"
                tone="info"
              />
              <LocationSummaryLine
                icon={MapPinPlus}
                label="Custom locations"
                value="None yet"
                tone="brand"
              />
              <LocationSummaryLine
                icon={CircleCheck}
                label="Used by"
                value="Freight and sale workflows"
                tone="success"
              />
              <p className="border-t border-white/[0.06] pt-4 text-xs leading-relaxed text-text-muted">
                Add farm-gate sales, private buyers, or regular delivery points that are not part of
                the standard saleyard list.
              </p>
            </CardContent>
          </Card>
        </aside>

        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info/15">
                <Navigation className="h-4 w-4 text-info" aria-hidden="true" />
              </div>
              <div>
                <CardTitle>Custom Sale Locations</CardTitle>
                <p className="mt-1 text-xs text-text-muted">
                  Build your own shortlist for private sales and repeat delivery points.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
              <EmptyState
                icon={<MapPinPlus className="h-6 w-6 text-info" aria-hidden="true" />}
                title="No custom locations yet"
                description="Standard saleyards are already included. Add custom sale locations such as private sales or farm-gate delivery points."
                actionLabel="Add Location"
                actionHref="/dashboard/settings/sale-locations/new"
                variant="sky"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LocationSummaryLine({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "brand" | "info" | "success";
}) {
  const toneClass =
    tone === "success" ? "text-success" : tone === "info" ? "text-info" : "text-brand";
  const bgClass =
    tone === "success" ? "bg-success/15" : tone === "info" ? "bg-info/15" : "bg-brand/15";

  return (
    <div className="flex items-start gap-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bgClass}`}>
        <Icon className={`h-4 w-4 ${toneClass}`} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-text-muted">{label}</p>
        <p className={`mt-0.5 text-sm font-semibold ${toneClass}`}>{value}</p>
      </div>
    </div>
  );
}
