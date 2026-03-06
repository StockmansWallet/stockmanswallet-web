import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { HerdForm } from "@/components/app/herd-form";
import { MusterRecordsSection } from "@/components/app/muster-records-section";
import { HealthRecordsSection } from "@/components/app/health-records-section";
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

  const [{ data: herd }, { data: properties }, { data: musterRecords }, { data: healthRecords }] = await Promise.all([
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
    supabase
      .from("muster_records")
      .select("id, date, total_head_count, cattle_yard, weaners_count, branders_count, notes")
      .eq("herd_id", id)
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .order("date", { ascending: false }),
    supabase
      .from("health_records")
      .select("id, date, treatment_type, notes")
      .eq("herd_id", id)
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .order("date", { ascending: false }),
  ]);

  if (!herd) notFound();

  const boundUpdate = updateHerd.bind(null, id);

  return (
    <div className="max-w-6xl">
      <PageHeader
        title={`Edit: ${herd.name}`}
        subtitle={[herd.species, herd.breed].join(" · ")}
        actions={
          <>
            <Link
              href={`/dashboard/herds/${id}`}
              className="inline-flex h-8 items-center justify-center rounded-xl px-3.5 text-[13px] font-semibold text-text-secondary transition-all duration-150 hover:bg-white/8 hover:text-text-primary"
            >
              Cancel
            </Link>
            <Button type="submit" form="herd-form" size="sm">
              Save Changes
            </Button>
          </>
        }
      />
      <HerdForm
        herd={herd}
        properties={properties ?? []}
        action={boundUpdate}
      />

      <div className="mt-4 space-y-4">
        <MusterRecordsSection herdId={id} records={musterRecords ?? []} editable />
        <HealthRecordsSection herdId={id} records={healthRecords ?? []} editable />
      </div>
    </div>
  );
}
