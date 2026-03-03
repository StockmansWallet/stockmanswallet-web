import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { HerdsTable } from "./herds-table";

export const metadata = {
  title: "Herds",
};

export default async function HerdsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: herds } = await supabase
    .from("herds")
    .select("*, properties(property_name)")
    .eq("user_id", user!.id)
    .eq("is_sold", false)
    .order("name");

  const totalHead =
    herds?.reduce((sum, h) => sum + (h.head_count ?? 0), 0) ?? 0;

  const speciesCounts = herds?.reduce(
    (acc, h) => {
      acc[h.species] = (acc[h.species] || 0) + (h.head_count ?? 0);
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Herds"
        subtitle="Manage your livestock herds."
        actions={
          <Link href="/dashboard/herds/new">
            <Button>Add Herd</Button>
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
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total Head" value={totalHead.toLocaleString()} />
            <StatCard
              label="Total Herds"
              value={herds.length.toLocaleString()}
            />
            {speciesCounts &&
              Object.entries(speciesCounts)
                .slice(0, 2)
                .map(([sp, count]) => (
                  <StatCard
                    key={sp}
                    label={sp}
                    value={(count as number).toLocaleString()}
                  />
                ))}
          </div>

          {/* Table */}
          <Card className="overflow-hidden">
            <HerdsTable herds={herds} />
          </Card>
        </>
      )}
    </div>
  );
}
