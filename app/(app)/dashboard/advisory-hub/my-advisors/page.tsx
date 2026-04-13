import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Search, ArrowRight, MapPin, Clock, Check, Shield } from "lucide-react";
import { AdvisorRequestCard } from "@/components/app/advisory/advisor-request-card";
import { ConnectedAdvisorCard } from "@/components/app/advisory/connected-advisor-card";
import { ConnectionRealtime } from "@/components/app/advisory/connection-realtime";
import { getCategoryConfig, hasActivePermission, type ConnectionRequest } from "@/lib/types/advisory";

export const revalidate = 0;

export const metadata = {
  title: "My Advisors",
};

export default async function MyAdvisorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Fetch all connections in both directions
  const { data: rawConnections } = await supabase
    .from("connection_requests")
    .select("*")
    .or(`target_user_id.eq.${user.id},requester_user_id.eq.${user.id}`)
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false });

  const allConns = (rawConnections ?? []) as ConnectionRequest[];

  // Resolve advisor profiles for producer-initiated connections
  // (so cards show the advisor's name, not the producer's own name)
  const otherPartyIds = allConns.map((c) =>
    c.requester_user_id === user.id ? c.target_user_id : c.requester_user_id
  );

  let profiles: Record<string, { display_name: string; role: string; company_name: string; state: string }> = {};
  if (otherPartyIds.length > 0) {
    const { data } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, role, company_name, state")
      .in("user_id", [...new Set(otherPartyIds)]);
    for (const p of data ?? []) {
      profiles[p.user_id] = p;
    }
  }

  // Normalise all connections: resolve the advisor (other party) info
  const connections = allConns.map((c) => {
    const otherPartyId = c.requester_user_id === user.id ? c.target_user_id : c.requester_user_id;
    const profile = profiles[otherPartyId];
    return {
      ...c,
      // Override requester fields with the advisor's actual info for display
      requester_name: profile?.display_name ?? c.requester_name,
      requester_role: profile?.role ?? c.requester_role,
      requester_company: profile?.company_name ?? c.requester_company,
      _isProducerInitiated: c.requester_user_id === user.id,
    };
  });

  // Split into sections
  // Incoming: advisor sent request TO this producer (user is target, status pending)
  const incomingRequests = connections.filter(
    (c) => c.status === "pending" && c.target_user_id === user.id
  );
  // Awaiting: producer sent request, waiting for advisor to accept (user is requester, status pending)
  const awaitingResponse = connections.filter(
    (c) => c.status === "pending" && c.requester_user_id === user.id
  );
  // Connected: approved in either direction
  const connected = connections.filter((c) => c.status === "approved");

  const hasAnything = incomingRequests.length > 0 || awaitingResponse.length > 0 || connected.length > 0;

  return (
    <div className="max-w-3xl">
      <ConnectionRealtime userId={user.id} />
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

      {/* TODO: Remove this debug line after confirming deployment */}
      <p className="mb-4 text-xs text-red-400">Build: {new Date().toISOString()}</p>

      {!hasAnything && (
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

      {/* Incoming requests from advisors (user needs to approve/deny) */}
      {incomingRequests.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-amber-400">
            Incoming Requests ({incomingRequests.length})
          </h3>
          <div className="space-y-3">
            {incomingRequests.map((request) => (
              <AdvisorRequestCard key={request.id} request={request} />
            ))}
          </div>
        </div>
      )}

      {/* Requests sent by producer, awaiting advisor response */}
      {awaitingResponse.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-text-secondary">
            Awaiting Response ({awaitingResponse.length})
          </h3>
          <div className="space-y-3">
            {awaitingResponse.map((conn) => {
              const categoryConfig = getCategoryConfig(conn.requester_role);
              return (
                <Card key={conn.id} className="border border-white/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2F8CD9]/15">
                          {categoryConfig ? (
                            <categoryConfig.icon className={`h-5 w-5 ${categoryConfig.colorClass}`} />
                          ) : (
                            <div className="h-5 w-5 rounded-full bg-[#2F8CD9]" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{conn.requester_name}</p>
                          <div className="mt-0.5 flex items-center gap-2">
                            {categoryConfig && (
                              <span className="text-xs text-text-muted">{categoryConfig.label}</span>
                            )}
                            {conn.requester_company && (
                              <span className="text-xs text-text-muted">{conn.requester_company}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge variant="warning">
                        <Clock className="mr-1 h-3 w-3" />
                        Pending
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Connected advisors */}
      {connected.length > 0 && (
        <div>
          {(incomingRequests.length > 0 || awaitingResponse.length > 0) && (
            <h3 className="mb-3 text-sm font-semibold text-text-secondary">
              Connected Advisors ({connected.length})
            </h3>
          )}
          <div className="space-y-3">
            {connected.map((connection) => (
              <ConnectedAdvisorCard key={connection.id} connection={connection} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
