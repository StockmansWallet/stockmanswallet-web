import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Handshake, Search, MessageSquare, ArrowRight, MapPin } from "lucide-react";
import { FarmerConnectionsRealtime } from "@/components/app/farmer-network/farmer-connections-realtime";
import { FarmerCard } from "@/components/app/farmer-network/farmer-card";
import type { DirectoryFarmer } from "@/lib/types/advisory";

export const revalidate = 0;

export const metadata = {
  title: "Producer Network",
};

export default async function FarmerNetworkPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Connection counts for the action card (unchanged behaviour).
  const { data: connections } = await supabase
    .from("connection_requests")
    .select("id, status, requester_user_id, target_user_id")
    .eq("connection_type", "farmer_peer")
    .or(`requester_user_id.eq.${user.id},target_user_id.eq.${user.id}`);

  const approvedCount = connections?.filter((c) => c.status === "approved").length ?? 0;
  const pendingCount = connections?.filter(
    (c) => c.status === "pending" && c.target_user_id === user.id,
  ).length ?? 0;

  // Caller's state drives the "In your region" section. Producers in the
  // same state (excluding self + anyone already peered with) are shown as
  // cheap discovery leads.
  const { data: myProfile } = await supabase
    .from("user_profiles")
    .select("state")
    .eq("user_id", user.id)
    .maybeSingle();
  const myState = myProfile?.state ?? null;

  let nearbyProducers: DirectoryFarmer[] = [];
  if (myState) {
    // Exclude self + anyone with any existing peer connection history.
    const { data: peerConns } = await supabase
      .from("connection_requests")
      .select("requester_user_id, target_user_id")
      .eq("connection_type", "farmer_peer")
      .or(`requester_user_id.eq.${user.id},target_user_id.eq.${user.id}`);

    const excludeIds = [
      user.id,
      ...(peerConns ?? []).map((c) =>
        c.requester_user_id === user.id ? c.target_user_id : c.requester_user_id,
      ),
    ];

    const { data: nearby } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, company_name, role, state, region, bio")
      .eq("role", "producer")
      .eq("state", myState)
      .not("user_id", "in", `(${excludeIds.join(",")})`)
      .order("display_name")
      .limit(4);

    nearbyProducers = (nearby ?? []) as DirectoryFarmer[];
  }

  return (
    <div className="max-w-4xl">
      <FarmerConnectionsRealtime userId={user.id} />
      <PageHeader
        title="Producer Network"
        titleClassName="text-4xl font-bold text-orange-400"
        subtitle="Connect and chat with other producers"
        subtitleClassName="text-sm font-medium text-text-secondary"
      />

      {/* Hero */}
      <Card className="mb-6 overflow-hidden">
        <div className="bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15">
              <Handshake className="h-6 w-6 text-orange-400" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                Your Producer Network
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Connect with other producers in your area. Chat directly,
                share insights, and build a professional network of mates
                who get the job.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Action cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Link href="/dashboard/farmer-network/connections">
          <Card className="group cursor-pointer transition-all hover:bg-surface-low">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15">
                    <MessageSquare className="h-5 w-5 text-orange-400" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">My Connections</h3>
                    <p className="text-xs text-text-muted">
                      {approvedCount > 0 ? `${approvedCount} connected` : "No connections yet"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pendingCount > 0 && (
                    <Badge variant="warning">{pendingCount} pending</Badge>
                  )}
                  <ArrowRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/farmer-network/directory">
          <Card className="group cursor-pointer transition-all hover:bg-surface-low">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15">
                    <Search className="h-5 w-5 text-orange-400" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Find Producers</h3>
                    <p className="text-xs text-text-muted">Browse the producer directory</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* In your region: producers in the same state, up to 4, excluding
          self and existing peer relationships. Hidden entirely if the user
          has no state on file or no eligible producers to show. */}
      {nearbyProducers.length > 0 && myState && (
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <MapPin className="h-4 w-4 text-orange-400" aria-hidden="true" />
              In your region ({myState})
            </h2>
            <Link
              href={`/dashboard/farmer-network/directory?state=${encodeURIComponent(myState)}`}
              className="text-xs font-medium text-orange-400 transition-colors hover:text-orange-300"
            >
              See all
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {nearbyProducers.map((p) => (
              <FarmerCard key={p.user_id} farmer={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
