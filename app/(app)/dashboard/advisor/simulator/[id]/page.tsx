import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { isAdvisorRole } from "@/lib/types/advisory";
import type { Property, HerdGroup } from "@/lib/types/models";
import { PageHeader } from "@/components/ui/page-header";
import { SimulatorPropertyDetail } from "@/components/app/simulator/simulator-property-detail";

export const metadata = {
  title: "Sandbox Property",
};

export default async function SimulatorPropertyPage({
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

  // Gate: advisors only
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile?.role || !isAdvisorRole(profile.role)) {
    redirect("/dashboard");
  }

  // Fetch sandbox property
  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_simulated", true)
    .eq("is_deleted", false)
    .single();

  if (!property) notFound();

  // Fetch herds for this property
  const { data: herds } = await supabase
    .from("herds")
    .select("*")
    .eq("property_id", id)
    .eq("is_deleted", false)
    .order("name");

  return (
    <div>
      <PageHeader
        title={(property as Property).property_name}
        titleHref="/dashboard/advisor/simulator"
        subtitle="Sandbox Property"
        titleClassName="text-4xl font-bold text-[#FF5722]"
      />
      <SimulatorPropertyDetail
        property={property as Property}
        herds={(herds ?? []) as HerdGroup[]}
      />
    </div>
  );
}
