import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export const metadata = { title: "Market Indicators" };

const PLACEHOLDER_INDICATORS = [
  { name: "Eastern Young Cattle Indicator (EYCI)", value: "\u2014", unit: "c/kg CW" },
  { name: "Heavy Steer Indicator", value: "\u2014", unit: "c/kg CW" },
  { name: "Feeder Steer Indicator", value: "\u2014", unit: "c/kg LW" },
  { name: "Restocker Steer Indicator", value: "\u2014", unit: "c/kg LW" },
  { name: "Medium Cow Indicator", value: "\u2014", unit: "c/kg CW" },
  { name: "Eastern States Trade Lamb Indicator", value: "\u2014", unit: "c/kg CW" },
];

export default function IndicatorsPage() {
  return (
    <div className="max-w-4xl">
      <PageHeader title="Indicators" subtitle="National MLA livestock price indicators." />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
              <TrendingUp className="h-3.5 w-3.5 text-brand" />
            </div>
            <CardTitle>National Indicators</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 divide-y divide-white/[0.04]">
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

      <p className="mt-4 text-xs text-text-muted">Market data integration coming soon.</p>
    </div>
  );
}
