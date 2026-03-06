import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { HerdForm } from "@/components/app/herd-form";
import { updateHerd } from "../../actions";

export const metadata = {
  title: "Edit Herd",
};

export default async function EditHerdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: herd }, { data: properties }] = await Promise.all([
    supabase
      .from("herd_groups")
      .select("*")
      .eq("id", id)
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .single(),
    supabase
      .from("properties")
      .select("id, property_name")
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .order("property_name"),
  ]);

  if (!herd) notFound();

  const boundUpdate = updateHerd.bind(null, id);

  return (
    <div className="max-w-6xl">
      <PageHeader
        title={`Edit: ${herd.name}`}
        subtitle={[herd.species, herd.breed].join(" · ")}
      />
      <HerdForm
        herd={herd}
        properties={properties ?? []}
        action={boundUpdate}
        submitLabel="Save Changes"
      />
    </div>
  );
}
