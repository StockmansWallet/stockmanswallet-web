import { createClient } from "@/lib/supabase/server";
import { SavedAnalysisTabs } from "./saved-analysis-tabs";

export const metadata = { title: "Saved Analysis - Grid IQ" };

export default async function SavedAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const defaultTab = tab === "post-kill" ? "post-kill" : "pre-sale";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: analyses } = await supabase
    .from("grid_iq_analyses")
    .select(
      "id, herd_name, processor_name, analysis_date, net_saleyard_value, net_processor_value, grid_iq_advantage, sell_window_status_raw, kill_score, gcr, analysis_mode, updated_at"
    )
    .eq("user_id", user!.id)
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false });

  return (
    <SavedAnalysisTabs
      defaultTab={defaultTab}
      analyses={analyses ?? []}
    />
  );
}
