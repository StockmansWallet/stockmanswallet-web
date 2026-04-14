import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, DollarSign, Tags, TrendingUp, Calendar } from "lucide-react";

export const revalidate = 0;

export const metadata = {
  title: "Sold Herds",
};

export default async function SoldHerdsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch sold herds with their sales records
  const { data: soldHerds } = await supabase
    .from("herds")
    .select("id, name, breed, category, species, head_count, is_sold, sold_date, sold_price")
    .eq("user_id", user!.id)
    .eq("is_sold", true)
    .eq("is_deleted", false)
    .order("sold_date", { ascending: false });

  // Fetch all sales records for sold herds
  const soldIds = (soldHerds ?? []).map((h) => h.id);
  const { data: salesRecords } = soldIds.length > 0
    ? await supabase
        .from("sales_records")
        .select("herd_id, sale_date, head_count, price_per_kg, pricing_type, price_per_head, total_gross_value, freight_cost, net_value, sale_type, sale_location")
        .eq("user_id", user!.id)
        .in("herd_id", soldIds)
        .order("sale_date", { ascending: false })
    : { data: [] as never[] };

  // Build a map of herd_id -> latest sales record
  const salesMap = new Map<string, typeof salesRecords extends (infer T)[] | null ? T : never>();
  for (const record of salesRecords ?? []) {
    if (!salesMap.has(record.herd_id)) {
      salesMap.set(record.herd_id, record);
    }
  }

  // Stats
  const totalSold = soldHerds?.length ?? 0;
  const totalHeadSold = (salesRecords ?? []).reduce((sum, r) => sum + (r.head_count ?? 0), 0);
  const totalRevenue = (salesRecords ?? []).reduce((sum, r) => sum + (r.net_value ?? 0), 0);
  const avgPricePerKg = (salesRecords ?? []).length > 0
    ? (salesRecords ?? []).reduce((sum, r) => sum + (r.price_per_kg ?? 0), 0) / (salesRecords ?? []).length
    : 0;

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Sold Herds"
        titleClassName="text-4xl font-bold text-brand"
        subtitle="History of sold livestock."
        actions={
          <Link href="/dashboard/herds">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to Herds
            </Button>
          </Link>
        }
      />

      {totalSold === 0 ? (
        <Card>
          <EmptyState
            title="No sold herds yet"
            description="When you sell livestock, they will appear here with their sale details."
            actionLabel="View Herds"
            actionHref="/dashboard/herds"
          />
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <StatCard icon={<Tags className="h-4 w-4" />} label="Herds Sold" value={String(totalSold)} />
            <StatCard icon={<Tags className="h-4 w-4" />} label="Head Sold" value={totalHeadSold.toLocaleString()} />
            <StatCard icon={<DollarSign className="h-4 w-4" />} label="Total Revenue" value={`$${Math.round(totalRevenue).toLocaleString()}`} />
            <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Avg $/kg" value={avgPricePerKg > 0 ? `$${avgPricePerKg.toFixed(2)}` : "\u2014"} />
          </div>

          {/* Sold herds list */}
          <ul className="space-y-3">
            {(soldHerds ?? []).map((herd) => {
              const sale = salesMap.get(herd.id);
              return (
                <li key={herd.id}>
                <Link href={`/dashboard/herds/${herd.id}`}>
                  <Card className="transition-colors hover:bg-white/[0.03]">
                    <div className="flex items-center justify-between p-5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5">
                          <h3 className="truncate font-semibold text-text-primary">{herd.name}</h3>
                          <Badge variant="danger">Sold</Badge>
                        </div>
                        <p className="mt-0.5 text-sm text-text-muted">
                          {herd.breed} {herd.category} - {herd.species}
                        </p>
                        {sale && (
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                            {sale.sale_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(sale.sale_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            )}
                            {sale.head_count > 0 && <span>{sale.head_count} head</span>}
                            {sale.sale_type && <span>{sale.sale_type}</span>}
                            {sale.sale_location && <span>{sale.sale_location}</span>}
                          </div>
                        )}
                      </div>
                      <div className="ml-4 text-right">
                        {sale && sale.net_value > 0 && (
                          <>
                            <p className="text-lg font-bold tabular-nums text-brand">
                              ${Math.round(sale.net_value).toLocaleString()}
                            </p>
                            {sale.price_per_kg > 0 && (
                              <p className="text-xs tabular-nums text-text-muted">
                                ${sale.price_per_kg.toFixed(2)}/kg
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
