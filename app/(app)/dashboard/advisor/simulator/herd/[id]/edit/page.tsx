import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdvisorRole } from "@/lib/types/advisory";
import { PageHeader } from "@/components/ui/page-header";
import { HerdForm } from "@/components/app/herd-form";
import { updateSimulatorHerd } from "../../../actions";

export const metadata = {
  title: "Edit Sandbox Herd",
};

export default async function SimulatorEditHerdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile?.role || !isAdvisorRole(profile.role)) redirect("/dashboard");

  const [{ data: herd }, { data: properties }] = await Promise.all([
    supabase
      .from("herds")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .single(),
    supabase
      .from("properties")
      .select("id, property_name")
      .eq("user_id", user.id)
      .eq("is_simulated", true)
      .eq("is_deleted", false)
      .order("property_name"),
  ]);

  if (!herd) notFound();

  const boundUpdate = updateSimulatorHerd.bind(null, id);

  return (
    <div className="max-w-6xl pb-24">
      <PageHeader
        title={`Edit: ${herd.name}`}
        subtitle={[herd.species, herd.breed].join(" \u00B7 ")}
      />
      <HerdForm
        herd={herd}
        properties={properties ?? []}
        action={boundUpdate}
        submitLabel="Save Changes"
        cancelHref={`/dashboard/advisor/simulator/herd/${id}`}
      />
    </div>
  );
}
