import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { FilesPageClient } from "@/components/app/files/files-page-client";
import type { BrangusFileRow } from "@/lib/brangus/files";

export const metadata = { title: "Files" };

export default async function FilesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: filesWithCategory, error: filesError } = await supabase
    .from("brangus_files")
    .select(
      "id, storage_path, title, original_filename, mime_type, size_bytes, kind, category, tags, page_count, extraction_status, source, conversation_id, created_at, updated_at"
    )
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false });

  let files = filesWithCategory;

  if (filesError) {
    const fallback = await supabase
      .from("brangus_files")
      .select(
        "id, storage_path, title, original_filename, mime_type, size_bytes, kind, tags, page_count, extraction_status, source, conversation_id, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false });

    files = fallback.data?.map((file) => ({ ...file, category: null })) ?? null;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Files" subtitle="Property and livestock documents." />
      <FilesPageClient userId={user.id} initialFiles={(files ?? []) as BrangusFileRow[]} />
    </div>
  );
}
