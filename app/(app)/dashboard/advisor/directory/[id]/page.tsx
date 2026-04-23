import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, MapPin, Mail, Phone } from "lucide-react";
import { AdvisorConnectButton } from "../advisor-connect-button";

export const revalidate = 0;

export const metadata = {
  title: "Producer Profile",
};

export default async function ProducerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: producer } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", id)
    .single();

  if (!producer) notFound();

  // Check for existing connection in either direction
  const { data: existingConnections } = await supabase
    .from("connection_requests")
    .select("id, status")
    .or(
      `and(requester_user_id.eq.${user.id},target_user_id.eq.${id}),and(requester_user_id.eq.${id},target_user_id.eq.${user.id})`
    )
    .in("status", ["pending", "approved"]);

  const existingConnection = existingConnections?.[0] ?? null;

  const initials = (producer.display_name ?? "?")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      {/* Back nav */}
      <div className="pt-6 pb-4">
        <Link
          href="/dashboard/advisor/directory"
          className="bg-surface-lowest text-text-muted hover:bg-surface-low hover:text-text-secondary inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Producer Directory
        </Link>
      </div>

      <Card className="overflow-hidden">
        {/* Header */}
        <div className="from-success/[0.06] bg-gradient-to-r to-transparent p-6">
          <div className="flex items-center gap-4">
            <div className="bg-success/15 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-sm">
              <span className="text-success text-lg font-bold">{initials}</span>
            </div>
            <div className="flex-1">
              <h1 className="text-text-primary text-2xl font-bold">{producer.display_name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {producer.company_name && (
                  <span className="text-text-secondary text-sm">{producer.company_name}</span>
                )}
                {producer.state && (
                  <span className="text-text-muted flex items-center gap-1 text-sm">
                    <MapPin className="h-3.5 w-3.5" />
                    {producer.state}
                    {producer.region ? `, ${producer.region}` : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <CardContent className="space-y-5 px-6 pb-6">
          {producer.property_name && (
            <div>
              <h3 className="text-text-muted mb-1.5 text-xs font-semibold">Property</h3>
              <p className="text-text-secondary text-sm">{producer.property_name}</p>
            </div>
          )}

          {producer.bio && (
            <div>
              <h3 className="text-text-muted mb-1.5 text-xs font-semibold">About</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{producer.bio}</p>
            </div>
          )}

          {(producer.contact_email || producer.contact_phone) && (
            <div>
              <h3 className="text-text-muted mb-2.5 text-xs font-semibold">Contact</h3>
              <div className="space-y-2">
                {producer.contact_email && (
                  <a
                    href={`mailto:${producer.contact_email}`}
                    className="text-advisor flex items-center gap-2.5 rounded-lg bg-white/[0.03] px-3.5 py-2.5 text-sm transition-colors hover:bg-white/[0.06]"
                  >
                    <Mail className="h-4 w-4" />
                    {producer.contact_email}
                  </a>
                )}
                {producer.contact_phone && (
                  <a
                    href={`tel:${producer.contact_phone.replace(/\s/g, "")}`}
                    className="text-advisor flex items-center gap-2.5 rounded-lg bg-white/[0.03] px-3.5 py-2.5 text-sm transition-colors hover:bg-white/[0.06]"
                  >
                    <Phone className="h-4 w-4" />
                    {producer.contact_phone}
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="border-t border-white/5 pt-5">
            <AdvisorConnectButton
              targetUserId={id}
              existingStatus={existingConnection?.status ?? null}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
