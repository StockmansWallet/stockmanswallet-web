import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A single row from the latest_saleyard_prices RPC. price_per_kg is
 * stored in CENTS (divide by 100 at render time to match the rest of
 * the app; see CLAUDE.md).
 */
export interface PriceRow {
  category: string;
  price_per_kg: number;
  weight_range: string | null;
  saleyard: string;
  breed: string | null;
  data_date: string;
}

/**
 * Typed wrapper around the latest_saleyard_prices RPC. Removes the
 * ten-ish duplicated `as unknown as { data: PriceRow[] | null }` casts
 * across the codebase. The underlying RPC doesn't ship a generated
 * return type, hence the single cast here.
 */
export async function fetchLatestSaleyardPrices(
  supabase: SupabaseClient,
  saleyards: string[],
  categories: string[],
): Promise<PriceRow[]> {
  const { data } = (await supabase.rpc("latest_saleyard_prices", {
    p_saleyards: saleyards,
    p_categories: categories,
  })) as unknown as { data: PriceRow[] | null };
  return data ?? [];
}
