// Report data service — port of iOS ReportDataGenerator.swift
// Fetches data from Supabase and aggregates for each report type

import { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateHerdValuation,
  categoryFallback,
  type CategoryPriceEntry,
  type HerdValuationResult,
} from "@/lib/engines/valuation-engine";
import { resolveMLACategory } from "@/lib/data/weight-mapping";
import { cattleBreedPremiums, resolveMLASaleyardName, saleyards as allSaleyards } from "@/lib/data/reference-data";
import { expandWithNearbySaleyards } from "@/lib/data/saleyard-proximity";
import type {
  ReportConfiguration,
  ReportData,
  HerdReportData,
  SaleReportData,
  SaleyardComparisonData,
  ExecutiveSummary,
  HerdCompositionItem,
  UserReportDetails,
} from "@/lib/types/reports";

// MARK: - User Details for PDF Header

export async function fetchUserReportDetails(
  supabase: SupabaseClient,
  userId: string
): Promise<UserReportDetails | null> {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, property_name, property_pic, state, region")
    .eq("user_id", userId)
    .single();

  if (!profile) return null;

  const location = [profile.state, profile.region].filter(Boolean).join(", ") || null;

  return {
    preparedFor: profile.display_name ?? "Unknown",
    propertyName: profile.property_name ?? null,
    picCode: profile.property_pic ?? null,
    location,
  };
}

// MARK: - Herd columns needed for valuation (reused across reports)

const HERD_SELECT = `id, name, species, breed, category, head_count,
  initial_weight, current_weight, daily_weight_gain, age_months,
  dwg_change_date, previous_dwg, created_at,
  is_breeder, is_pregnant, joined_date, calving_rate,
  breeding_program_type, joining_period_start, joining_period_end,
  breed_premium_override, mortality_rate, is_sold, selected_saleyard,
  additional_info, calf_weight_recorded_date, updated_at,
  breeder_sub_type, sub_category, property_id`;

// MARK: - Price Row type from RPC

type PriceRow = {
  category: string;
  price_per_kg: number;
  weight_range: string | null;
  saleyard: string;
  breed: string | null;
  data_date: string;
};

// MARK: - Build Price Maps (extracted from dashboard/page.tsx pattern)

export async function buildPriceMaps(
  supabase: SupabaseClient,
  herds: { category: string; initial_weight: number; breeder_sub_type?: string | null; selected_saleyard?: string | null }[]
) {
  const saleyardSet = new Set<string>();
  for (const h of herds) {
    if (h.selected_saleyard) {
      saleyardSet.add(resolveMLASaleyardName(h.selected_saleyard));
    }
  }
  const saleyardList = expandWithNearbySaleyards([...saleyardSet]);

  const primaryCategories = [
    ...new Set(herds.map((h) => resolveMLACategory(h.category, h.initial_weight, h.breeder_sub_type ?? undefined).primaryMLACategory)),
  ];
  const mlaCategories = [
    ...new Set([
      ...primaryCategories,
      ...primaryCategories.map((c) => categoryFallback(c)).filter((c): c is string => c !== null),
    ]),
  ];

  const nationalPriceMap = new Map<string, CategoryPriceEntry[]>();
  const saleyardPriceMap = new Map<string, CategoryPriceEntry[]>();
  const saleyardBreedPriceMap = new Map<string, CategoryPriceEntry[]>();

  if (mlaCategories.length === 0) {
    return { nationalPriceMap, saleyardPriceMap, saleyardBreedPriceMap };
  }

  const { data: rpcPrices } = (await supabase.rpc("latest_saleyard_prices", {
    p_saleyards: saleyardList,
    p_categories: mlaCategories,
  })) as unknown as { data: PriceRow[] | null };

  for (const p of rpcPrices ?? []) {
    const priceEntry: CategoryPriceEntry = {
      price_per_kg: p.price_per_kg / 100,
      weight_range: p.weight_range,
      data_date: p.data_date,
    };
    if (p.saleyard === "National" && p.breed === null) {
      const entries = nationalPriceMap.get(p.category) ?? [];
      entries.push(priceEntry);
      nationalPriceMap.set(p.category, entries);
    } else if (p.saleyard !== "National") {
      if (p.breed === null) {
        const key = `${p.category}|${p.saleyard}`;
        const entries = saleyardPriceMap.get(key) ?? [];
        entries.push(priceEntry);
        saleyardPriceMap.set(key, entries);
      } else {
        const key = `${p.category}|${p.breed}|${p.saleyard}`;
        const entries = saleyardBreedPriceMap.get(key) ?? [];
        entries.push(priceEntry);
        saleyardBreedPriceMap.set(key, entries);
      }
    }
  }

  return { nationalPriceMap, saleyardPriceMap, saleyardBreedPriceMap };
}

