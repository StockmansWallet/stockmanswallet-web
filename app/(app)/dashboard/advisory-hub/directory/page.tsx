import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Search } from "lucide-react";
import { DirectoryAdvisorCard } from "@/components/app/advisory/directory-advisor-card";
import { DirectoryFilters } from "@/components/app/advisory/directory-filters";
import { isAdvisorRole, type DirectoryAdvisor } from "@/lib/types/advisory";

export const metadata = {
  title: "Advisor Directory",
};

export default async function AdvisorDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const params = await searchParams;
  const categoryFilter = params.category || "all";
  const searchQuery = params.q || "";

  // Fetch advisors from directory
  let query = supabase
    .from("user_profiles")
    .select("user_id, display_name, company_name, role, state, region, bio, contact_email, contact_phone, is_listed_in_directory")
    .eq("is_listed_in_directory", true)
    .neq("user_id", user.id);

  if (categoryFilter !== "all") {
    query = query.eq("role", categoryFilter);
  }

  if (searchQuery) {
    query = query.or(`display_name.ilike.%${searchQuery}%,company_name.ilike.%${searchQuery}%`);
  }

  const { data: advisors } = await query.order("display_name");

  // Filter to only advisor roles (not farmers listed in directory)
  const filteredAdvisors = (advisors ?? []).filter((a: DirectoryAdvisor) =>
    isAdvisorRole(a.role)
  );

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Advisor Directory"
        titleClassName="text-4xl font-bold text-[#2F8CD9]"
        titleHref="/dashboard/advisory-hub"
        subtitle="Find and connect with advisors"
        subtitleClassName="text-sm font-medium text-text-secondary"
      />

      <DirectoryFilters
        currentCategory={categoryFilter}
        currentSearch={searchQuery}
      />

      {filteredAdvisors.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Search className="h-6 w-6 text-[#2F8CD9]" />}
            title="No advisors found"
            description={
              searchQuery
                ? `No advisors match "${searchQuery}". Try a different search.`
                : "No advisors are listed in the directory yet."
            }
            variant="advisor"
          />
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-white/[0.06]">
            {filteredAdvisors.map((advisor: DirectoryAdvisor) => (
              <DirectoryAdvisorCard key={advisor.user_id} advisor={advisor} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
