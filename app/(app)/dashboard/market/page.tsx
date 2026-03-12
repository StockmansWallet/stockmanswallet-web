import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TrendingUp, TrendingDown, Minus, Activity, ArrowRight } from "lucide-react";

export const revalidate = 0;
export const metadata = { title: "Market" };

function SectionIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
      <Icon className="h-3.5 w-3.5 text-brand" />
    </div>
  );
}

function TrendIcon({ trend }: { trend: string | null }) {
  if (trend === "up") return <TrendingUp className="h-3.5 w-3.5 text-green-400" />;
  if (trend === "down") return <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
  return <Minus className="h-3.5 w-3.5 text-text-muted" />;
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

type PulseSummary = {
  category: string;
  avg_price: number;
  saleyard_count: number;
  latest_date: string;
};

export default async function MarketPage() {
  const supabase = await createClient();

  const [{ data: indicators }, { data: pulseRaw }] = await Promise.all([
    supabase
      .from("mla_national_indicators")
      .select("indicator_code, indicator_name, value, change, trend, report_date")
      .order("report_date", { ascending: false })
      .limit(10),
    supabase.rpc("get_market_pulse_summary").maybeSingle(),
  ]);

  // Deduplicate indicators - keep only the latest per indicator_code
  const indicatorMap = new Map<string, Indicator>();
  for (const ind of (indicators ?? []) as Indicator[]) {
    if (!indicatorMap.has(ind.indicator_code)) {
      indicatorMap.set(ind.indicator_code, ind);
    }
  }
  const uniqueIndicators = Array.from(indicatorMap.values());

  // For pulse summary, fall back to a direct query if the RPC doesn't exist
  let pulseSummary: PulseSummary[] = [];
  if (!pulseRaw) {
    // Direct query: latest avg price per category across saleyards
    const { data: latestDate } = await supabase
      .from("category_prices")
      .select("data_date")
      .neq("saleyard", "National")
      .order("data_date", { ascending: false })
      .limit(1)
      .single();

    if (latestDate) {
      const { data: prices } = await supabase
        .from("category_prices")
        .select("category, final_price_per_kg, saleyard, data_date")
        .neq("saleyard", "National")
        .eq("data_date", latestDate.data_date)
        .limit(5000);

      if (prices && prices.length > 0) {
        const grouped = new Map<string, { total: number; count: number; saleyards: Set<string> }>();
        for (const p of prices) {
          const entry = grouped.get(p.category) ?? { total: 0, count: 0, saleyards: new Set() };
          entry.total += p.final_price_per_kg;
          entry.count += 1;
          entry.saleyards.add(p.saleyard);
          grouped.set(p.category, entry);
        }
        pulseSummary = Array.from(grouped.entries()).map(([category, g]) => ({
          category,
          avg_price: g.total / g.count / 100, // cents to dollars
          saleyard_count: g.saleyards.size,
          latest_date: latestDate.data_date,
        }));
        // Sort by category name
        pulseSummary.sort((a, b) => a.category.localeCompare(b.category));
      }
    }
  }

  const reportDate = uniqueIndicators[0]?.report_date ?? null;

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Market"
        titleClassName="text-4xl font-bold text-brand"
        subtitle="Live livestock market intelligence and price indicators."
      />

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Left column - Market Pulse */}
        <div className="flex-1 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <SectionIcon icon={Activity} />
                  <CardTitle>Market Pulse</CardTitle>
                </div>
                <Link href="/dashboard/market/pulse" className="text-xs font-medium text-brand hover:underline">
                  View all <ArrowRight className="ml-0.5 inline h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {pulseSummary.length === 0 ? (
                <EmptyState
                  title="No saleyard data available"
                  description="Physical saleyard prices will appear here once market data is available."
                />
              ) : (
                <div className="space-y-1">
                  <div className="grid grid-cols-3 gap-4 px-1 pb-2 text-xs font-medium text-text-muted">
                    <span>Category</span>
                    <span className="text-right">Avg $/kg</span>
                    <span className="text-right">Saleyards</span>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {pulseSummary.map((row) => (
                      <div key={row.category} className="grid grid-cols-3 gap-4 px-1 py-3">
                        <p className="text-sm text-text-secondary">{row.category}</p>
                        <p className="text-right text-sm font-semibold tabular-nums text-text-primary">
                          ${row.avg_price.toFixed(2)}
                        </p>
                        <p className="text-right text-sm tabular-nums text-text-muted">
                          {row.saleyard_count}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="pt-2 text-xs text-text-muted">
                    Data from {pulseSummary[0].latest_date}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column - National Indicators */}
        <div className="w-full space-y-4 lg:w-[380px]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <SectionIcon icon={TrendingUp} />
                  <CardTitle>National Indicators</CardTitle>
                </div>
                <Link href="/dashboard/market/indicators" className="text-xs font-medium text-brand hover:underline">
                  View all <ArrowRight className="ml-0.5 inline h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-white/[0.04] p-0 px-5 pb-5">
              {uniqueIndicators.length === 0 ? (
                <p className="py-6 text-center text-sm text-text-muted">No indicator data available.</p>
              ) : (
                uniqueIndicators.map((ind) => (
                  <div key={ind.indicator_code} className="flex items-center justify-between py-3.5">
                    <p className="text-sm text-text-secondary">{ind.indicator_name}</p>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-text-primary">
                          {parseFloat(ind.value).toFixed(2)}{" "}
                          <span className="font-normal text-text-muted">c/kg</span>
                        </p>
                        {formatChange(ind.change) && (
                          <p className={`text-xs tabular-nums ${
                            parseFloat(ind.change!) > 0 ? "text-green-400" : "text-red-400"
                          }`}>
                            {formatChange(ind.change)}
                          </p>
                        )}
                      </div>
                      <TrendIcon trend={ind.trend} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {reportDate && (
            <p className="text-xs text-text-muted">
              Indicator data as of {reportDate}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
