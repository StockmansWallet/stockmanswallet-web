import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Activity } from "lucide-react";

export const revalidate = 0;
export const metadata = { title: "Market Pulse" };

type SaleyardPrice = {
  category: string;
  saleyard: string;
  state: string;
  avg_price: number;
  weight_range: string | null;
  sale_count: number;
};

type CategoryGroup = {
  category: string;
  saleyards: SaleyardPrice[];
  overall_avg: number;
};

export default async function MarketPulsePage() {
  const supabase = await createClient();

  // Get the latest data_date with saleyard prices
  const { data: latestRow } = await supabase
    .from("category_prices")
    .select("data_date")
    .neq("saleyard", "National")
    .order("data_date", { ascending: false })
    .limit(1)
    .single();

  let categories: CategoryGroup[] = [];
  let dataDate: string | null = null;

  if (latestRow) {
    dataDate = latestRow.data_date;

    const { data: prices } = await supabase
      .from("category_prices")
      .select("category, final_price_per_kg, saleyard, state, weight_range, data_date")
      .neq("saleyard", "National")
      .eq("data_date", dataDate)
      .order("category")
      .limit(10000);

    if (prices && prices.length > 0) {
      // Group by category, then by saleyard
      const catMap = new Map<string, Map<string, { total: number; count: number; state: string; weight_range: string | null }>>();

      for (const p of prices) {
        if (!catMap.has(p.category)) catMap.set(p.category, new Map());
        const syMap = catMap.get(p.category)!;
        const entry = syMap.get(p.saleyard) ?? { total: 0, count: 0, state: p.state, weight_range: p.weight_range };
        entry.total += p.final_price_per_kg;
        entry.count += 1;
        syMap.set(p.saleyard, entry);
      }

      categories = Array.from(catMap.entries())
        .map(([category, syMap]) => {
          const saleyards = Array.from(syMap.entries())
            .map(([saleyard, g]) => ({
              category,
              saleyard,
              state: g.state,
              avg_price: g.total / g.count / 100, // cents to dollars
              weight_range: g.weight_range,
              sale_count: g.count,
            }))
            .sort((a, b) => b.avg_price - a.avg_price);

          const overallTotal = saleyards.reduce((s, sy) => s + sy.avg_price, 0);
          return {
            category,
            saleyards,
            overall_avg: overallTotal / saleyards.length,
          };
        })
        .sort((a, b) => a.category.localeCompare(b.category));
    }
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Market Pulse"
        subtitle="Physical saleyard prices by category."
      />

      {categories.length === 0 ? (
        <Card>
          <EmptyState
            title="No saleyard data available"
            description="Physical saleyard prices will appear here once market data is available."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {dataDate && (
            <p className="text-xs text-text-muted">Latest sale data from {dataDate}.</p>
          )}

          {categories.map((cat) => (
            <Card key={cat.category}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
                      <Activity className="h-3.5 w-3.5 text-brand" />
                    </div>
                    <CardTitle>{cat.category}</CardTitle>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-text-primary">
                    avg ${cat.overall_avg.toFixed(2)}/kg
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {/* Header row */}
                <div className="grid grid-cols-4 gap-2 pb-2 text-xs font-medium text-text-muted">
                  <span className="col-span-2">Saleyard</span>
                  <span className="text-right">$/kg</span>
                  <span className="text-right">Sales</span>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {cat.saleyards.map((sy) => (
                    <div key={sy.saleyard} className="grid grid-cols-4 gap-2 py-2.5">
                      <div className="col-span-2 min-w-0">
                        <p className="truncate text-sm text-text-secondary">{sy.saleyard}</p>
                        <p className="text-xs text-text-muted">
                          {sy.state}
                          {sy.weight_range ? ` - ${sy.weight_range} kg` : ""}
                        </p>
                      </div>
                      <p className="text-right text-sm font-semibold tabular-nums text-text-primary">
                        ${sy.avg_price.toFixed(2)}
                      </p>
                      <p className="text-right text-sm tabular-nums text-text-muted">
                        {sy.sale_count}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
