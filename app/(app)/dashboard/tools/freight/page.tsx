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
      .from("herds")
      .select("id, name, species, breed, sex, category, head_count, current_weight, is_breeder, property_id, additional_info")
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
    <div className="max-w-4xl">
      <PageHeader feature="freight-iq"
        title="Freight IQ"
        titleClassName="text-4xl font-bold text-info"
        subtitle="Deck loading and route costing"
        subtitleClassName="text-sm font-medium text-text-secondary"
      />
      <FreightCalculator herds={herds ?? []} properties={properties ?? []} />
    </div>
  );
}
