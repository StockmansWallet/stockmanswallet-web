import { createClient } from "@/lib/supabase/server";
import { computeProducerProfile } from "@/lib/grid-iq/producer-profile";
import { LibraryTabs } from "./library-tabs";

export const metadata = { title: "Library - Grid IQ" };

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; upload?: string }>;
}) {
  const { tab, upload } = await searchParams;
  const initialUpload =
    upload === "grid" || upload === "killsheet" ? upload : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: analyses }, { data: grids }, { data: killSheets }, profile] =
    await Promise.all([
      supabase
        .from("grid_iq_analyses")
        .select(
          "id, herd_name, processor_name, analysis_date, net_saleyard_value, net_processor_value, grid_iq_advantage, sell_window_status_raw, kill_score, gcr, analysis_mode, updated_at"
        )
        .eq("user_id", user!.id)
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false }),
      supabase
        .from("processor_grids")
        .select(
          "id, grid_name, processor_name, grid_code, grid_date, expiry_date, location, notes, created_at"
        )
        .eq("user_id", user!.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false }),
      supabase
        .from("kill_sheet_records")
        .select(
          "id, record_name, processor_name, grid_code, kill_date, total_head_count, total_body_weight, total_gross_value, average_body_weight, average_price_per_kg, condemns, realisation_factor, created_at"
        )
        .eq("user_id", user!.id)
        .eq("is_deleted", false)
        .order("kill_date", { ascending: false }),
      computeProducerProfile(user!.id).catch(() => null),
    ]);

  // Separate datasets for performance view
  const { data: postSaleTrend } = await supabase
    .from("grid_iq_analyses")
    .select(
      "id, herd_name, processor_name, analysis_date, kill_score, gcr, realisation_factor, head_count, analysis_mode"
    )
    .eq("user_id", user!.id)
    .eq("is_deleted", false)
    .eq("analysis_mode", "post_sale")
    .order("analysis_date", { ascending: true });

  return (
    <LibraryTabs
      defaultTab={tab ?? (initialUpload === "killsheet" ? "kill-sheets" : "analyses")}
      initialUpload={initialUpload}
      analyses={analyses ?? []}
      grids={grids ?? []}
      killSheets={killSheets ?? []}
      profile={profile}
      postSaleTrend={postSaleTrend ?? []}
    />
  );
}
