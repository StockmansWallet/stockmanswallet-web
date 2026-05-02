import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { YardBookNoteForm } from "@/components/app/yard-book-note-form";
import { DeleteYardBookNoteButton } from "./delete-button";
import { updateYardBookNote } from "../../actions";

export const metadata = { title: "Edit Note - Yard Book" };

export default async function EditYardBookNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [{ data: note }, { data: herds }] = await Promise.all([
    supabase
      .from("yard_book_notes")
      .select("id, title, body, is_pinned, linked_herd_ids, attachment_file_ids")
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .single(),
    supabase
      .from("herds")
      .select("id, name, head_count")
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .eq("is_sold", false)
      .order("name"),
  ]);

  if (!note) notFound();

  const update = updateYardBookNote.bind(null, id);

  return (
    <div className="max-w-3xl">
      <PageHeader
        feature="yard-book"
        title="Edit Note"
        subtitle="Update your note."
        actions={<DeleteYardBookNoteButton id={id} />}
      />
      <Card className="p-5">
        <YardBookNoteForm
          note={{
            id: note.id,
            title: note.title ?? "",
            body: note.body ?? "",
            is_pinned: note.is_pinned ?? false,
            linked_herd_ids: note.linked_herd_ids ?? null,
            attachment_file_ids: note.attachment_file_ids ?? null,
          }}
          herds={herds ?? []}
          action={update}
          submitLabel="Save Changes"
        />
      </Card>
    </div>
  );
}
