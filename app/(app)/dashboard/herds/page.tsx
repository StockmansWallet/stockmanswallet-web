import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { HerdsTable } from "./herds-table";
import { Plus, Tags, Layers, Beef, Scale } from "lucide-react";

export const metadata = {
  title: "Herds",
};

export default async function HerdsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let { data: herds, error } = await supabase
    .from("herd_groups")
    .select("*, properties(property_name)")
    .eq("user_id", user!.id)
    .eq("is_sold", false)
    .eq("is_deleted", false)
    .order("name");

  // Fallback: if the join fails, query without it so herds still display
  if (error && !herds) {
    const fallback = await supabase
      .from("herd_groups")
      .select("*")
      .eq("user_id", user!.id)
      .eq("is_sold", false)
      .eq("is_deleted", false)
      .order("name");
    herds = fallback.data?.map((h) => ({ ...h, properties: null })) ?? null;
  }

  const totalHead =
    herds?.reduce((sum, h) => sum + (h.head_count ?? 0), 0) ?? 0;

  const speciesCounts = herds?.reduce(
    (acc, h) => {
      acc[h.species] = (acc[h.species] || 0) + (h.head_count ?? 0);
      return acc;
    },
    {} as Record<string, number>
  );

  const avgWeight =
    herds && herds.length > 0
      ? Math.round(
          herds.reduce((sum, h) => sum + (h.current_weight ?? 0), 0) /
            herds.filter((h) => h.current_weight > 0).length || 0
        )
      : 0;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Herds"
        subtitle="Manage your livestock herds."
        actions={
          <Link href="/dashboard/herds/new">
            <Button>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Herd
            </Button>
          </Link>
        }
      />

      {!herds || herds.length === 0 ? (
        <Card>
          <EmptyState
            title="No herds yet"
            description="Add your first herd to start tracking your livestock."
            actionLabel="Add Herd"
            actionHref="/dashboard/herds/new"
          />
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-inset ring-white/8 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15">
                  <Tags className="h-4 w-4 text-brand" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text-muted">Total Head</p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums text-text-primary">{totalHead.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-inset ring-white/8 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15">
                  <Layers className="h-4 w-4 text-brand" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text-muted">Herds</p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums text-text-primary">{herds.length}</p>
                </div>
              </div>
            </div>

            {speciesCounts &&
              Object.entries(speciesCounts)
                .slice(0, 1)
                .map(([sp, count]) => (
                  <div key={sp} className="rounded-2xl bg-white/5 p-4 ring-1 ring-inset ring-white/8 sm:p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15">
                        <Beef className="h-4 w-4 text-brand" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-text-muted">{sp}</p>
                        <p className="mt-0.5 text-xl font-bold tabular-nums text-text-primary">{(count as number).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}

            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-inset ring-white/8 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15">
                  <Scale className="h-4 w-4 text-brand" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text-muted">Avg Weight</p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums text-text-primary">
                    {avgWeight > 0 ? `${avgWeight} kg` : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <HerdsTable herds={herds} />
        </>
      )}
    </div>
  );
}
