import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Clock } from "lucide-react";
import { AdvisorRequestCard } from "@/components/app/advisory/advisor-request-card";
import { AdvisorBusinessCard } from "@/components/app/advisory/advisor-business-card";
import { ConnectionRealtime } from "@/components/app/advisory/connection-realtime";
import { getCategoryConfig, type ConnectionRequest } from "@/lib/types/advisory";

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

  // Fetch advisory connections only (exclude producer_peer)
  const { data: rawConnections } = await supabase
    .from("connection_requests")
    .select("*")
    .or(`target_user_id.eq.${user.id},requester_user_id.eq.${user.id}`)
    .eq("connection_type", "advisory")
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false });

  const allConns = (rawConnections ?? []) as ConnectionRequest[];

  // Resolve advisor profiles (including contact details for business cards)
  const otherPartyIds = allConns.map((c) =>
    c.requester_user_id === user.id ? c.target_user_id : c.requester_user_id
  );

  let profiles: Record<string, {
    display_name: string;
    role: string;
    company_name: string;
    state: string;
    contact_email: string | null;
    contact_phone: string | null;
  }> = {};

  if (otherPartyIds.length > 0) {
    const { data } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, role, company_name, state, contact_email, contact_phone")
      .in("user_id", [...new Set(otherPartyIds)]);
    for (const p of data ?? []) {
      profiles[p.user_id] = p;
    }
  }

  // Fetch advisor avatars from auth metadata
  const avatarMap: Record<string, string | null> = {};
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey && otherPartyIds.length > 0) {
    const svc = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);
    const uniqueIds = [...new Set(otherPartyIds)];
    await Promise.all(
      uniqueIds.map(async (uid) => {
        const { data: authUser } = await svc.auth.admin.getUserById(uid);
        avatarMap[uid] = authUser?.user?.user_metadata?.avatar_url ?? null;
      })
    );
  }

  // Normalise connections with advisor profile data
  const connections = allConns.map((c) => {
    const otherPartyId = c.requester_user_id === user.id ? c.target_user_id : c.requester_user_id;
    const profile = profiles[otherPartyId];
    return {
      ...c,
      requester_name: profile?.display_name ?? c.requester_name,
      requester_role: profile?.role ?? c.requester_role,
      requester_company: profile?.company_name ?? c.requester_company,
      _otherPartyId: otherPartyId,
    };
  });

  // Split into sections
  const incomingRequests = connections.filter(
    (c) => c.status === "pending" && c.target_user_id === user.id
  );
  const awaitingResponse = connections.filter(
    (c) => c.status === "pending" && c.requester_user_id === user.id
  );
  const connected = connections.filter((c) => c.status === "approved");

  const hasAnything = incomingRequests.length > 0 || awaitingResponse.length > 0 || connected.length > 0;

  return (
    <div className="max-w-4xl">
      <ConnectionRealtime userId={user.id} />
      <PageHeader feature="advisor"
        title="My Advisors"
        titleClassName="text-4xl font-bold text-advisor"
        subtitle="Manage your advisory connections"
        subtitleClassName="text-sm font-medium text-text-secondary"
        actions={
          <Link href="/dashboard/advisory-hub/directory">
            <Button variant="advisor" size="sm">
              <Search className="mr-1.5 h-3.5 w-3.5" />
              Find Advisors
            </Button>
          </Link>
        }
      />

      {!hasAnything && (
        <Card>
          <EmptyState
            icon={<Users className="h-6 w-6 text-advisor" />}
            title="No advisors yet"
            description="Browse the advisor directory to connect with your livestock agent, accountant, banker, or other advisors."
            actionLabel="Find Advisors"
            actionHref="/dashboard/advisory-hub/directory"
            variant="advisor"
          />
        </Card>
      )}

      {/* Incoming requests from advisors */}
      {incomingRequests.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-warning">
            Incoming Requests ({incomingRequests.length})
          </h3>
          <div className="space-y-3">
            {incomingRequests.map((request) => (
              <AdvisorRequestCard key={request.id} request={request} />
            ))}
          </div>
        </div>
      )}

      {/* Awaiting response */}
      {awaitingResponse.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-text-secondary">
            Awaiting Response ({awaitingResponse.length})
          </h3>
          <div className="space-y-3">
            {awaitingResponse.map((conn) => {
              const categoryConfig = getCategoryConfig(conn.requester_role);
              return (
                <Card key={conn.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-advisor/15">
                          {categoryConfig ? (
                            <categoryConfig.icon className={`h-5 w-5 ${categoryConfig.colorClass}`} />
                          ) : (
                            <div className="h-5 w-5 rounded-full bg-advisor" />
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

      {/* Connected advisors - business card grid */}
      {connected.length > 0 && (
        <div>
          {(incomingRequests.length > 0 || awaitingResponse.length > 0) && (
            <h3 className="mb-3 text-sm font-semibold text-text-secondary">
              Connected Advisors ({connected.length})
            </h3>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {connected.map((connection) => {
              const profile = profiles[connection._otherPartyId];
              return (
                <AdvisorBusinessCard
                  key={connection.id}
                  connection={connection}
                  advisorEmail={profile?.contact_email}
                  advisorPhone={profile?.contact_phone}
                  avatarUrl={avatarMap[connection._otherPartyId]}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
