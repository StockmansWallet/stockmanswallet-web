import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { HerdForm } from "@/components/app/herd-form";
import { MusterRecordsSection } from "@/components/app/muster-records-section";
import { HealthRecordsSection } from "@/components/app/health-records-section";
import { updateHerd } from "../../actions";
import { DEMO_LOCAL_ID_PREFIX } from "@/lib/demo-overlay";
import { LocalHerdEditView } from "./local-herd-edit";

export const metadata = {
  title: "Edit Herd",
};

export default async function EditHerdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Demo sandbox: local herds are edited entirely in the browser.
  if (id.startsWith(DEMO_LOCAL_ID_PREFIX)) {
    const [{ data: properties }, { data: ownerRows }] = await Promise.all([
      supabase
        .from("properties")
        .select("id, property_name")
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
    const existingOwners = [
      ...new Set(
        (ownerRows ?? [])
          .map((r: { livestock_owner: string | null }) => (r.livestock_owner ?? "").trim())
          .filter((s: string) => s.length > 0)
      ),
    ].sort((a, b) => a.localeCompare(b));
    return (
      <LocalHerdEditView id={id} properties={properties ?? []} existingOwners={existingOwners} />
    );
  }

  const [
    { data: herd },
    { data: properties },
    { data: musterRecords },
    { data: healthRecords },
    { data: ownerRows },
  ] = await Promise.all([
    supabase
      .from("herds")
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
      .select("id, date, total_head_count, cattle_yard, weaners_count, branders_count, notes, photo_paths")
      .eq("herd_id", id)
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .order("date", { ascending: false }),
    supabase
      .from("health_records")
      .select("id, date, treatment_type, notes, photo_paths")
      .eq("herd_id", id)
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .order("date", { ascending: false }),
    supabase
      .from("herds")
      .select("livestock_owner")
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .not("livestock_owner", "is", null),
  ]);

  if (!herd) notFound();

  const boundUpdate = updateHerd.bind(null, id);

  // Sign every record photo in one batch so the section components can render
  // private storage objects directly.
  const allPhotoPaths = [
    ...(musterRecords ?? []).flatMap((r) => (r.photo_paths as string[] | null) ?? []),
    ...(healthRecords ?? []).flatMap((r) => (r.photo_paths as string[] | null) ?? []),
  ];
  const signedUrlMap = new Map<string, string>();
  if (allPhotoPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("record-photos")
      .createSignedUrls(allPhotoPaths, 60 * 60);
    for (const entry of signed ?? []) {
      if (entry.path && entry.signedUrl) {
        signedUrlMap.set(entry.path, entry.signedUrl);
      }
    }
  }
  const attachPhotos = <T extends { photo_paths: string[] | null }>(record: T) => {
    const paths = record.photo_paths ?? [];
    const photos = paths
      .map((path) => {
        const url = signedUrlMap.get(path);
        return url ? { path, url } : null;
      })
      .filter((p): p is { path: string; url: string } => p !== null);
    return { ...record, photos };
  };
  const musterRecordsWithPhotos = (musterRecords ?? []).map(attachPhotos);
  const healthRecordsWithPhotos = (healthRecords ?? []).map(attachPhotos);

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
      <PageHeader title={`Edit: ${herd.name}`} subtitle={[herd.species, herd.breed].join(" · ")} />
      <HerdForm
        herd={herd}
        properties={properties ?? []}
        existingOwners={existingOwners}
        action={boundUpdate}
        submitLabel="Save Changes"
        cancelHref={`/dashboard/herds/${id}`}
      />

      <div className="mt-4 space-y-4">
        <MusterRecordsSection
          herdId={id}
          userId={user!.id}
          records={musterRecordsWithPhotos}
          editable
        />
        <HealthRecordsSection
          herdId={id}
          userId={user!.id}
          records={healthRecordsWithPhotos}
          editable
        />
      </div>
    </div>
  );
}
