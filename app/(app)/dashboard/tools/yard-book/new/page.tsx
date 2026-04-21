import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { YardBookForm } from "@/components/app/yard-book-form";
import { createYardBookItem } from "../actions";

export const metadata = { title: "Add Yard Book Item" };

export default async function NewYardBookItemPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const [{ data: herds }, { data: properties }] = await Promise.all([
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

  return (
    <div className="max-w-4xl">
      <PageHeader
        feature="yard-book"
        title="Add Item"
        subtitle="Add a new item to your yard book."
      />
      <YardBookForm
        herds={herds ?? []}
        properties={properties ?? []}
        action={createYardBookItem}
        submitLabel="Add Item"
      />
    </div>
  );
}
