import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Users, Search } from "lucide-react";
import { AdvisorRequestCard } from "@/components/app/advisory/advisor-request-card";
import { ConnectedAdvisorCard } from "@/components/app/advisory/connected-advisor-card";
import type { ConnectionRequest } from "@/lib/types/advisory";

export const metadata = {
  title: "My Advisors",
};

export default async function MyAdvisorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Fetch connections in both directions (advisor-initiated and producer-initiated)
  const { data: rawConnections } = await supabase
    .from("connection_requests")
    .select("*")
    .or(`target_user_id.eq.${user.id},requester_user_id.eq.${user.id}`)
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false });

  // For producer-initiated connections, resolve the advisor's profile so cards
  // display the advisor's name/role/company instead of the producer's own info.
  const allConns = (rawConnections ?? []) as ConnectionRequest[];
  const producerInitiatedIds = allConns
    .filter((c) => c.requester_user_id === user.id)
    .map((c) => c.target_user_id);

  let advisorProfiles: Record<string, { display_name: string; role: string; company_name: string }> = {};
  if (producerInitiatedIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, role, company_name")
      .in("user_id", producerInitiatedIds);
    for (const p of profiles ?? []) {
      advisorProfiles[p.user_id] = p;
    }
  }

  // Normalise: swap requester fields to the advisor's info for producer-initiated
  const connections = allConns.map((c) => {
    if (c.requester_user_id === user.id) {
      const profile = advisorProfiles[c.target_user_id];
      return {
        ...c,
        requester_name: profile?.display_name ?? "Unknown Advisor",
        requester_role: profile?.role ?? "advisor",
        requester_company: profile?.company_name ?? null,
      };
    }
    return c;
  });

  const pending = connections.filter(
    (c: ConnectionRequest) => c.status === "pending"
  );
  const approved = connections.filter(
    (c: ConnectionRequest) => c.status === "approved"
  );

  const hasConnections = pending.length > 0 || approved.length > 0;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="My Advisors"
        titleClassName="text-4xl font-bold text-[#2F8CD9]"
        titleHref="/dashboard/advisory-hub"
        subtitle="Manage your advisory connections"
        subtitleClassName="text-sm font-medium text-text-secondary"
        inline
        actions={
          <Link href="/dashboard/advisory-hub/directory">
            <Button variant="advisor" size="sm">
              <Search className="mr-1.5 h-3.5 w-3.5" />
              Find Advisors
            </Button>
          </Link>
        }
      />

      {!hasConnections && (
        <Card>
          <EmptyState
            icon={<Users className="h-6 w-6 text-[#2F8CD9]" />}
            title="No advisors yet"
            description="Browse the advisor directory to connect with your livestock agent, accountant, banker, or other advisors."
            actionLabel="Find Advisors"
            actionHref="/dashboard/advisory-hub/directory"
            variant="advisor"
          />
        </Card>
      )}

      {/* Pending requests */}
      {pending.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-3 text-sm font-semibold text-text-secondary">
            Pending Requests ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map((request: ConnectionRequest) => (
              <AdvisorRequestCard key={request.id} request={request} />
            ))}
          </div>
        </div>
      )}

      {/* Active connections */}
      {approved.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-text-secondary">
            Connected Advisors ({approved.length})
          </h3>
          <div className="space-y-3">
            {approved.map((connection: ConnectionRequest) => (
              <ConnectedAdvisorCard key={connection.id} connection={connection} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
