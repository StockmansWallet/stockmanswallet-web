import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { GloveboxPageClient } from "@/components/app/files/files-page-client";
import type { GloveboxCollectionRow, GloveboxFileRow } from "@/lib/glovebox/files";

export const metadata = { title: "Glovebox" };

export default async function FilesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: files } = await supabase
    .from("glovebox_files")
    .select(
      "id, storage_path, title, original_filename, mime_type, size_bytes, kind, collection, tags, page_count, extraction_status, source, conversation_id, created_at, updated_at"
    )
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false });

  const { data: collections } = await supabase
    .from("glovebox_collections")
    .select("id, user_id, name, created_at, updated_at")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <PageHeader title="Glovebox" subtitle="Property and livestock documents." />
      <GloveboxPageClient
        userId={user.id}
        initialFiles={(files ?? []) as GloveboxFileRow[]}
        initialCollections={(collections ?? []) as GloveboxCollectionRow[]}
      />
    </div>
  );
}