// MARK: - Build Breed Premium Map

export async function buildPremiumMap(supabase: SupabaseClient) {
  const premiumMap = new Map<string, number>(Object.entries(cattleBreedPremiums));
  const { data: breedPremiumData } = await supabase
    .from("breed_premiums")
    .select("breed, premium_percent:premium_pct");
  for (const b of breedPremiumData ?? []) {
    premiumMap.set(b.breed, b.premium_percent);
  }
  return premiumMap;
}

// MARK: - Asset Register

export async function generateAssetRegisterData(
  supabase: SupabaseClient,
  userId: string,
  config: ReportConfiguration
): Promise<ReportData> {
  // Fetch herds, properties, premiums, and user details in parallel
  const [{ data: herds }, { data: properties }, premiumMap, userDetails] = await Promise.all([
    supabase
      .from("herds")
      .select(HERD_SELECT)
      .eq("user_id", userId)
      .eq("is_sold", false)
      .eq("is_deleted", false)
      .order("name"),
    supabase
      .from("properties")
      .select("id, property_name, state, acreage, is_default, default_saleyard, region")
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .order("property_name"),
    buildPremiumMap(supabase),
    fetchUserReportDetails(supabase, userId),
  ]);

  const activeHerds = herds ?? [];
  const allProperties = properties ?? [];

  // Filter by property if selected
  let filteredHerds = activeHerds;
  if (config.selectedPropertyIds.length > 0) {
    filteredHerds = activeHerds.filter(
      (h: { property_id: string | null }) => h.property_id && config.selectedPropertyIds.includes(h.property_id)
    );
  }

  // Build price maps
  const { nationalPriceMap, saleyardPriceMap, saleyardBreedPriceMap } = await buildPriceMaps(supabase, filteredHerds);

  // Build property lookup
  const propertyMap = new Map(allProperties.map((p: { id: string; property_name: string }) => [p.id, p.property_name]));

  // Calculate valuations
  const herdDataArray: HerdReportData[] = [];
  const compositionMap = new Map<string, { value: number; headCount: number }>();
  let totalValue = 0;

  for (const herd of filteredHerds) {
    const valuation: HerdValuationResult = calculateHerdValuation(
      herd as Parameters<typeof calculateHerdValuation>[0],
      nationalPriceMap,
      premiumMap,
      undefined,
      saleyardPriceMap,
      saleyardBreedPriceMap
    );

    const currentPrice = valuation.pricePerKg;
    const propertyName = herd.property_id ? (propertyMap.get(herd.property_id) ?? null) : null;

    herdDataArray.push({
      id: herd.id,
      name: herd.name,
      category: `${herd.breed} ${herd.category}`,
      headCount: herd.head_count,
      ageMonths: herd.age_months ?? 0,
      weight: valuation.projectedWeight,
      pricePerKg: currentPrice,
      minPrice: currentPrice * 0.9,
      maxPrice: currentPrice * 1.1,
      avgPrice: currentPrice,
      netValue: valuation.netValue,
      breedingAccrual: valuation.breedingAccrual > 0 ? valuation.breedingAccrual : null,
      dailyWeightGain: herd.daily_weight_gain ?? 0,
      mortalityRate: herd.mortality_rate ?? 0.05,
      calvingRate: herd.calving_rate ?? 0,
      isBreeder: herd.is_breeder ?? false,
      propertyId: herd.property_id ?? null,
      propertyName,
      breedPremiumOverride: herd.breed_premium_override ?? null,
      breedPremiumApplied: valuation.breedPremiumApplied ?? 0,
      priceSource: valuation.priceSource,
      dataDate: valuation.dataDate,
    });

    totalValue += valuation.netValue;

    // Build composition by asset class
    const assetClass = herd.category;
    const existing = compositionMap.get(assetClass) ?? { value: 0, headCount: 0 };
    existing.value += valuation.netValue;
    existing.headCount += herd.head_count;
    compositionMap.set(assetClass, existing);
  }

  // Sort by property name, then herd name
  herdDataArray.sort((a, b) => {
    const aProp = a.propertyName ?? "";
    const bProp = b.propertyName ?? "";
    if (aProp !== bProp) return aProp.localeCompare(bProp);
    return a.name.localeCompare(b.name);
  });

  // Build herd composition items
  const herdComposition: HerdCompositionItem[] = [...compositionMap.entries()]
    .map(([assetClass, { value, headCount }]) => ({
      assetClass,
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
      headCount,
    }))
    .sort((a, b) => b.value - a.value);

  // Executive summary
  const totalHeadCount = herdDataArray.reduce((sum, h) => sum + h.headCount, 0);
  const executiveSummary: ExecutiveSummary = {
    totalPortfolioValue: totalValue,
    totalHeadCount,
    averageValuePerHead: totalHeadCount > 0 ? totalValue / totalHeadCount : 0,
    valuationDate: new Date().toISOString(),
  };

  // Farm name from default property
  const defaultProp = allProperties.find((p: { is_default: boolean }) => p.is_default) ?? allProperties[0];
  const farmName = defaultProp?.property_name ?? null;

  return {
    farmName,
    totalValue,
    totalSales: 0,
    herdData: herdDataArray,
    salesData: [],
    saleyardComparison: [],
    executiveSummary,
    herdComposition,
    userDetails,
    generatedAt: new Date().toISOString(),
    dateRange: { start: config.startDate, end: config.endDate },
  };
}

