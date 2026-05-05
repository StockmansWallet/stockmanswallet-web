import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { YardbookForm } from "@/components/app/yardbook-form";
import { updateYardbookItem } from "../../actions";

export const metadata = { title: "Edit Yardbook Item" };

export default async function EditYardbookItemPage({
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
        .from("herds")
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

  const boundUpdate = updateYardbookItem.bind(null, id);

  return (
    <div className="w-full max-w-[1680px]">
      <PageHeader feature="yardbook"
        title={`Edit: ${item.title}`}
        titleClassName="text-4xl font-bold text-yardbook"
        subtitle={item.category_raw}
      />
      <YardbookForm
        item={item}
        herds={herds ?? []}
        properties={properties ?? []}
        action={boundUpdate}
        submitLabel="Save Changes"
      />
    </div>
  );
}
