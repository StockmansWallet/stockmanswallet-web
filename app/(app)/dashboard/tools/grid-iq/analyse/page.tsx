import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { AnalysisForm } from "./analysis-form";
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
      .select("id, processor_name, grid_code, grid_date, expiry_date, entries, created_at")
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("herd_groups")
      .select(
        `id, name, species, breed, sex, category, head_count,
         initial_weight, current_weight, daily_weight_gain,
         dwg_change_date, previous_dwg, created_at,
         is_breeder, is_pregnant, joined_date, calving_rate,
         breeding_program_type, joining_period_start, joining_period_end,
         breed_premium_override, mortality_rate, selected_saleyard,
         additional_info, calf_weight_recorded_date, updated_at, property_id`
      )
      .eq("user_id", user!.id)
      .eq("is_sold", false)
      .eq("is_deleted", false)
      .order("name"),
    supabase
      .from("kill_sheet_records")
      .select(
        `id, processor_name, grid_code, kill_date, total_head_count,
         total_gross_value, total_body_weight, average_body_weight,
         realisation_factor`
      )
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
        subtitle="Compare saleyard vs over-the-hooks"
        subtitleClassName="text-sm text-text-muted"
        inline
        compact
      />
      <AnalysisForm
        grids={grids ?? []}
        herds={(herds ?? []).filter((h) => h.species === "Cattle")}
        killSheets={killSheets ?? []}
      />
    </div>
  );
}
