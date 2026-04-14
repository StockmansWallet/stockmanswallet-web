import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Search } from "lucide-react";
import { ProducerCard } from "./producer-card";
import { ProducerDirectorySearch } from "./producer-directory-search";

export const metadata = {
  title: "Find Producers",
};

export default async function AdvisorProducerDirectoryPage({
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

  // Fetch farmers/graziers, exclude self
  let query = supabase
    .from("user_profiles")
    .select("user_id, display_name, company_name, role, state, region, bio")
    .eq("role", "producer")
    .neq("user_id", user.id);

  if (stateFilter) {
    query = query.eq("state", stateFilter);
  }

  if (searchQuery) {
    query = query.or(
      `display_name.ilike.%${searchQuery}%,company_name.ilike.%${searchQuery}%`
    );
  }

  const { data: producers } = await query.order("display_name");

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Producer Directory"
        titleClassName="text-4xl font-bold text-[#2F8CD9]"
        subtitle="Search for producers to connect with"
        subtitleClassName="text-sm font-medium text-text-secondary"
        inline
      />

      <ProducerDirectorySearch currentSearch={searchQuery} currentState={stateFilter} />

      {(producers ?? []).length === 0 ? (
        <Card>
          <EmptyState
            icon={<Search className="h-6 w-6 text-[#2F8CD9]" />}
            title="No producers found"
            description={
              searchQuery
                ? `No producers match "${searchQuery}". Try a different search.`
                : "No producers are registered yet."
            }
            variant="advisor"
          />
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-white/[0.06]">
            {(producers ?? []).map((producer) => (
              <ProducerCard key={producer.user_id} producer={producer} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