// MARK: - Sales Summary

export async function generateSalesSummaryData(
  supabase: SupabaseClient,
  userId: string,
  config: ReportConfiguration
): Promise<ReportData> {
  // Fetch sales, herd names, properties, and user details in parallel
  const [{ data: sales }, { data: herds }, { data: properties }, userDetails] = await Promise.all([
    supabase
      .from("sales_records")
      .select("id, herd_id, sale_date, head_count, average_weight, price_per_kg, price_per_head, pricing_type, sale_type, sale_location, total_gross_value, freight_cost, net_value")
      .eq("user_id", userId)
      .gte("sale_date", config.startDate)
      .lte("sale_date", config.endDate)
      .order("sale_date", { ascending: false }),
    supabase
      .from("herds")
      .select("id, name")
      .eq("user_id", userId),
    supabase
      .from("properties")
      .select("id, property_name, is_default")
      .eq("user_id", userId)
      .eq("is_deleted", false),
    fetchUserReportDetails(supabase, userId),
  ]);

  const herdNameMap = new Map((herds ?? []).map((h: { id: string; name: string }) => [h.id, h.name]));
  const allSales = sales ?? [];

  let totalSales = 0;
  let totalGross = 0;
  let totalFreight = 0;

  const salesData: SaleReportData[] = allSales.map((sale: {
    id: string; sale_date: string; head_count: number; average_weight: number;
    price_per_kg: number; price_per_head: number | null; pricing_type: string;
    sale_type: string | null; sale_location: string | null;
    total_gross_value: number; freight_cost: number; net_value: number; herd_id: string;
  }) => {
    totalSales += sale.net_value;
    totalGross += sale.total_gross_value;
    totalFreight += sale.freight_cost;

    return {
      id: sale.id,
      date: sale.sale_date,
      headCount: sale.head_count,
      avgWeight: sale.average_weight,
      pricePerKg: sale.price_per_kg,
      pricePerHead: sale.price_per_head,
      pricingType: sale.pricing_type,
      saleType: sale.sale_type,
      saleLocation: sale.sale_location,
      netValue: sale.net_value,
      grossValue: sale.total_gross_value,
      freightCost: sale.freight_cost,
      herdName: herdNameMap.get(sale.herd_id) ?? undefined,
    };
  });

  const defaultProp = (properties ?? []).find((p: { is_default: boolean }) => p.is_default) ?? (properties ?? [])[0];

  return {
    farmName: defaultProp?.property_name ?? null,
    totalValue: 0,
    totalSales,
    herdData: [],
    salesData,
    saleyardComparison: [],
    executiveSummary: null,
    herdComposition: [],
    userDetails,
    generatedAt: new Date().toISOString(),
    dateRange: { start: config.startDate, end: config.endDate },
  };
}

// MARK: - Saleyard Comparison

