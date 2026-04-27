import Link from "next/link";
import type { ComponentType } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, MapPinPlus, Route, Store } from "lucide-react";

export const metadata = { title: "Add Sale Location" };

export default function NewSaleLocationPage() {
  return (
    <div className="w-full max-w-[1680px]">
      <div className="mb-4 sm:hidden">
        <Link
          href="/dashboard/settings/sale-locations"
          className="inline-flex items-center gap-1.5 rounded-lg bg-surface-lowest px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Sale Locations
        </Link>
      </div>
      <PageHeader
        title="Add Sale Location"
        titleClassName="text-4xl font-bold text-info"
        subtitle="Add a custom sale point for private sales or regular delivery runs."
      />

      <div className="grid w-full max-w-[1400px] grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:self-start">
          <Card className="overflow-hidden">
            <div className="border-b border-white/[0.06] bg-white/[0.03] px-5 py-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
                Custom Location
              </p>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-info/20 bg-info/15 text-info">
                  <MapPinPlus className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-text-primary">Coming soon</p>
                  <p className="text-sm text-text-muted">The form is not wired up yet.</p>
                </div>
              </div>
            </div>
            <CardContent className="space-y-4 p-5">
              <InfoLine
                icon={Store}
                label="Good for"
                value="Private sales, farm-gate sales, and delivery points"
              />
              <InfoLine
                icon={Route}
                label="Future use"
                value="Freight estimates and sale planning"
              />
            </CardContent>
          </Card>
        </aside>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info/15">
                <MapPinPlus className="h-4 w-4 text-info" aria-hidden="true" />
              </div>
              <div>
                <CardTitle>Location Details</CardTitle>
                <p className="mt-1 text-xs text-text-muted">
                  This will become the custom sale-location form.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
              <p className="text-sm leading-relaxed text-text-secondary">
                Sale location creation is coming soon. When it is ready, this screen should collect
                the location name, address, state, and any notes needed for sale or freight planning.
              </p>
              <Link
                href="/dashboard/settings/sale-locations"
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-full bg-info/15 px-4 text-xs font-semibold text-info transition-colors hover:bg-info/25"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Back to locations
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoLine({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info/15">
        <Icon className="h-4 w-4 text-info" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-text-muted">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-text-primary">{value}</p>
      </div>
    </div>
  );
}
