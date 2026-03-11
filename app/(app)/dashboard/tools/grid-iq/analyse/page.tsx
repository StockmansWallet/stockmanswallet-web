import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { PreSaleFlow } from "@/components/grid-iq/pre-sale-flow";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "New Analysis - Grid IQ" };

export default async function NewAnalysisPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Parallel fetch: grids, herds, kill sheets
  const [{ data: grids }, { data: herds }, { data: killSheets }] = await Promise.all([
    supabase
      .from("processor_grids")
      .select("id, grid_name, processor_name, grid_code, grid_date, expiry_date, entries, location_latitude, location_longitude, created_at")
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("herd_groups")
      .select("id, name, species, breed, sex, category, head_count")
      .eq("user_id", user!.id)
      .eq("is_sold", false)
      .eq("is_deleted", false)
      .gt("head_count", 0)
      .order("name"),
    supabase
      .from("kill_sheet_records")
      .select("id, record_name, processor_name, grid_code, kill_date, total_head_count, total_gross_value")
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="max-w-3xl">
      <div className="mb-4 sm:hidden">
        <Link href="/dashboard/tools/grid-iq">
          <Button variant="ghost" size="sm" className="gap-1.5 text-text-secondary hover:text-text-primary">
            <ArrowLeft className="h-3.5 w-3.5" />
            Grid IQ
          </Button>
        </Link>
      </div>
      <PageHeader
        title="New Analysis"
        titleClassName="text-2xl font-semibold text-text-primary"
        subtitle="Build a consignment and compare processor vs saleyard returns"
        subtitleClassName="text-sm text-text-muted"
        inline
        compact
      />
      <PreSaleFlow
        grids={grids ?? []}
        herds={(herds ?? []).filter((h) => h.species === "Cattle")}
        killSheets={killSheets ?? []}
      />
    </div>
  );
}
