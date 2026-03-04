import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { YardBookForm } from "@/components/app/yard-book-form";
import { updateYardBookItem } from "../../actions";

export const metadata = { title: "Edit Yard Book Item" };

export default async function EditYardBookItemPage({
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

  const [{ data: item }, { data: herds }, { data: properties }] =
    await Promise.all([
      supabase
        .from("yard_book_items")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .eq("is_deleted", false)
        .single(),
      supabase
        .from("herd_groups")
        .select("id, name, head_count")
        .eq("user_id", user.id)
        .eq("is_deleted", false)
        .eq("is_sold", false)
        .order("name"),
      supabase
        .from("properties")
        .select("id, property_name")
        .eq("user_id", user.id)
        .eq("is_deleted", false)
        .order("property_name"),
    ]);

  if (!item) notFound();

  const boundUpdate = updateYardBookItem.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`Edit: ${item.title}`}
        subtitle={item.category}
      />
      <Card>
        <CardContent className="p-6">
          <YardBookForm
            item={item}
            herds={herds ?? []}
            properties={properties ?? []}
            action={boundUpdate}
            submitLabel="Save Changes"
          />
        </CardContent>
      </Card>
    </div>
  );
}
