import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Mail, Phone, Building2 } from "lucide-react";
import { getCategoryConfig } from "@/lib/types/advisory";
import { ConnectionRequestButton } from "@/components/app/advisory/connection-request-button";

export const metadata = {
  title: "Advisor Profile",
};

export default async function AdvisorProfilePage({
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

  // Fetch advisor profile
  const { data: advisor } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", id)
    .single();

  if (!advisor) notFound();

  // Check for existing connection in either direction
  const { data: existingConnections } = await supabase
    .from("connection_requests")
    .select("id, status")
    .or(`and(requester_user_id.eq.${user.id},target_user_id.eq.${id}),and(requester_user_id.eq.${id},target_user_id.eq.${user.id})`)
    .in("status", ["pending", "approved"]);

  const existingConnection = existingConnections?.[0] ?? null;
  const categoryConfig = getCategoryConfig(advisor.role);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Advisor Profile"
        titleClassName="text-4xl font-bold text-[#2F8CD9]"
        titleHref="/dashboard/advisory-hub/directory"
        subtitle="Back to directory"
        subtitleClassName="text-sm font-medium text-text-secondary"
        inline
      />

      <Card className="mb-6 overflow-hidden">
        <div className="bg-gradient-to-br from-[#2F8CD9]/10 via-transparent to-transparent p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#2F8CD9]/15">
              {categoryConfig ? (
                <categoryConfig.icon className={`h-7 w-7 ${categoryConfig.colorClass}`} />
              ) : (
                <div className="h-7 w-7 rounded-full bg-[#2F8CD9]" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-text-primary">
                {advisor.display_name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {categoryConfig && (
                  <Badge variant="default">{categoryConfig.label}</Badge>
                )}
                {advisor.company_name && (
                  <span className="flex items-center gap-1 text-sm text-text-secondary">
                    <Building2 className="h-3.5 w-3.5" />
                    {advisor.company_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <CardContent className="space-y-5 px-6 pb-6">
          {/* Location */}
          {(advisor.state || advisor.region) && (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <MapPin className="h-4 w-4 text-text-muted" />
              {advisor.state}
              {advisor.region ? `, ${advisor.region}` : ""}
            </div>
          )}

          {/* Bio */}
          {advisor.bio && (
            <div>
              <h3 className="mb-1.5 text-xs font-semibold uppercase text-text-muted">About</h3>
              <p className="text-sm leading-relaxed text-text-secondary">{advisor.bio}</p>
            </div>
          )}

          {/* Contact info */}
          {(advisor.contact_email || advisor.contact_phone) && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase text-text-muted">Contact</h3>
              <div className="space-y-2">
                {advisor.contact_email && (
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Mail className="h-4 w-4 text-text-muted" />
                    {advisor.contact_email}
                  </div>
                )}
                {advisor.contact_phone && (
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Phone className="h-4 w-4 text-text-muted" />
                    {advisor.contact_phone}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Connection action */}
          <div className="border-t border-white/5 pt-4">
            <ConnectionRequestButton
              targetUserId={id}
              existingStatus={existingConnection?.status ?? null}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
