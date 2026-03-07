import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/data/admin";
import { resolveMLASaleyardName } from "@/lib/data/reference-data";
import type { SaleyardStats } from "@/app/(app)/dashboard/admin/valuation/page";

const PAGE_SIZE = 50000;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Paginate through ALL saleyard pricing data (table can be 300k+ rows)
  const statsMap = new Map<string, {
    entries: number;
    newest: string | null;
    oldest: string | null;
    categories: Set<string>;
    breeds: Set<string>;
    weightRanges: Set<string>;
    hasBreedSpecific: boolean;
  }>();

  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: page, error } = await supabase
      .from("category_prices")
      .select("category, saleyard, breed, weight_range, data_date")
      .neq("saleyard", "National")
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = page ?? [];
    for (const p of rows) {
      let stats = statsMap.get(p.saleyard);
      if (!stats) {
        stats = { entries: 0, newest: null, oldest: null, categories: new Set(), breeds: new Set(), weightRanges: new Set(), hasBreedSpecific: false };
        statsMap.set(p.saleyard, stats);
      }
      stats.entries++;
      if (!stats.newest || p.data_date > stats.newest) stats.newest = p.data_date;
      if (!stats.oldest || p.data_date < stats.oldest) stats.oldest = p.data_date;
      stats.categories.add(p.category);
      if (p.breed) { stats.breeds.add(p.breed); stats.hasBreedSpecific = true; }
      if (p.weight_range) stats.weightRanges.add(p.weight_range);
    }

    hasMore = rows.length === PAGE_SIZE;
    offset += PAGE_SIZE;
  }

  // Count herds per saleyard
  const { data: herds } = await supabase
    .from("herd_groups")
    .select("selected_saleyard")
    .eq("user_id", user.id)
    .eq("is_sold", false)
    .eq("is_deleted", false)
    .not("selected_saleyard", "is", null);

  const herdCounts = new Map<string, number>();
  for (const h of (herds ?? [])) {
    if (h.selected_saleyard) {
      const resolved = resolveMLASaleyardName(h.selected_saleyard);
      herdCounts.set(resolved, (herdCounts.get(resolved) ?? 0) + 1);
    }
  }

  const result: SaleyardStats[] = Array.from(statsMap.entries())
    .map(([name, s]) => ({
      name,
      totalEntries: s.entries,
      newestDataDate: s.newest,
      oldestDataDate: s.oldest,
      categories: Array.from(s.categories).sort(),
      breeds: Array.from(s.breeds).sort(),
      weightRanges: Array.from(s.weightRanges).sort(),
      hasBreedSpecific: s.hasBreedSpecific,
      herdsUsing: herdCounts.get(name) ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json(result);
}
