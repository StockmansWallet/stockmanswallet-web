import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Mail, Phone, Building2 } from "lucide-react";
import { getCategoryConfig } from "@/lib/types/advisory";
import { ConnectionRequestButton } from "@/components/app/advisory/connection-request-button";
import { ConnectionRealtime } from "@/components/app/advisory/connection-realtime";

export const revalidate = 0;

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
  const categoryBg = categoryConfig?.bgClass ?? "bg-[#2F8CD9]/15";
  const categoryColour = categoryConfig?.colorClass ?? "text-[#2F8CD9]";

  return (
    <div className="max-w-2xl">
      <ConnectionRealtime userId={user.id} />

      {/* Back link */}
      <Link
        href="/dashboard/advisory-hub/directory"
        className="mb-5 mt-1 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text-secondary"
      >
        <ArrowLeft className="h-4 w-4" />
        Advisor Directory
      </Link>

      {/* Profile card */}
      <Card className="mb-6 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-white/[0.04] to-transparent p-6">
          <div className="flex items-center gap-4">
            <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${categoryBg} shadow-sm`}>
              {categoryConfig ? (
                <categoryConfig.icon className={`h-8 w-8 ${categoryColour}`} />
              ) : (
                <span className="text-xl font-bold text-[#2F8CD9]">{advisor.display_name?.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-text-primary">
                {advisor.display_name}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {categoryConfig && (
                  <Badge variant="default">{categoryConfig.label}</Badge>
                )}
                {advisor.company_name && (
                  <span className="flex items-center gap-1.5 text-sm text-text-secondary">
                    <Building2 className="h-3.5 w-3.5" />
                    {advisor.company_name}
                  </span>
                )}
                {advisor.state && (
                  <span className="flex items-center gap-1 text-sm text-text-muted">
                    <MapPin className="h-3.5 w-3.5" />
                    {advisor.state}{advisor.region ? `, ${advisor.region}` : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <CardContent className="space-y-5 px-6 pb-6">
          {/* Bio */}
          {advisor.bio && (
            <div>
              <h3 className="mb-2 text-xs font-semibold text-text-muted">About</h3>
              <p className="text-sm leading-relaxed text-text-secondary">{advisor.bio}</p>
            </div>
          )}

          {/* Contact info */}
          {(advisor.contact_email || advisor.contact_phone) && (
            <div>
              <h3 className="mb-2.5 text-xs font-semibold text-text-muted">Contact</h3>
              <div className="space-y-2">
                {advisor.contact_email && (
                  <a
                    href={`mailto:${advisor.contact_email}`}
                    className="flex items-center gap-2.5 rounded-lg bg-white/[0.03] px-3.5 py-2.5 text-sm text-[#2F8CD9] transition-colors hover:bg-white/[0.06]"
                  >
                    <Mail className="h-4 w-4" />
                    {advisor.contact_email}
                  </a>
                )}
                {advisor.contact_phone && (
                  <a
                    href={`tel:${advisor.contact_phone.replace(/\s/g, "")}`}
                    className="flex items-center gap-2.5 rounded-lg bg-white/[0.03] px-3.5 py-2.5 text-sm text-[#2F8CD9] transition-colors hover:bg-white/[0.06]"
                  >
                    <Phone className="h-4 w-4" />
                    {advisor.contact_phone}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Connection action */}
          <div className="border-t border-white/5 pt-5">
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
