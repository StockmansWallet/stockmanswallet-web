import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Handshake, Search, MessageSquare, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Producer Network",
};

export default async function FarmerNetworkPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Count connections where user is either requester or target
  const { data: connections } = await supabase
    .from("connection_requests")
    .select("id, status, requester_user_id, target_user_id")
    .eq("connection_type", "farmer_peer")
    .or(`requester_user_id.eq.${user.id},target_user_id.eq.${user.id}`);

  const approvedCount = connections?.filter((c) => c.status === "approved").length ?? 0;
  const pendingCount = connections?.filter(
    (c) => c.status === "pending" && c.target_user_id === user.id
  ).length ?? 0;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Producer Network"
        titleClassName="text-4xl font-bold text-orange-400"
        subtitle="Connect and chat with other producers"
        subtitleClassName="text-sm font-medium text-text-secondary"
        inline
      />

      {/* Hero section */}
      <Card className="mb-6 overflow-hidden">
        <div className="bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15">
              <Handshake className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                Your Producer Network
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Connect with other producers in your area.
                Chat directly, share experiences, and build your network.
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
                    <MessageSquare className="h-5 w-5 text-orange-400" />
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
                  <ArrowRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5" />
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
                    <Search className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Find Producers</h3>
                    <p className="text-xs text-text-muted">Browse the producer directory</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
