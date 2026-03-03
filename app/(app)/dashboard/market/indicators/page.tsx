import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const metadata = { title: "Market Indicators" };

const PLACEHOLDER_INDICATORS = [
  { name: "Eastern Young Cattle Indicator (EYCI)", value: "—", unit: "c/kg CW", change: "" },
  { name: "Heavy Steer Indicator", value: "—", unit: "c/kg CW", change: "" },
  { name: "Feeder Steer Indicator", value: "—", unit: "c/kg LW", change: "" },
  { name: "Restocker Steer Indicator", value: "—", unit: "c/kg LW", change: "" },
  { name: "Medium Cow Indicator", value: "—", unit: "c/kg CW", change: "" },
  { name: "Eastern States Trade Lamb Indicator", value: "—", unit: "c/kg CW", change: "" },
];

export default function IndicatorsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Indicators" subtitle="National MLA livestock price indicators." />

      <Card>
        <CardHeader>
          <CardTitle>National Indicators</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 divide-y divide-black/5 dark:divide-white/5">
          {PLACEHOLDER_INDICATORS.map((ind) => (
            <div key={ind.name} className="flex items-center justify-between py-3">
              <p className="text-sm text-text-secondary">{ind.name}</p>
              <div className="text-right">
                <p className="text-sm font-semibold text-text-primary">{ind.value} <span className="font-normal text-text-muted">{ind.unit}</span></p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-text-muted">Market data integration coming soon.</p>
    </div>
  );
}
