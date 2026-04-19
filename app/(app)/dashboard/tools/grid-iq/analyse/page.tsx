import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { PreSaleFlow } from "@/components/grid-iq/pre-sale-flow";

export const metadata = { title: "New Analysis - Grid IQ" };

export default async function NewAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const { step: stepParam } = await searchParams;
  const parsedStep = stepParam ? Number(stepParam) : NaN;
  const initialStep: 1 | 2 | 3 | undefined =
    parsedStep === 2 || parsedStep === 3 ? parsedStep : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Parallel fetch: processors, grids, herds, kill sheets
  const [
    { data: processors },
    { data: grids },
    { data: herds },
    { data: killSheets },
  ] = await Promise.all([
    supabase
      .from("processors")
      .select("id, name, address, location_latitude, location_longitude, is_primary")
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .order("is_primary", { ascending: false })
      .order("name"),
    supabase
      .from("processor_grids")
      .select(
        "id, grid_name, processor_name, processor_id, grid_code, grid_date, expiry_date, entries, location_latitude, location_longitude, created_at"
      )
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("herds")
      .select("id, name, species, breed, sex, category, head_count")
      .eq("user_id", user!.id)
      .eq("is_sold", false)
      .eq("is_deleted", false)
      .gt("head_count", 0)
      .order("name"),
    supabase
      .from("kill_sheet_records")
      .select(
        "id, record_name, processor_name, grid_code, kill_date, total_head_count, total_gross_value"
      )
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div>
      <PageHeader feature="grid-iq"
        title="New Analysis"
        titleClassName="text-2xl font-semibold text-text-primary"
        subtitle="Build a consignment and compare processor vs saleyard returns"
        subtitleClassName="text-sm text-text-muted"
        compact
      />
      <PreSaleFlow
        processors={processors ?? []}
        defaultProcessorId={
          (processors ?? []).find((p) => p.is_primary)?.id ??
          ((processors ?? []).length === 1 ? processors![0].id : null)
        }
        grids={grids ?? []}
        herds={(herds ?? []).filter((h) => h.species === "Cattle")}
        killSheets={killSheets ?? []}
        initialStep={initialStep}
      />
    </div>
  );
}

