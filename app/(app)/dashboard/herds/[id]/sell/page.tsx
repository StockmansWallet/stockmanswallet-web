import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { SellStockForm } from "@/components/app/sell-stock-form";
import { calculateProjectedWeight, calculateHerdValuation, categoryFallback, type CategoryPriceEntry } from "@/lib/engines/valuation-engine";
import { resolveMLACategory } from "@/lib/data/weight-mapping";
import { cattleBreedPremiums, resolveMLASaleyardName } from "@/lib/data/reference-data";

export const revalidate = 0;

export const metadata = {
  title: "Sell Stock",
};

export default async function SellStockPage({
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

  const [herdResult, { data: breedPremiumData }] = await Promise.all([
    supabase
      .from("herds")
      .select("id, name, breed, category, species, head_count, current_weight, initial_weight, daily_weight_gain, dwg_change_date, previous_dwg, selected_saleyard, additional_info, age_months, is_sold, is_deleted, created_at, updated_at, breed_premium_override, mortality_rate, is_breeder, is_pregnant, joined_date, calving_rate, breeding_program_type, joining_period_start, joining_period_end, calf_weight_recorded_date, breeder_sub_type, sub_category")
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .single(),
    supabase
      .from("breed_premiums")
      .select("breed, premium_percent:premium_pct"),
  ]);

  const herd = herdResult.data;
  if (!herd) notFound();
  if (herd.is_sold) redirect(`/dashboard/herds/${id}`);

  // Calculate projected weight
  let projectedWeight = herd.current_weight ?? herd.initial_weight ?? 0;
  if (herd.initial_weight > 0 && herd.daily_weight_gain > 0) {
    const created = new Date(herd.created_at);
    const now = new Date();
    projectedWeight = calculateProjectedWeight(
      herd.initial_weight,
      created,
      herd.dwg_change_date ? new Date(herd.dwg_change_date) : now,
      now,
      herd.previous_dwg ?? herd.daily_weight_gain,
      herd.daily_weight_gain
    );
  }

  // Fetch pricing for suggested price pre-fill
  const mlaCategory = resolveMLACategory(herd.category, herd.initial_weight, herd.breeder_sub_type ?? undefined).primaryMLACategory;
  const fallbackCat = categoryFallback(mlaCategory);
  const categoriesToFetch = fallbackCat ? [mlaCategory, fallbackCat] : [mlaCategory];
  const resolvedSaleyard = herd.selected_saleyard
    ? resolveMLASaleyardName(herd.selected_saleyard)
    : null;
  const saleyardsToFetch = resolvedSaleyard
    ? [resolvedSaleyard, "National"]
    : ["National"];

  const { data: allPrices } = await supabase
    .from("category_prices")
    .select("category, price_per_kg:final_price_per_kg, weight_range, saleyard, breed, data_date")
    .in("saleyard", saleyardsToFetch)
    .in("category", categoriesToFetch)
    .order("data_date", { ascending: false })
    .limit(50000);

  const nationalPriceMap = new Map<string, CategoryPriceEntry[]>();
  let saleyardPriceMap: Map<string, CategoryPriceEntry[]> | undefined;
  let saleyardBreedPriceMap: Map<string, CategoryPriceEntry[]> | undefined;
  if (resolvedSaleyard) {
    saleyardPriceMap = new Map();
    saleyardBreedPriceMap = new Map();
  }

  for (const p of allPrices ?? []) {
    const priceEntry = { price_per_kg: p.price_per_kg / 100, weight_range: p.weight_range, data_date: p.data_date };
    if (p.saleyard === "National" && p.breed === null) {
      const entries = nationalPriceMap.get(p.category) ?? [];
      entries.push(priceEntry);
      nationalPriceMap.set(p.category, entries);
    } else if (resolvedSaleyard && p.saleyard === resolvedSaleyard) {
      if (p.breed === null) {
        const key = `${p.category}|${p.saleyard}`;
        const entries = saleyardPriceMap!.get(key) ?? [];
        entries.push(priceEntry);
        saleyardPriceMap!.set(key, entries);
      } else {
        const key = `${p.category}|${p.breed}|${p.saleyard}`;
        const entries = saleyardBreedPriceMap!.get(key) ?? [];
        entries.push(priceEntry);
        saleyardBreedPriceMap!.set(key, entries);
      }
    }
  }

  const premiumMap = new Map<string, number>(Object.entries(cattleBreedPremiums));
  for (const b of breedPremiumData ?? []) {
    premiumMap.set(b.breed, b.premium_percent);
  }

  const valuation = calculateHerdValuation(
    herd as Parameters<typeof calculateHerdValuation>[0],
    nationalPriceMap,
    premiumMap,
    undefined,
    saleyardPriceMap,
    saleyardBreedPriceMap,
  );

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Sell Stock"
        subtitle={`${herd.name} - ${herd.breed} ${herd.category}`}
      />
      <SellStockForm
        herd={{
          id: herd.id,
          name: herd.name,
          breed: herd.breed,
          category: herd.category,
          species: herd.species,
          head_count: herd.head_count,
          current_weight: projectedWeight,
          selected_saleyard: herd.selected_saleyard,
          additional_info: herd.additional_info ?? null,
          age_months: herd.age_months,
        }}
        suggestedPricePerKg={valuation.pricePerKg}
        projectedWeight={projectedWeight}
        priceSource={valuation.priceSource}
      />
    </div>
  );
}
