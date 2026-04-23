import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { AddHerdForm } from "@/components/app/add-herd-form";
import { createHerd } from "../actions";

export const metadata = {
  title: "Add Herd",
};

export default async function NewHerdPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: properties }, { data: ownerRows }] = await Promise.all([
    supabase
      .from("properties")
      .select("id, property_name, is_default, latitude, longitude, state")
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .order("property_name"),
    supabase
      .from("herds")
      .select("livestock_owner")
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .not("livestock_owner", "is", null),
  ]);

  // Distinct list of previously-used livestock owners to power the typeahead.
  const existingOwners = [
    ...new Set(
      (ownerRows ?? [])
        .map((r: { livestock_owner: string | null }) => (r.livestock_owner ?? "").trim())
        .filter((s: string) => s.length > 0)
    ),
  ].sort((a, b) => a.localeCompare(b));

  return (
    <div>
      <PageHeader
        title="Add Herd"
        subtitle="Create a new herd to track your livestock."
        titleClassName="text-4xl font-bold text-brand"
      />
      <AddHerdForm
        properties={properties ?? []}
        existingOwners={existingOwners}
        action={createHerd}
      />
    </div>
  );
}
