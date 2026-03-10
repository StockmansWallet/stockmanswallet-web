import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { HerdForm } from "@/components/app/herd-form";
import { createHerd } from "../actions";

export const metadata = {
  title: "Add Herd",
};

export default async function NewHerdPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: properties } = await supabase
    .from("properties")
    .select("id, property_name")
    .eq("user_id", user!.id)
    .eq("is_deleted", false)
    .order("property_name");

  return (
    <div className="max-w-6xl pb-24">
      <PageHeader
        title="Add Herd"
        subtitle="Create a new herd to track your livestock."
      />
      <HerdForm
        properties={properties ?? []}
        action={createHerd}
        submitLabel="Add Herd"
        cancelHref="/dashboard/herds"
      />
    </div>
  );
}
