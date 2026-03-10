import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TrendingUp, Activity } from "lucide-react";

export const metadata = { title: "Market" };

const PLACEHOLDER_INDICATORS = [
  { name: "Eastern Young Cattle Indicator (EYCI)", value: "\u2014", unit: "c/kg CW" },
  { name: "Heavy Steer Indicator", value: "\u2014", unit: "c/kg CW" },
  { name: "Feeder Steer Indicator", value: "\u2014", unit: "c/kg LW" },
  { name: "Restocker Steer Indicator", value: "\u2014", unit: "c/kg LW" },
  { name: "Medium Cow Indicator", value: "\u2014", unit: "c/kg CW" },
  { name: "Eastern States Trade Lamb Indicator", value: "\u2014", unit: "c/kg CW" },
];

function SectionIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
      <Icon className="h-3.5 w-3.5 text-brand" />
    </div>
  );
}

export default function MarketPage() {
  return (
    <div className="max-w-6xl">
      <PageHeader title="Market" titleClassName="text-4xl font-bold text-brand" subtitle="Live livestock market intelligence and price indicators." />

      <div className="space-y-4">
        {/* National Indicators */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <SectionIcon icon={TrendingUp} />
              <CardTitle>National Indicators</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-white/[0.04] p-0 px-5 pb-5">
            {PLACEHOLDER_INDICATORS.map((ind) => (
              <div key={ind.name} className="flex items-center justify-between py-3.5">
                <p className="text-sm text-text-secondary">{ind.name}</p>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-text-primary">
                    {ind.value} <span className="font-normal text-text-muted">{ind.unit}</span>
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Market Pulse */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <SectionIcon icon={Activity} />
              <CardTitle>Market Pulse</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="Market pulse coming soon"
              description="Live saleyard sale reports, regional price comparisons, and physical market activity will appear here."
            />
          </CardContent>
        </Card>

        <p className="text-xs text-text-muted">Market data integration coming soon.</p>
      </div>
    </div>
  );
}
