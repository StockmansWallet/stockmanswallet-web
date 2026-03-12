import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export const revalidate = 0;
export const metadata = { title: "Market Indicators" };

function TrendIcon({ trend }: { trend: string | null }) {
  if (trend === "up") return <TrendingUp className="h-3.5 w-3.5 text-green-400" />;
  if (trend === "down") return <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
  return <Minus className="h-3.5 w-3.5 text-text-muted" />;
}

function trendColor(trend: string | null) {
  if (trend === "up") return "text-green-400";
  if (trend === "down") return "text-red-400";
  return "text-text-muted";
}

function formatChange(change: string | null) {
  if (!change) return null;
  const num = parseFloat(change);
  if (num === 0) return null;
  const sign = num > 0 ? "+" : "";
  return `${sign}${num.toFixed(2)}`;
}

type Indicator = {
  indicator_code: string;
  indicator_name: string;
  value: string;
  change: string | null;
  trend: string | null;
  report_date: string;
};

export default async function IndicatorsPage() {
  const supabase = await createClient();

  const { data: indicators } = await supabase
    .from("mla_national_indicators")
    .select("indicator_code, indicator_name, value, change, trend, report_date")
    .order("report_date", { ascending: false })
    .limit(20);

  // Deduplicate - keep only the latest per indicator_code
  const indicatorMap = new Map<string, Indicator>();
  for (const ind of (indicators ?? []) as Indicator[]) {
    if (!indicatorMap.has(ind.indicator_code)) {
      indicatorMap.set(ind.indicator_code, ind);
    }
  }
  const uniqueIndicators = Array.from(indicatorMap.values());
  const reportDate = uniqueIndicators[0]?.report_date ?? null;

  return (
    <div className="max-w-6xl">
      <PageHeader title="National Indicators" subtitle="MLA national livestock price indicators." />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
                <TrendingUp className="h-3.5 w-3.5 text-brand" />
              </div>
              <CardTitle>National Indicators</CardTitle>
            </div>
            {reportDate && (
              <span className="text-xs text-text-muted">as of {reportDate}</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-white/[0.04] px-5 pb-5">
          {uniqueIndicators.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">
              No indicator data available. Data will appear once the MLA scraper has run.
            </p>
          ) : (
            uniqueIndicators.map((ind) => {
              const changeText = formatChange(ind.change);
              return (
                <div key={ind.indicator_code} className="flex items-center justify-between py-3.5">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">{ind.indicator_name}</p>
                    <p className="text-xs text-text-muted">{ind.indicator_code}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-text-primary">
                        {parseFloat(ind.value).toFixed(2)}{" "}
                        <span className="font-normal text-text-muted">c/kg</span>
                      </p>
                      {changeText && (
                        <p className={`text-xs tabular-nums ${trendColor(ind.trend)}`}>
                          {changeText} c/kg
                        </p>
                      )}
                    </div>
                    <TrendIcon trend={ind.trend} />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
