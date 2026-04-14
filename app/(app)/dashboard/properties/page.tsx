import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PropertiesTable } from "./properties-table";
import { MapPinned, LandPlot, Map } from "lucide-react";

export const revalidate = 0;

export const metadata = {
  title: "Properties",
};

export default async function PropertiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: properties }, { data: herds }] = await Promise.all([
    supabase
      .from("properties")
      .select("*")
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .order("property_name"),
    supabase
      .from("herds")
      .select("id, property_id, head_count")
      .eq("user_id", user!.id)
      .eq("is_sold", false)
      .eq("is_deleted", false),
  ]);

  // Build herd counts per property
  const herdCountMap: Record<string, number> = {};
  const headCountMap: Record<string, number> = {};
  for (const h of herds ?? []) {
    if (h.property_id) {
      herdCountMap[h.property_id] = (herdCountMap[h.property_id] ?? 0) + 1;
      headCountMap[h.property_id] = (headCountMap[h.property_id] ?? 0) + (h.head_count ?? 0);
    }
  }

  const totalAcreage = (properties ?? []).reduce((sum, p) => sum + (p.acreage ?? 0), 0);
  const uniqueStates = [...new Set((properties ?? []).map((p) => p.state).filter(Boolean))];

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Properties"
        titleClassName="text-4xl font-bold text-brand"
        subtitle="Manage your properties and locations."
      />

      {!properties || properties.length === 0 ? (
        <Card>
          <EmptyState
            title="No properties yet"
            description="Add your first property to organise your herds by location."
            actionLabel="Add Property"
            actionHref="/dashboard/properties/new"
          />
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            <StatCard icon={<MapPinned className="h-4 w-4" />} label="Properties" value={String(properties.length)} />
            <StatCard icon={<LandPlot className="h-4 w-4" />} label="Total Acreage" value={totalAcreage > 0 ? `${totalAcreage.toLocaleString()} ac` : "\u2014"} />
            <StatCard icon={<Map className="h-4 w-4" />} label="States" value={uniqueStates.length > 0 ? uniqueStates.join(", ") : "\u2014"} />
          </div>

          {/* Table */}
          <PropertiesTable
            properties={properties}
            herdCounts={herdCountMap}
            headCounts={headCountMap}
          />
        </>
      )}
    </div>
  );
}
