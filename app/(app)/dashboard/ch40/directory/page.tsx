import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Search, Users2 } from "lucide-react";
import { ProducerCard } from "@/components/app/ch40/producer-card";
import { ProducerDirectorySearch } from "./producer-directory-search";
import { sanitiseSearchQuery } from "@/lib/utils/search-sanitise";
import { enrichProducers, type PrimarySpecies } from "@/lib/data/producer-enrichment";
import { loadOutgoingBlocks } from "@/lib/data/user-blocks";
import { fetchUserAvatars } from "@/lib/auth/fetch-user-avatars";
import type { DirectoryProducer } from "@/lib/types/advisory";

export const revalidate = 0;

export const metadata = {
  title: "Producer Directory",
};

const SPECIES_VALUES: readonly PrimarySpecies[] = ["Cattle", "Sheep", "Pig", "Goat"];
const STATE_VALUES = ["QLD", "NSW", "VIC", "SA", "WA", "TAS", "NT", "ACT"] as const;

export default async function ProducerDirectoryPage({
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
  const speciesFilter: PrimarySpecies | "" = SPECIES_VALUES.includes(params.species as PrimarySpecies)
    ? (params.species as PrimarySpecies)
    : "";

  const sanitised = sanitiseSearchQuery(searchQuery);

  // Search-first: require at least one filter before running any query.
  // Producers don't appear in a flat list by default - you have to search
  // for them. This respects discoverability as an opt-in to being found,
  // not opt-in to appearing on a public list.
  const hasFilter = Boolean(sanitised || stateFilter || speciesFilter);

  let filteredProducers: DirectoryProducer[] = [];
  let avatarMap = new Map<string, string | null>();

  if (hasFilter) {
    const blockedIds = await loadOutgoingBlocks(supabase, user.id);

    let query = supabase
      .from("user_profiles")
      .select("user_id, display_name, company_name, property_name, role, state, region, bio")
      .eq("role", "producer")
      .eq("is_discoverable_to_producers", true)
      .neq("user_id", user.id);

    if (blockedIds.size > 0) {
      query = query.not("user_id", "in", `(${Array.from(blockedIds).join(",")})`);
    }

    if (stateFilter) {
      query = query.eq("state", stateFilter);
    }

    if (sanitised) {
      query = query.or(
        `display_name.ilike.%${sanitised}%,company_name.ilike.%${sanitised}%,property_name.ilike.%${sanitised}%`,
      );
    }

    const { data: rawProducers } = await query.order("display_name");
    const baseProducers = (rawProducers ?? []) as DirectoryProducer[];

    // Enrich with species + herd-size bucket. Species filter applied after
    // enrichment since it lives in the herds table, not user_profiles.
    const enrichment = await enrichProducers(
      supabase,
      baseProducers.map((f) => f.user_id),
    );

    const enriched: DirectoryProducer[] = baseProducers.map((f) => {
      const e = enrichment.get(f.user_id);
      return {
        ...f,
        primary_species: e?.primary_species ?? null,
        herd_size_bucket: e?.herd_size_bucket ?? null,
        property_count: e?.property_count ?? null,
      };
    });

    filteredProducers = speciesFilter
      ? enriched.filter((f) => f.primary_species === speciesFilter)
      : enriched;

    avatarMap = await fetchUserAvatars(filteredProducers.map((f) => f.user_id));
  }

  return (
    <div className="w-full max-w-[1680px]">
      <PageHeader feature="ch40"
        title="Producer Directory"
        titleClassName="text-4xl font-bold text-ch40-light"
        titleHref="/dashboard/ch40"
        subtitle="Back to Ch 40"
        subtitleClassName="text-sm font-medium text-text-secondary"
      />

      <ProducerDirectorySearch
        currentSearch={searchQuery}
        currentState={stateFilter}
        currentSpecies={speciesFilter as string}
      />

      {!hasFilter ? (
        <Card>
          <EmptyState
            icon={<Search className="h-6 w-6 text-ch40-light" />}
            title="Search to find producers"
            description="Type a name, property, or use the filters above to find producers to connect with."
            variant="amber"
          />
        </Card>
      ) : filteredProducers.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users2 className="h-6 w-6 text-ch40-light" />}
            title="No producers found"
            description="No producers match your search. Try a different name or clear a filter."
            variant="amber"
          />
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-white/[0.06]">
            {filteredProducers.map((producer) => (
              <ProducerCard
                key={producer.user_id}
                producer={producer}
                avatarUrl={avatarMap.get(producer.user_id) ?? null}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
