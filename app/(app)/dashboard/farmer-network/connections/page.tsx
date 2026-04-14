import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Handshake } from "lucide-react";
import { FarmerConnectionCard } from "@/components/app/farmer-network/farmer-connection-card";
import { FarmerRequestCard } from "@/components/app/farmer-network/farmer-request-card";
import type { ConnectionRequest } from "@/lib/types/advisory";

export const metadata = {
  title: "My Connections",
};

export default async function FarmerConnectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Fetch all farmer_peer connections involving this user
  const { data: connections } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("connection_type", "farmer_peer")
    .or(`requester_user_id.eq.${user.id},target_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const allConns = (connections ?? []) as ConnectionRequest[];

  // Pending requests where current user is the target (received requests)
  const pendingRequests = allConns.filter(
    (c) => c.status === "pending" && c.target_user_id === user.id
  );

  // Approved connections
  const approved = allConns.filter((c) => c.status === "approved");

  // Get the other user's profile for each approved connection
  const otherUserIds = approved.map((c) =>
    c.requester_user_id === user.id ? c.target_user_id : c.requester_user_id
  );

  const { data: profiles } = otherUserIds.length > 0
    ? await supabase
        .from("user_profiles")
        .select("user_id, display_name, company_name")
        .in("user_id", otherUserIds)
    : { data: [] };

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.user_id, p])
  );

  // Get last message for each approved connection
  const lastMessages = new Map<string, string>();
  if (approved.length > 0) {
    const connIds = approved.map((c) => c.id);
    const { data: messages } = await supabase
      .from("advisory_messages")
      .select("connection_id, content")
      .in("connection_id", connIds)
      .order("created_at", { ascending: false });

    for (const msg of messages ?? []) {
      if (!lastMessages.has(msg.connection_id)) {
        lastMessages.set(msg.connection_id, msg.content);
      }
    }
  }

  const hasContent = pendingRequests.length > 0 || approved.length > 0;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="My Connections"
        titleClassName="text-4xl font-bold text-orange-400"
        titleHref="/dashboard/farmer-network"
        subtitle="Back to Producer Network"
        subtitleClassName="text-sm font-medium text-text-secondary"
      />

      {!hasContent ? (
        <Card>
          <EmptyState
            icon={<Handshake className="h-6 w-6 text-orange-400" />}
            title="No connections yet"
            description="Find other producers in the directory and send them a connection request."
            actionLabel="Find Producers"
            actionHref="/dashboard/farmer-network/directory"
            variant="amber"
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {pendingRequests.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
                Pending Requests
              </p>
              <div className="space-y-2">
                {pendingRequests.map((req) => (
                  <FarmerRequestCard key={req.id} request={req} />
                ))}
              </div>
            </div>
          )}

          {approved.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
                Connected
              </p>
              <div className="space-y-2">
                {approved.map((conn) => {
                  const otherUserId =
                    conn.requester_user_id === user.id
                      ? conn.target_user_id
                      : conn.requester_user_id;
                  const profile = profileMap.get(otherUserId);
                  return (
                    <FarmerConnectionCard
                      key={conn.id}
                      connection={{
                        id: conn.id,
                        other_name: profile?.display_name ?? conn.requester_name,
                        other_company: profile?.company_name ?? "",
                        last_message: lastMessages.get(conn.id),
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
