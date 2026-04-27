"use client";
import { useMemo } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { Tags, Layers, DollarSign, Scale } from "lucide-react";
import { HerdsTable } from "./herds-table";
import { useDemoMode } from "@/components/app/demo-mode-provider";
import { calculateHerdValuation, type CategoryPriceEntry } from "@/lib/engines/valuation-engine";
import { centsToDollars } from "@/lib/types/money";

// Flat rows so the server page can pass pricing data across the RSC boundary.
export type PriceRowFlat = {
  category: string;
  saleyard: string;
  breed: string | null;
  price_per_kg: number;
  weight_range: string | null;
  data_date: string;
};

type HerdRow = Record<string, unknown> & {
  id: string;
  head_count: number;
  current_weight: number;
  category: string;
  breed: string;
  initial_weight: number;
  selected_saleyard: string | null;
  property_id: string | null;
  breeder_sub_type?: string | null;
  breed_premium_override: number | null;
};

type PropertyGroup = { id: string; name: string; isDefault: boolean };

type Props = {
  herds: HerdRow[];
  herdValues: Record<string, number>;
  herdSources: Record<string, string>;
  herdPricePerKg: Record<string, number>;
  herdBreedingAccrual: Record<string, number>;
  herdDataDates: Record<string, string | null>;
  herdNearestSaleyard: Record<string, string | null>;
  herdProjectedWeight: Record<string, number>;
  herdDefaultBreedPremium: Record<string, number>;
  herdCustomBreedPremium: Record<string, number>;
  propertyGroups: PropertyGroup[];
  prices: PriceRowFlat[];
  premiumsByBreed: Record<string, number>;
  emptyState?: React.ReactNode;
};

function buildMaps(prices: PriceRowFlat[]) {
  const national = new Map<string, CategoryPriceEntry[]>();
  const saleyard = new Map<string, CategoryPriceEntry[]>();
  const saleyardBreed = new Map<string, CategoryPriceEntry[]>();
  for (const p of prices) {
    const entry: CategoryPriceEntry = {
      // Raw rows from the RPC are in cents/kg; the engine works in dollars/kg.
      price_per_kg: centsToDollars(p.price_per_kg),
      weight_range: p.weight_range,
      data_date: p.data_date,
    };
    if (p.saleyard === "National" && p.breed === null) {
      const arr = national.get(p.category) ?? [];
      arr.push(entry);
      national.set(p.category, arr);
    } else if (p.saleyard !== "National") {
      if (p.breed === null) {
        const key = `${p.category}|${p.saleyard}`;
        const arr = saleyard.get(key) ?? [];
        arr.push(entry);
        saleyard.set(key, arr);
      } else {
        const key = `${p.category}|${p.breed}|${p.saleyard}`;
        const arr = saleyardBreed.get(key) ?? [];
        arr.push(entry);
        saleyardBreed.set(key, arr);
      }
    }
  }
  return { national, saleyard, saleyardBreed };
}

