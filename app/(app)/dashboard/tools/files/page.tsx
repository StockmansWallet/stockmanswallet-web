import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { GloveboxPageClient } from "@/components/app/files/files-page-client";
import type {
  GloveboxCollectionGroupRow,
  GloveboxCollectionRow,
  GloveboxFileRow,
} from "@/lib/glovebox/files";

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
      "id, storage_path, title, original_filename, mime_type, size_bytes, kind, collection_id, collection, tags, page_count, extraction_status, source, conversation_id, created_at, updated_at"
    )
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false });

  const { data: groups } = await supabase
    .from("glovebox_collection_groups")
    .select("id, user_id, name, sort_order, is_system_default, created_at, updated_at")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const { data: collections } = await supabase
    .from("glovebox_collections")
    .select("id, user_id, group_id, name, sort_order, is_system_default, created_at, updated_at")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <PageHeader title="Glovebox" subtitle="Property and livestock documents." />
      <GloveboxPageClient
        userId={user.id}
        initialFiles={(files ?? []) as GloveboxFileRow[]}
        initialGroups={(groups ?? []) as GloveboxCollectionGroupRow[]}
        initialCollections={(collections ?? []) as GloveboxCollectionRow[]}
      />
    </div>
  );
}
