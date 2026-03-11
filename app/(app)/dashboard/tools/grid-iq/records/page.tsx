import { createClient } from "@/lib/supabase/server";
import { ProcessorRecordsTabs } from "./processor-records-tabs";

export const metadata = { title: "Processor Records - Grid IQ" };

export default async function ProcessorRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const defaultTab = tab === "killsheets" ? "killsheets" : tab === "upload" ? "upload" : "grids";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: grids }, { data: killSheets }] = await Promise.all([
    supabase
      .from("processor_grids")
      .select(
        "id, processor_name, grid_code, grid_date, expiry_date, location, notes, created_at"
      )
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("kill_sheet_records")
      .select(
        "id, processor_name, grid_code, kill_date, total_head_count, total_body_weight, total_gross_value, average_body_weight, average_price_per_kg, condemns, realisation_factor, created_at"
      )
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .order("kill_date", { ascending: false }),
  ]);

  return (
    <ProcessorRecordsTabs
      defaultTab={defaultTab}
      grids={grids ?? []}
      killSheets={killSheets ?? []}
    />
  );
}
