import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Building2, Handshake } from "lucide-react";
import { FarmerConnectButton } from "@/components/app/farmer-network/farmer-connect-button";
import { FarmerConnectionStatusBadge } from "@/components/app/farmer-network/farmer-connection-status-badge";

export const metadata = {
  title: "Producer Profile",
};

export default async function FarmerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: farmer } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, company_name, role, state, region, bio")
    .eq("user_id", id)
    .single();

  if (!farmer) notFound();

  // Check for existing farmer_peer connection (either direction)
  const { data: existingConnections } = await supabase
    .from("connection_requests")
    .select("id, status, requester_user_id")
    .eq("connection_type", "farmer_peer")
    .or(
      `and(requester_user_id.eq.${user.id},target_user_id.eq.${id}),and(requester_user_id.eq.${id},target_user_id.eq.${user.id})`
    );

  // Find the most relevant existing connection
  const activeOrPending = existingConnections?.find(
    (c) => c.status === "pending" || c.status === "approved"
  );
  const deniedOrExpired = existingConnections?.find(
    (c) => c.status === "denied" || c.status === "expired"
  );
  const existingStatus = activeOrPending?.status ?? deniedOrExpired?.status ?? null;
  // Only the requester can cancel a pending request; the target approves or denies instead.
  const pendingRequestIdIfSent =
    activeOrPending?.status === "pending" && activeOrPending.requester_user_id === user.id
      ? activeOrPending.id
      : null;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Producer Profile"
        titleClassName="text-4xl font-bold text-orange-400"
        titleHref="/dashboard/farmer-network/directory"
        subtitle="Back to directory"
        subtitleClassName="text-sm font-medium text-text-secondary"
      />

      <Card className="mb-6 overflow-hidden">
        <div className="bg-gradient-to-br from-orange-500/10 via-transparent to-transparent p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15">
              <Handshake className="h-7 w-7 text-orange-400" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-text-primary">
                {farmer.display_name}
              </h2>
              {farmer.company_name && (
                <span className="mt-1 flex items-center gap-1 text-sm text-text-secondary">
                  <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {farmer.company_name}
                </span>
              )}
            </div>
            <div className="shrink-0 self-start">
              <FarmerConnectionStatusBadge status={existingStatus} />
            </div>
          </div>
        </div>

        <CardContent className="space-y-5 px-6 pb-6">
          {(farmer.state || farmer.region) && (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <MapPin className="h-4 w-4 text-text-muted" aria-hidden="true" />
              {farmer.state}
              {farmer.region ? `, ${farmer.region}` : ""}
            </div>
          )}

          {farmer.bio && (
            <div>
              <h3 className="mb-1.5 text-xs font-semibold uppercase text-text-muted">About</h3>
              <p className="text-sm leading-relaxed text-text-secondary">{farmer.bio}</p>
            </div>
          )}

          {existingStatus !== "approved" && (
            <div className="flex justify-end border-t border-white/5 pt-4">
              <FarmerConnectButton
                targetUserId={id}
                existingStatus={existingStatus}
                pendingRequestIdIfSent={pendingRequestIdIfSent}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