export function HerdsListView(props: Props) {
  const { localHerds, isDemoUser } = useDemoMode();

  const merged = useMemo(() => {
    if (!isDemoUser || localHerds.length === 0) {
      return {
        herds: props.herds,
        herdValues: props.herdValues,
        herdSources: props.herdSources,
        herdPricePerKg: props.herdPricePerKg,
        herdBreedingAccrual: props.herdBreedingAccrual,
        herdDataDates: props.herdDataDates,
        herdNearestSaleyard: props.herdNearestSaleyard,
        herdProjectedWeight: props.herdProjectedWeight,
        herdDefaultBreedPremium: props.herdDefaultBreedPremium,
        herdCustomBreedPremium: props.herdCustomBreedPremium,
      };
    }

    const { national, saleyard, saleyardBreed } = buildMaps(props.prices);
    const premiumMap = new Map(Object.entries(props.premiumsByBreed));

    const herdValues = { ...props.herdValues };
    const herdSources = { ...props.herdSources };
    const herdPricePerKg = { ...props.herdPricePerKg };
    const herdBreedingAccrual = { ...props.herdBreedingAccrual };
    const herdDataDates = { ...props.herdDataDates };
    const herdNearestSaleyard = { ...props.herdNearestSaleyard };
    const herdProjectedWeight = { ...props.herdProjectedWeight };
    const herdDefaultBreedPremium = { ...props.herdDefaultBreedPremium };
    const herdCustomBreedPremium = { ...props.herdCustomBreedPremium };

    const propertyNameById = new Map(props.propertyGroups.map((p) => [p.id, p.name]));

    const localMapped = localHerds
      .filter((h) => !h.is_sold && !h.is_deleted)
      .map((h) => {
        const propertyName = h.property_id ? (propertyNameById.get(h.property_id) ?? null) : null;
        const result = calculateHerdValuation(
          h as Parameters<typeof calculateHerdValuation>[0],
          national,
          premiumMap,
          undefined,
          saleyard,
          saleyardBreed
        );
        herdValues[h.id] = result.netValue;
        herdSources[h.id] = result.priceSource;
        herdPricePerKg[h.id] = result.pricePerKg;
        herdBreedingAccrual[h.id] = result.breedingAccrual;
        herdDataDates[h.id] = result.dataDate;
        herdNearestSaleyard[h.id] = result.nearestSaleyardUsed;
        herdProjectedWeight[h.id] = result.projectedWeight;
        const defaultPremium = premiumMap.get(h.breed) ?? 0;
        herdDefaultBreedPremium[h.id] = defaultPremium;
        if (h.breed_premium_override != null && h.breed_premium_override !== 0) {
          herdCustomBreedPremium[h.id] = h.breed_premium_override - defaultPremium;
        }
        return {
          ...h,
          properties: propertyName ? { property_name: propertyName } : null,
        } as unknown as HerdRow;
      });

    return {
      herds: [...localMapped, ...props.herds],
      herdValues,
      herdSources,
      herdPricePerKg,
      herdBreedingAccrual,
      herdDataDates,
      herdNearestSaleyard,
      herdProjectedWeight,
      herdDefaultBreedPremium,
      herdCustomBreedPremium,
    };
  }, [
    isDemoUser,
    localHerds,
    props.herds,
    props.prices,
    props.premiumsByBreed,
    props.propertyGroups,
    props.herdValues,
    props.herdSources,
    props.herdPricePerKg,
    props.herdBreedingAccrual,
    props.herdDataDates,
    props.herdNearestSaleyard,
    props.herdProjectedWeight,
    props.herdDefaultBreedPremium,
    props.herdCustomBreedPremium,
  ]);

  const totalValue = useMemo(
    () => Object.values(merged.herdValues).reduce((s, v) => s + (v ?? 0), 0),
    [merged.herdValues]
  );
  const totalHead = useMemo(
    () => merged.herds.reduce((s, h) => s + ((h.head_count as number) ?? 0), 0),
    [merged.herds]
  );
  const avgWeight = useMemo(() => {
    const withWeight = merged.herds.filter((h) => (h.current_weight as number) > 0);
    if (withWeight.length === 0) return 0;
    return Math.round(
      withWeight.reduce((s, h) => s + ((h.current_weight as number) ?? 0), 0) / withWeight.length
    );
  }, [merged.herds]);

  if (merged.herds.length === 0) {
    return <>{props.emptyState ?? null}</>;
  }

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Total Value"
          value={`$${Math.round(totalValue).toLocaleString()}`}
        />
        <StatCard
          icon={<Tags className="h-4 w-4" />}
          label="Total Head"
          value={totalHead.toLocaleString()}
        />
        <StatCard
          icon={<Layers className="h-4 w-4" />}
          label="Herds"
          value={String(merged.herds.length)}
        />
        <StatCard
          icon={<Scale className="h-4 w-4" />}
          label="Avg Weight"
          value={avgWeight > 0 ? `${avgWeight} kg` : "\u2014"}
        />
      </div>

      <HerdsTable
        herds={merged.herds as unknown as Parameters<typeof HerdsTable>[0]["herds"]}
        herdValues={merged.herdValues}
        herdSources={merged.herdSources}
        herdPricePerKg={merged.herdPricePerKg}
        herdBreedingAccrual={merged.herdBreedingAccrual}
        herdDataDates={merged.herdDataDates}
        herdNearestSaleyard={merged.herdNearestSaleyard}
        herdProjectedWeight={merged.herdProjectedWeight}
        herdDefaultBreedPremium={merged.herdDefaultBreedPremium}
        herdCustomBreedPremium={merged.herdCustomBreedPremium}
        propertyGroups={props.propertyGroups}
      />
    </>
  );
}
