import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
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
    .select("user_id, display_name, company_name, property_name, role, state, region, bio")
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

  // Fetch existing connections to show status inline
  const producerIds = (producers ?? []).map((p) => p.user_id);
  const connectionStatusMap = new Map<string, string>();
  if (producerIds.length > 0) {
    const { data: connections } = await supabase
      .from("connection_requests")
      .select("requester_user_id, target_user_id, status")
      .or(`requester_user_id.eq.${user.id},target_user_id.eq.${user.id}`)
      .in("status", ["pending", "approved"]);

    for (const conn of connections ?? []) {
      const otherId = conn.requester_user_id === user.id ? conn.target_user_id : conn.requester_user_id;
      if (producerIds.includes(otherId)) {
        connectionStatusMap.set(otherId, conn.status);
      }
    }
  }

  // Fetch avatar URLs from auth metadata via service client
  const avatarMap = new Map<string, string>();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey && producerIds.length > 0) {
    const svc = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);
    const { data: authList } = await svc.auth.admin.listUsers({
      perPage: 1000,
    });
    if (authList?.users) {
      for (const authUser of authList.users) {
        if (producerIds.includes(authUser.id) && authUser.user_metadata?.avatar_url) {
          avatarMap.set(authUser.id, authUser.user_metadata.avatar_url);
        }
      }
    }
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Producer Directory"
        titleClassName="text-4xl font-bold text-[#2F8CD9]"
        subtitle="Search for producers to connect with"
        subtitleClassName="text-sm font-medium text-text-secondary"
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
              <ProducerCard
                key={producer.user_id}
                producer={producer}
                connectionStatus={connectionStatusMap.get(producer.user_id) ?? null}
                avatarUrl={avatarMap.get(producer.user_id) ?? null}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
