import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isAdvisorRole, hasActivePermission, type ConnectionRequest } from "@/lib/types/advisory";
import type { Property, HerdGroup } from "@/lib/types/models";
import { PageHeader } from "@/components/ui/page-header";
import { SimulatorContent } from "@/components/app/simulator/simulator-content";

export const metadata = {
  title: "Simulator",
};

export default async function SimulatorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Gate: advisors only
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile?.role || !isAdvisorRole(profile.role)) {
    redirect("/dashboard");
  }

  // Fetch sandbox properties
  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_simulated", true)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  const sandboxProperties = (properties ?? []) as Property[];

  // Fetch herds for sandbox properties
  const propertyIds = sandboxProperties.map((p) => p.id);
  let sandboxHerds: HerdGroup[] = [];
  if (propertyIds.length > 0) {
    const { data: herds } = await supabase
      .from("herds")
      .select("*")
      .in("property_id", propertyIds)
      .eq("is_deleted", false)
      .order("name");
    sandboxHerds = (herds ?? []) as HerdGroup[];
  }

  // Fetch active client connections for duplicate dialog
  const { data: connections } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("requester_user_id", user.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const activeConnections = ((connections ?? []) as ConnectionRequest[]).filter(
    (c) => hasActivePermission(c)
  );

  // Fetch client profiles for display names
  const clientUserIds = activeConnections.map((c) => c.target_user_id);
  let clientProfiles: { user_id: string; display_name: string; property_name: string | null }[] = [];
  if (clientUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, property_name")
      .in("user_id", clientUserIds);
    clientProfiles = (profiles ?? []) as typeof clientProfiles;
  }

  return (
    <div>
      <PageHeader
        title="Simulator"
        subtitle="Sandbox environment for what-if scenarios"
        titleClassName="text-4xl font-bold text-[#FF5722]"
      />
      <SimulatorContent
        properties={sandboxProperties}
        herds={sandboxHerds}
        connections={activeConnections}
        clientProfiles={clientProfiles}
      />
    </div>
  );
}
