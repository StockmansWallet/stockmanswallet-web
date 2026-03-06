import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { FreightCalculator } from "./freight-calculator";

export const metadata = {
  title: "Freight IQ",
};

export default async function FreightPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: herds }, { data: properties }] = await Promise.all([
    supabase
      .from("herd_groups")
      .select("id, name, species, breed, sex, category, head_count, current_weight, is_breeder, property_id")
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .eq("is_sold", false)
      .order("name"),
    supabase
      .from("properties")
      .select("id, property_name, latitude, longitude, state, suburb")
      .eq("user_id", user!.id)
      .eq("is_deleted", false)
      .order("property_name"),
  ]);

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Freight IQ"
        subtitle="Calculate freight costs with deck loading and route costing."
      />
      <FreightCalculator herds={herds ?? []} properties={properties ?? []} />
    </div>
  );
}
