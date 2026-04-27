import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { YardBookNoteForm } from "@/components/app/yard-book-note-form";
import { createYardBookNote } from "../actions";

export const metadata = { title: "New Note - Yard Book" };

export default async function NewYardBookNotePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: herds } = await supabase
    .from("herds")
    .select("id, name, head_count")
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .eq("is_sold", false)
    .order("name");

  return (
    <div className="max-w-3xl">
      <PageHeader
        feature="yard-book"
        title="New Note"
        subtitle="Add a free-form note to your pocketbook."
      />
      <Card className="p-5">
        <YardBookNoteForm
          herds={herds ?? []}
          action={createYardBookNote}
          submitLabel="Save Note"
        />
      </Card>
    </div>
  );
}
