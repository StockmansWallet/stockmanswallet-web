import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { YardbookNoteForm } from "@/components/app/yardbook-note-form";
import { createYardbookNote } from "../actions";

export const metadata = { title: "New Note - Yardbook" };

export default async function NewYardbookNotePage() {
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
        feature="yardbook"
        title="New Note"
        subtitle="Add a free-form note to your pocketbook."
      />
      <Card className="p-5">
        <YardbookNoteForm
          herds={herds ?? []}
          action={createYardbookNote}
          submitLabel="Save Note"
        />
      </Card>
    </div>
  );
}
