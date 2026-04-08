import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";
import { ClientCard } from "@/components/app/advisory/client-card";
import { ClientSearch } from "./client-search";
import { hasActivePermission, type ConnectionRequest } from "@/lib/types/advisory";

export const revalidate = 0;

export const metadata = {
  title: "Clients",
};

export default async function AdvisorClientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Fetch connections where current user is the advisor (requester)
  const { data: connections } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("requester_user_id", user.id)
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false });

  const allConnections = (connections ?? []) as ConnectionRequest[];

  // Get client profiles for display names
  const clientUserIds = allConnections.map((c) => c.target_user_id);
  let clientProfiles: Record<string, { display_name: string; company_name: string; state: string }> = {};

  if (clientUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, company_name, state")
      .in("user_id", clientUserIds);

    if (profiles) {
      for (const p of profiles) {
        clientProfiles[p.user_id] = p;
      }
    }
  }

  // Stats
  const totalClients = allConnections.length;
  const activePermissions = allConnections.filter((c) => hasActivePermission(c)).length;
  const pendingRequests = allConnections.filter((c) => c.status === "pending").length;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Clients"
        titleClassName="text-4xl font-bold text-[#2F8CD9]"
        subtitle="Find and connect with producers"
        subtitleClassName="text-sm font-medium text-text-secondary"
        inline
      />

      <ClientSearch />

      {/* Stats row */}
      {totalClients > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-text-primary">{totalClients}</p>
              <p className="text-xs text-text-muted">Total Clients</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{activePermissions}</p>
              <p className="text-xs text-text-muted">Active Permissions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-400">{pendingRequests}</p>
              <p className="text-xs text-text-muted">Pending</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Client list */}
      {totalClients === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="h-6 w-6 text-[#2F8CD9]" />}
            title="No clients yet"
            description="When producers approve your connection requests, they will appear here. You can also use the Simulator and Tools while waiting."
            variant="purple"
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {allConnections.map((connection) => {
            const profile = clientProfiles[connection.target_user_id];
            return (
              <ClientCard
                key={connection.id}
                connection={connection}
                clientName={profile?.display_name ?? "Unknown Producer"}
                clientState={profile?.state}
                clientCompany={profile?.company_name}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
