import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isAdvisorRole } from "@/lib/types/advisory";
import { PageHeader } from "@/components/ui/page-header";
import { AddHerdForm } from "@/components/app/add-herd-form";
import { ensureSandboxProperty, createSimulatorHerdFromForm } from "../actions";

export const metadata = {
  title: "Add Sandbox Herd",
};

export default async function SimulatorNewHerdPage() {
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

  // Get the sandbox property (auto-creates if missing)
  const result = await ensureSandboxProperty();
  if ("error" in result) {
    redirect("/dashboard/advisor/simulator");
  }

  // Fetch the sandbox property details for the form
  const { data: property } = await supabase
    .from("properties")
    .select("id, property_name, is_default, latitude, longitude, state")
    .eq("id", result.propertyId)
    .single();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Add Herd"
        subtitle="Add a herd to your simulator sandbox."
      />
      <AddHerdForm
        properties={property ? [property] : []}
        action={createSimulatorHerdFromForm}
      />
    </div>
  );
}
