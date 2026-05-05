import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { YardbookForm } from "@/components/app/yardbook-form";
import { createYardbookItem } from "../actions";

export const metadata = { title: "Add Yardbook Item" };

export default async function NewYardbookItemPage() {
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
    <div className="w-full max-w-[1680px]">
      <PageHeader
        feature="yardbook"
        title="Add Item"
        subtitle="Add a new item to your yardbook."
      />
      <YardbookForm
        herds={herds ?? []}
        properties={properties ?? []}
        action={createYardbookItem}
        submitLabel="Add Item"
      />
    </div>
  );
}
