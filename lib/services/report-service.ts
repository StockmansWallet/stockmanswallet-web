// Report data service — port of iOS ReportDataGenerator.swift
// Fetches data from Supabase and aggregates for each report type

import { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateHerdValuation,
  calculateHerdValue,
  categoryFallback,
  type CategoryPriceEntry,
  type HerdForValuation,
  type HerdValuationResult,
} from "@/lib/engines/valuation-engine";
import { resolveMLACategory } from "@/lib/data/weight-mapping";
import { cattleBreedPremiums, resolveMLASaleyardName, saleyards as allSaleyards, saleyardToState } from "@/lib/data/reference-data";
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
  ReportPropertyDetails,
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
  breed_premium_override, breed_premium_justification, mortality_rate, is_sold, selected_saleyard,
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
      .select("id, property_name, property_pic, state, acreage, is_default, default_saleyard, region, livestock_owner")
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

  // Build property lookup (name + livestock owner)
  const propertyMap = new Map(allProperties.map((p: { id: string; property_name: string; livestock_owner: string | null }) => [p.id, { name: p.property_name, owner: p.livestock_owner }]));

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
    const propertyInfo = herd.property_id ? (propertyMap.get(herd.property_id) ?? null) : null;
    const propertyName = propertyInfo?.name ?? null;
    const livestockOwner = propertyInfo?.owner ?? null;

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
      livestockOwner,
      baseBreedPremium: premiumMap.get(herd.breed) ?? 0,
      breedPremiumOverride: herd.breed_premium_override ?? null,
      breedPremiumApplied: valuation.breedPremiumApplied ?? 0,
      breedPremiumJustification: herd.breed_premium_justification ?? null,
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

  // Build property details (only properties with herds in the report)
  const activePropertyIds = new Set(herdDataArray.map((h) => h.propertyId).filter(Boolean));
  const reportProperties: ReportPropertyDetails[] = allProperties
    .filter((p: { id: string }) => activePropertyIds.has(p.id))
    .map((p: { property_name: string; livestock_owner: string | null; property_pic: string | null; state: string | null }) => ({
      name: p.property_name,
      livestockOwner: p.livestock_owner ?? null,
      picCode: p.property_pic ?? null,
      state: p.state ?? null,
    }));

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
    properties: reportProperties,
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
      .eq("user_id", userId)
      .eq("is_deleted", false),
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
    properties: [],
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
  // Fetch herds (full data for valuation), properties, user details, and breed premiums
  const [{ data: herds }, { data: properties }, userDetails, premiumMap] = await Promise.all([
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
    buildPremiumMap(supabase),
  ]);

  type HerdRow = HerdForValuation & {
    id: string;
    name: string;
    property_id: string | null;
    sub_category: string | null;
  };
  let filteredHerds: HerdRow[] = (herds ?? []) as HerdRow[];
  if (config.selectedPropertyIds.length > 0) {
    filteredHerds = filteredHerds.filter((h) => h.property_id && config.selectedPropertyIds.includes(h.property_id));
  }

  // Resolve MLA categories from user's herds
  const herdCategories = [
    ...new Set(filteredHerds.map((h) =>
      resolveMLACategory(h.category, h.initial_weight, h.breeder_sub_type ?? undefined).primaryMLACategory)),
  ];

  const totalHerdHead = filteredHerds.reduce((sum, h) => sum + h.head_count, 0);

  const mlaCategories = [
    ...new Set([
      ...herdCategories,
      ...herdCategories.map((c) => categoryFallback(c)).filter((c): c is string => c !== null),
    ]),
  ];

  // Fetch ALL prices for all known saleyards + National (for fallback valuation)
  let allPrices: PriceRow[] = [];
  if (mlaCategories.length > 0) {
    const saleyardsWithNational = [...allSaleyards.slice(0, 50), "National"];
    const { data } = (await supabase.rpc("latest_saleyard_prices", {
      p_saleyards: saleyardsWithNational,
      p_categories: mlaCategories,
    })) as unknown as { data: PriceRow[] | null };
    allPrices = data ?? [];
  }

  // Build national price map (for valuation fallback)
  const nationalPriceMap = new Map<string, CategoryPriceEntry[]>();
  for (const p of allPrices) {
    if (p.saleyard === "National" && p.breed === null && p.price_per_kg > 0) {
      const entries = nationalPriceMap.get(p.category) ?? [];
      entries.push({ price_per_kg: p.price_per_kg / 100, weight_range: p.weight_range, data_date: p.data_date });
      nationalPriceMap.set(p.category, entries);
    }
  }

  // Group non-national prices by saleyard, keep only latest date per saleyard
  const rawBySaleyard = new Map<string, PriceRow[]>();
  for (const price of allPrices) {
    if (price.price_per_kg <= 0) continue;
    const normalized = resolveMLASaleyardName(price.saleyard);
    if (normalized === "National") continue;
    const existing = rawBySaleyard.get(normalized) ?? [];
    existing.push(price);
    rawBySaleyard.set(normalized, existing);
  }

  // Cast herds to HerdForValuation for the valuation engine
  const herdsForValuation: HerdForValuation[] = filteredHerds.map((h) => ({
    head_count: h.head_count ?? 0,
    initial_weight: h.initial_weight ?? 0,
    current_weight: h.current_weight ?? 0,
    daily_weight_gain: h.daily_weight_gain ?? 0,
    dwg_change_date: h.dwg_change_date ?? null,
    previous_dwg: h.previous_dwg ?? null,
    created_at: h.created_at ?? new Date().toISOString(),
    species: h.species ?? "Cattle",
    category: h.category ?? "",
    breed: h.breed ?? "",
    breed_premium_override: h.breed_premium_override ?? null,
    mortality_rate: h.mortality_rate ?? null,
    is_breeder: h.is_breeder ?? false,
    is_pregnant: h.is_pregnant ?? false,
    joined_date: h.joined_date ?? null,
    calving_rate: h.calving_rate ?? 0,
    breeding_program_type: h.breeding_program_type ?? null,
    joining_period_start: h.joining_period_start ?? null,
    joining_period_end: h.joining_period_end ?? null,
    selected_saleyard: h.selected_saleyard ?? null,
    additional_info: h.additional_info ?? null,
    calf_weight_recorded_date: h.calf_weight_recorded_date ?? null,
    updated_at: h.updated_at ?? new Date().toISOString(),
    breeder_sub_type: h.breeder_sub_type ?? null,
  }));

  // For each saleyard, calculate portfolio value using that saleyard's prices
  const comparisonData: SaleyardComparisonData[] = [];
  const now = new Date();

  for (const [saleyard, prices] of rawBySaleyard) {
    // Filter to latest date only
    const latestDate = prices
      .map((p) => p.data_date)
      .filter((d): d is string => Boolean(d))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

    const latestPrices = latestDate
      ? prices.filter((p) => p.data_date === latestDate)
      : prices;

    if (latestPrices.length === 0) continue;

    // Build saleyard-specific price map for valuation engine
    const syPriceMap = new Map<string, CategoryPriceEntry[]>();
    const syBreedPriceMap = new Map<string, CategoryPriceEntry[]>();
    const priceValues: number[] = [];

    for (const p of latestPrices) {
      const pricePerKg = p.price_per_kg / 100;
      if (pricePerKg <= 0) continue;
      priceValues.push(pricePerKg);

      const entry: CategoryPriceEntry = { price_per_kg: pricePerKg, weight_range: p.weight_range, data_date: p.data_date };
      if (p.breed === null) {
        const key = `${p.category}|${saleyard}`;
        const entries = syPriceMap.get(key) ?? [];
        entries.push(entry);
        syPriceMap.set(key, entries);
      } else {
        const key = `${p.category}|${p.breed}|${saleyard}`;
        const entries = syBreedPriceMap.get(key) ?? [];
        entries.push(entry);
        syBreedPriceMap.set(key, entries);
      }
    }

    if (priceValues.length === 0) continue;

    // Calculate portfolio value at this saleyard
    let portfolioValue = 0;
    for (const herd of herdsForValuation) {
      // Override the herd's saleyard to force valuation against this saleyard
      const herdWithSaleyard = { ...herd, selected_saleyard: saleyard };
      portfolioValue += calculateHerdValue(herdWithSaleyard, nationalPriceMap, premiumMap, now, syPriceMap, syBreedPriceMap);
    }

    const avgPrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);

    comparisonData.push({
      saleyardName: saleyard,
      avgPrice,
      minPrice,
      maxPrice,
      totalHeadCount: totalHerdHead,
      totalPortfolioValue: portfolioValue,
      avgPerHead: totalHerdHead > 0 ? portfolioValue / totalHerdHead : 0,
      spread: maxPrice - minPrice,
      rank: 0, // assigned after sorting
      diffToBestDollars: 0, // assigned after sorting
      diffToBestPercent: 0, // assigned after sorting
      state: saleyardToState[saleyard] ?? null,
    });
  }

  // Sort by portfolio value descending (best first)
  comparisonData.sort((a, b) => b.totalPortfolioValue - a.totalPortfolioValue);

  // Assign ranks and diff-to-best
  const bestValue = comparisonData.length > 0 ? comparisonData[0].totalPortfolioValue : 0;
  for (let i = 0; i < comparisonData.length; i++) {
    comparisonData[i].rank = i + 1;
    comparisonData[i].diffToBestDollars = bestValue - comparisonData[i].totalPortfolioValue;
    comparisonData[i].diffToBestPercent = bestValue > 0
      ? ((bestValue - comparisonData[i].totalPortfolioValue) / bestValue) * 100
      : 0;
  }

  const defaultProp = (properties ?? []).find((p: { is_default: boolean }) => p.is_default) ?? (properties ?? [])[0];

  return {
    farmName: defaultProp?.property_name ?? null,
    totalValue: bestValue,
    totalSales: 0,
    herdData: [],
    salesData: [],
    saleyardComparison: comparisonData,
    executiveSummary: null,
    herdComposition: [],
    userDetails,
    properties: [],
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
    properties: assetData.properties,
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
