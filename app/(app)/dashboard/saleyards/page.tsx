import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { SaleyardsMapView, type SaleyardRow } from "./saleyards-map-view";

export const metadata = { title: "Saleyards" };

// Server component: pulls the canonical yard list (ref_saleyards) plus the
// active subset (active_saleyards view) and the user's primary property so
// the client can compute distances and flag stale yards. The map and list
// renderers are client-only because Leaflet needs `window`.

export default async function SaleyardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pull ref_saleyards in parallel with the active set so render isn't waterfalled.
  const [{ data: refRows }, { data: activeRows }] = await Promise.all([
    supabase
      .from("ref_saleyards")
      .select("name, state_code, latitude, longitude, street_address, locality, is_virtual")
      .eq("is_virtual", false)
      .order("name"),
    supabase.from("active_saleyards").select("name, last_data_date, days_since_last"),
  ]);

  // Pull primary property (is_default = true) for distance calcs. If none,
  // distance fields stay null and the popover hides them.
  let primaryProperty: {
    name: string;
    latitude: number | null;
    longitude: number | null;
  } | null = null;
  if (user) {
    const { data: prop } = await supabase
      .from("properties")
      .select("property_name, latitude, longitude")
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .eq("is_default", true)
      .maybeSingle();
    if (prop) {
      primaryProperty = {
        name: prop.property_name,
        latitude: prop.latitude,
        longitude: prop.longitude,
      };
    }
  }

  // Hydrate each yard with stale flag + last data date.
  const activeMap = new Map<
    string,
    { last_data_date: string | null; days_since_last: number | null }
  >(
    (activeRows ?? []).map((r: { name: string; last_data_date: string; days_since_last: number }) => [
      r.name,
      { last_data_date: r.last_data_date, days_since_last: r.days_since_last },
    ]),
  );

  const yards: SaleyardRow[] = (refRows ?? []).map((r) => {
    const active = activeMap.get(r.name);
    return {
      name: r.name,
      state: r.state_code,
      latitude: r.latitude,
      longitude: r.longitude,
      streetAddress: r.street_address,
      locality: r.locality,
      lastDataDate: active?.last_data_date ?? null,
      daysSinceLast: active?.days_since_last ?? null,
      isStale: !active,
    };
  });

  return (
    <div className="flex w-full max-w-[1680px] flex-col gap-4 pb-10">
      <PageHeader
        title="Saleyards"
        subtitle="Every MLA-tracked saleyard in Australia, mapped. Greyed-out yards haven't reported fresh prices in over a year."
        subtitleClassName="mt-1 text-base text-text-muted"
      />
      <SaleyardsMapView yards={yards} primaryProperty={primaryProperty} />
    </div>
  );
}