export async function generateSaleyardComparisonData(
  supabase: SupabaseClient,
  userId: string,
  config: ReportConfiguration
): Promise<ReportData> {
  // Fetch herds, properties, and user details
  const [{ data: herds }, { data: properties }, userDetails] = await Promise.all([
    supabase
      .from("herds")
      .select(HERD_SELECT)
      .eq("user_id", userId)
      .eq("is_sold", false)
      .eq("is_deleted", false)
      .order("name"),
    supabase
      .from("properties")
      .select("id, property_name, is_default, default_saleyard")
      .eq("user_id", userId)
      .eq("is_deleted", false),
    fetchUserReportDetails(supabase, userId),
  ]);

  let filteredHerds = (herds ?? []) as { category: string; initial_weight: number; breeder_sub_type?: string | null; head_count: number; property_id?: string | null }[];
  if (config.selectedPropertyIds.length > 0) {
    filteredHerds = filteredHerds.filter((h) => h.property_id && config.selectedPropertyIds.includes(h.property_id));
  }

  // Resolve MLA categories from user's herds
  const herdCategories = [
    ...new Set(filteredHerds.map((h) => resolveMLACategory(h.category, h.initial_weight, h.breeder_sub_type ?? undefined).primaryMLACategory)),
  ];

  const totalHerdHead = filteredHerds.reduce((sum, h) => sum + h.head_count, 0);

  // Fetch prices for all saleyards (pass empty saleyard list to get all)
  const mlaCategories = [
    ...new Set([
      ...herdCategories,
      ...herdCategories.map((c) => categoryFallback(c)).filter((c): c is string => c !== null),
    ]),
  ];

  let allPrices: PriceRow[] = [];
  if (mlaCategories.length > 0) {
    const { data } = (await supabase.rpc("latest_saleyard_prices", {
      p_saleyards: allSaleyards.slice(0, 50), // Fetch for all known saleyards
      p_categories: mlaCategories,
    })) as unknown as { data: PriceRow[] | null };
    allPrices = data ?? [];
  }

  // Group by saleyard, keep only latest date per saleyard
  const rawBySaleyard = new Map<string, PriceRow[]>();
  for (const price of allPrices) {
    if (price.price_per_kg <= 0) continue;
    const normalized = resolveMLASaleyardName(price.saleyard);
    if (normalized === "National") continue;
    const existing = rawBySaleyard.get(normalized) ?? [];
    existing.push(price);
    rawBySaleyard.set(normalized, existing);
  }

  const comparisonData: SaleyardComparisonData[] = [];

  for (const [saleyard, prices] of rawBySaleyard) {
    // Only keep latest date
    const latestDate = prices
      .map((p) => p.data_date)
      .filter((d): d is string => Boolean(d))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

    const latestPrices = latestDate
      ? prices.filter((p) => p.data_date === latestDate).map((p) => p.price_per_kg / 100)
      : prices.map((p) => p.price_per_kg / 100);

    if (latestPrices.length === 0) continue;

    const avgPrice = latestPrices.reduce((a, b) => a + b, 0) / latestPrices.length;
    const minPrice = Math.min(...latestPrices);
    const maxPrice = Math.max(...latestPrices);

    comparisonData.push({
      saleyardName: saleyard,
      avgPrice,
      minPrice,
      maxPrice,
      totalHeadCount: totalHerdHead,
    });
  }

  // Sort by best price first
  comparisonData.sort((a, b) => b.avgPrice - a.avgPrice);

  const defaultProp = (properties ?? []).find((p: { is_default: boolean }) => p.is_default) ?? (properties ?? [])[0];

  return {
    farmName: defaultProp?.property_name ?? null,
    totalValue: 0,
    totalSales: 0,
    herdData: [],
    salesData: [],
    saleyardComparison: comparisonData,
    executiveSummary: null,
    herdComposition: [],
    userDetails,
    generatedAt: new Date().toISOString(),
    dateRange: { start: config.startDate, end: config.endDate },
  };
}

// MARK: - Accountant Report (financial year reconciliation statement)

export async function generateAccountantData(
  supabase: SupabaseClient,
  userId: string,
  config: ReportConfiguration,
  openingBookValue: number = 0,
  financialYearLabel: string = "",
  financialYearShortTitle: string = ""
): Promise<ReportData> {
  const [assetData, salesData] = await Promise.all([
    generateAssetRegisterData(supabase, userId, config),
    generateSalesSummaryData(supabase, userId, config),
  ]);

  // Accountant reconciliation calculations (matching iOS)
  const purchasesRecorded = 0; // $0 until purchase price field is added
  const salesRecorded = salesData.totalSales;
  const modelledClosingBookPosition = openingBookValue + purchasesRecorded - salesRecorded;
  const marketValuationAtYearEnd = assetData.totalValue;
  const marketMinusBookDifference = marketValuationAtYearEnd - modelledClosingBookPosition;

  return {
    farmName: assetData.farmName,
    totalValue: assetData.totalValue,
    totalSales: salesData.totalSales,
    herdData: assetData.herdData,
    salesData: salesData.salesData,
    saleyardComparison: [],
    executiveSummary: assetData.executiveSummary,
    herdComposition: assetData.herdComposition,
    userDetails: assetData.userDetails,
    generatedAt: new Date().toISOString(),
    dateRange: { start: config.startDate, end: config.endDate },
    accountantSnapshot: {
      financialYearLabel,
      financialYearShortTitle,
      periodStart: config.startDate,
      periodEnd: config.endDate,
      openingBookValue,
      purchasesRecorded,
      salesRecorded,
      modelledClosingBookPosition,
      marketValuationAtYearEnd,
      marketMinusBookDifference,
      generatedAt: new Date().toISOString(),
    },
  };
}
