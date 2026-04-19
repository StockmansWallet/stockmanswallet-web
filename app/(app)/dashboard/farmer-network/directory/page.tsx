import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Search } from "lucide-react";
import { FarmerCard } from "@/components/app/farmer-network/farmer-card";
import { FarmerDirectorySearch } from "./farmer-directory-search";
import { sanitiseSearchQuery } from "@/lib/utils/search-sanitise";
import { enrichProducers, type PrimarySpecies } from "@/lib/data/producer-enrichment";
import { loadOutgoingBlocks } from "@/lib/data/user-blocks";
import type { DirectoryFarmer } from "@/lib/types/advisory";

export const revalidate = 0;

export const metadata = {
  title: "Producer Directory",
};

const SPECIES_VALUES: readonly PrimarySpecies[] = ["Cattle", "Sheep", "Pig", "Goat"];
const STATE_VALUES = ["QLD", "NSW", "VIC", "SA", "WA", "TAS", "NT", "ACT"] as const;

export default async function FarmerDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; state?: string; species?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const params = await searchParams;
  const searchQuery = params.q ?? "";
  const stateFilter = STATE_VALUES.includes(params.state as (typeof STATE_VALUES)[number])
    ? (params.state as string)
    : "";
  const speciesFilter = SPECIES_VALUES.includes(params.species as PrimarySpecies)
    ? (params.species as PrimarySpecies)
    : ("" as "");

  // Producers the viewer has blocked shouldn't appear in the directory.
  const blockedIds = await loadOutgoingBlocks(supabase, user.id);

  let query = supabase
    .from("user_profiles")
    .select("user_id, display_name, company_name, role, state, region, bio")
    .eq("role", "producer")
    .neq("user_id", user.id);

  if (blockedIds.size > 0) {
    query = query.not("user_id", "in", `(${Array.from(blockedIds).join(",")})`);
  }

  if (stateFilter) {
    query = query.eq("state", stateFilter);
  }

  const sanitised = sanitiseSearchQuery(searchQuery);
  if (sanitised) {
    query = query.or(
      `display_name.ilike.%${sanitised}%,company_name.ilike.%${sanitised}%`,
    );
  }

  const { data: rawFarmers } = await query.order("display_name");
  const baseFarmers = (rawFarmers ?? []) as DirectoryFarmer[];

  // Enrich every card with species + herd-size bucket (+ property count).
  // Species filter is applied after enrichment since species lives in
  // the herds table, not user_profiles.
  const enrichment = await enrichProducers(
    supabase,
    baseFarmers.map((f) => f.user_id),
  );

  const enrichedFarmers: DirectoryFarmer[] = baseFarmers.map((f) => {
    const e = enrichment.get(f.user_id);
    return {
      ...f,
      primary_species: e?.primary_species ?? null,
      herd_size_bucket: e?.herd_size_bucket ?? null,
      property_count: e?.property_count ?? null,
    };
  });

  const filteredFarmers = speciesFilter
    ? enrichedFarmers.filter((f) => f.primary_species === speciesFilter)
    : enrichedFarmers;

  return (
    <div className="max-w-4xl">
      <PageHeader feature="producer-network"
        title="Producer Directory"
        titleClassName="text-4xl font-bold text-producer-network-light"
        titleHref="/dashboard/farmer-network"
        subtitle="Back to Producer Network"
        subtitleClassName="text-sm font-medium text-text-secondary"
      />

      <FarmerDirectorySearch
        currentSearch={searchQuery}
        currentState={stateFilter}
        currentSpecies={speciesFilter as string}
      />

      {filteredFarmers.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Search className="h-6 w-6 text-producer-network-light" />}
            title="No producers found"
            description={
              searchQuery || stateFilter || speciesFilter
                ? "No producers match your filters. Try clearing one."
                : "No other producers are registered yet."
            }
            variant="amber"
          />
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-white/[0.06]">
            {filteredFarmers.map((farmer) => (
              <FarmerCard key={farmer.user_id} farmer={farmer} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
