"use client";

import { useMemo } from "react";
import { useDemoMode } from "@/components/app/demo-mode-provider";
import { calculateHerdValuation, type CategoryPriceEntry } from "@/lib/engines/valuation-engine";
import { centsToDollars } from "@/lib/types/money";
import { PortfolioValueCard } from "./portfolio-value-card";
import type { PriceRowFlat } from "@/app/(app)/dashboard/herds/herds-list-view";

type Props = {
  baseValue: number;
  baseFallbackCount: number;
  changeDollar?: number;
  changePercent?: number;
  prices: PriceRowFlat[];
  premiumsByBreed: Record<string, number>;
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

export function PortfolioValueCardWithOverlay({
  baseValue,
  baseFallbackCount,
  changeDollar,
  changePercent,
  prices,
  premiumsByBreed,
}: Props) {
  const { isDemoUser, localHerds } = useDemoMode();

  const { value, fallbackCount } = useMemo(() => {
    if (!isDemoUser || localHerds.length === 0) {
      return { value: baseValue, fallbackCount: baseFallbackCount };
    }
    const { national, saleyard, saleyardBreed } = buildMaps(prices);
    const premiumMap = new Map(Object.entries(premiumsByBreed));
    let addedValue = 0;
    let addedFallback = 0;
    for (const h of localHerds) {
      if (h.is_sold || h.is_deleted) continue;
      const result = calculateHerdValuation(
        h as Parameters<typeof calculateHerdValuation>[0],
        national,
        premiumMap,
        undefined,
        saleyard,
        saleyardBreed
      );
      addedValue += result.netValue;
      if (result.priceSource !== "saleyard") addedFallback += 1;
    }
    return {
      value: baseValue + addedValue,
      fallbackCount: baseFallbackCount + addedFallback,
    };
  }, [isDemoUser, localHerds, baseValue, baseFallbackCount, prices, premiumsByBreed]);

  return (
    <PortfolioValueCard
      value={value}
      changeDollar={changeDollar}
      changePercent={changePercent}
      fallbackCount={fallbackCount}
    />
  );
}
