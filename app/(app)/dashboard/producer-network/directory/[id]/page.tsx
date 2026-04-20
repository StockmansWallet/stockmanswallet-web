import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building2, Handshake, Home, Ban } from "lucide-react";
import { ProducerConnectButton } from "@/components/app/producer-network/producer-connect-button";
import { ProducerConnectionStatusBadge } from "@/components/app/producer-network/producer-connection-status-badge";
import { ModerationMenu } from "./moderation-menu";
import { enrichProducers } from "@/lib/data/producer-enrichment";
import { isBlockedBy } from "@/lib/data/user-blocks";

const SPECIES_EMOJI: Record<string, string> = {
  Cattle: "\uD83D\uDC04",
  Sheep: "\uD83D\uDC0F",
  Pig: "\uD83D\uDC16",
  Goat: "\uD83D\uDC10",
};

const HERD_SIZE_LABEL: Record<string, string> = {
  small: "Small (< 100 head)",
  medium: "Medium (100-999 head)",
  large: "Large (1,000+ head)",
};

export const metadata = {
  title: "Producer Profile",
};

export default async function ProducerProfilePage({
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

  const { data: producer } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, company_name, role, state, region, bio")
    .eq("user_id", id)
    .single();

  if (!producer) notFound();

  // Moderation: is the viewer blocked BY this producer? Hides their details
  // as if the producer doesn't exist. Uses service role because the
  // user_blocks RLS policy deliberately doesn't let the blocked side read
  // who blocked them, so the check has to run out-of-band.
  const svc = createServiceRoleClient();
  const blockedByViewedProducer = await isBlockedBy(svc, user.id, id);
  if (blockedByViewedProducer) notFound();

  // Have WE blocked THEM? Surface an unblock state instead of connect.
  const { data: ownBlockRows } = await supabase
    .from("user_blocks")
    .select("id")
    .eq("blocker_user_id", user.id)
    .eq("blocked_user_id", id)
    .limit(1);
  const viewerBlockedThem = (ownBlockRows?.length ?? 0) > 0;

  // Enrich with species + herd-size bucket + property count for the profile.
  const enrichmentMap = await enrichProducers(supabase, [id]);
  const enrichment = enrichmentMap.get(id);

  // Check for existing producer_peer connection (either direction)
  const { data: existingConnections } = await supabase
    .from("connection_requests")
    .select("id, status, requester_user_id")
    .eq("connection_type", "producer_peer")
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
      <PageHeader feature="producer-network"
        title="Producer Profile"
        titleClassName="text-4xl font-bold text-producer-network-light"
        titleHref="/dashboard/producer-network/directory"
        subtitle="Back to directory"
        subtitleClassName="text-sm font-medium text-text-secondary"
      />

      <Card className="mb-6 overflow-hidden">
        <div className="bg-gradient-to-br from-producer-network/10 via-transparent to-transparent p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-producer-network/15">
              <Handshake className="h-7 w-7 text-producer-network-light" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-text-primary">
                {producer.display_name}
              </h2>
              {producer.company_name && (
                <span className="mt-1 flex items-center gap-1 text-sm text-text-secondary">
                  <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {producer.company_name}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2 self-start">
              {viewerBlockedThem ? (
                <Badge variant="default">
                  <Ban className="mr-1 h-3 w-3" aria-hidden="true" />
                  Blocked
                </Badge>
              ) : (
                <ProducerConnectionStatusBadge status={existingStatus} />
              )}
              <ModerationMenu
                targetUserId={id}
                targetName={producer.display_name}
                alreadyBlocked={viewerBlockedThem}
              />
            </div>
          </div>
        </div>

        <CardContent className="space-y-5 px-6 pb-6">
          {/* Operation facts row: location, primary species, herd size, properties.
              Each field hides if unavailable so the row scales cleanly for
              producers who haven't filled out much yet. */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-secondary">
            {(producer.state || producer.region) && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-text-muted" aria-hidden="true" />
                {producer.state}
                {producer.region ? `, ${producer.region}` : ""}
              </span>
            )}
            {enrichment?.primary_species && (
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true">{SPECIES_EMOJI[enrichment.primary_species] ?? ""}</span>
                {enrichment.primary_species}
              </span>
            )}
            {enrichment?.herd_size_bucket && (
              <span className="flex items-center gap-1.5 text-text-muted">
                {HERD_SIZE_LABEL[enrichment.herd_size_bucket]}
              </span>
            )}
            {enrichment && enrichment.property_count > 0 && (
              <span className="flex items-center gap-1.5 text-text-muted">
                <Home className="h-4 w-4" aria-hidden="true" />
                {enrichment.property_count === 1 ? "1 property" : `${enrichment.property_count} properties`}
              </span>
            )}
          </div>

          {producer.bio && (
            <div>
              <h3 className="mb-1.5 text-xs font-semibold uppercase text-text-muted">About</h3>
              <p className="text-sm leading-relaxed text-text-secondary">{producer.bio}</p>
            </div>
          )}

          {!viewerBlockedThem && existingStatus !== "approved" && (
            <div className="flex justify-end border-t border-white/5 pt-4">
              <ProducerConnectButton
                targetUserId={id}
                existingStatus={existingStatus}
                pendingRequestIdIfSent={pendingRequestIdIfSent}
              />
            </div>
          )}
          {viewerBlockedThem && (
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-surface-lowest p-4">
              <Ban className="h-5 w-5 shrink-0 text-text-muted" aria-hidden="true" />
              <p className="text-sm text-text-muted">
                You have blocked this producer. Use the menu above to unblock and restore access.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
