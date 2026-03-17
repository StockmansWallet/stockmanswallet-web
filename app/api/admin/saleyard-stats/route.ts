import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/data/admin";
import { resolveMLASaleyardName } from "@/lib/data/reference-data";
import type { SaleyardStats } from "@/app/(app)/dashboard/admin/valuation/page";

interface AggRow {
  saleyard: string;
  entry_count: number;
  newest_date: string | null;
  oldest_date: string | null;
  categories: string[];
  breeds: string[];
  weight_ranges: string[];
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Aggregate in SQL to avoid downloading 344k+ rows
  const { searchParams } = new URL(request.url);
  const sinceDate = searchParams.get("since");

  const { data: rows, error } = await supabase.rpc("saleyard_stats", {
    since_date: sinceDate || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count herds per saleyard
  const { data: herds } = await supabase
    .from("herds")
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

  const result: SaleyardStats[] = (rows as AggRow[])
    .map((r) => ({
      name: r.saleyard,
      totalEntries: r.entry_count,
      newestDataDate: r.newest_date,
      oldestDataDate: r.oldest_date,
      categories: (r.categories ?? []).sort(),
      breeds: (r.breeds ?? []).filter((b: string) => b !== null).sort(),
      weightRanges: (r.weight_ranges ?? []).sort(),
      hasBreedSpecific: (r.breeds ?? []).filter((b: string) => b !== null).length > 0,
      herdsUsing: herdCounts.get(r.saleyard) ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json(result);
}
