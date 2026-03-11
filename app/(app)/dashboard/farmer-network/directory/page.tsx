import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Search } from "lucide-react";
import { FarmerCard } from "@/components/app/farmer-network/farmer-card";
import { FarmerDirectorySearch } from "./farmer-directory-search";
import type { DirectoryFarmer } from "@/lib/types/advisory";

export const metadata = {
  title: "Farmer Directory",
};

export default async function FarmerDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; state?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const params = await searchParams;
  const searchQuery = params.q || "";
  const stateFilter = params.state || "";

  // Fetch farmers (role = farmer_grazier), exclude self
  let query = supabase
    .from("user_profiles")
    .select("user_id, display_name, company_name, role, state, region, bio")
    .eq("role", "farmer_grazier")
    .neq("user_id", user.id);

  if (stateFilter) {
    query = query.eq("state", stateFilter);
  }

  if (searchQuery) {
    query = query.or(
      `display_name.ilike.%${searchQuery}%,company_name.ilike.%${searchQuery}%`
    );
  }

  const { data: farmers } = await query.order("display_name");

  const filteredFarmers = (farmers ?? []) as DirectoryFarmer[];

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Farmer Directory"
        titleClassName="text-4xl font-bold text-orange-400"
        titleHref="/dashboard/farmer-network"
        subtitle="Back to Farmer Network"
        subtitleClassName="text-sm font-medium text-text-secondary"
        inline
      />

      <FarmerDirectorySearch currentSearch={searchQuery} currentState={stateFilter} />

      {filteredFarmers.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Search className="h-6 w-6 text-orange-400" />}
            title="No farmers found"
            description={
              searchQuery
                ? `No farmers match "${searchQuery}". Try a different search.`
                : "No other farmers are registered yet."
            }
            variant="amber"
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredFarmers.map((farmer) => (
            <FarmerCard key={farmer.user_id} farmer={farmer} />
          ))}
        </div>
      )}
    </div>
  );
}
