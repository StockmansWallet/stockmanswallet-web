import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/data/admin";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sy = searchParams.get("saleyard");
  if (!sy) {
    return NextResponse.json({ error: "saleyard parameter required" }, { status: 400 });
  }

  // Use the same RPC as the main valuation page — returns only newest-date rows
  // per saleyard+category, avoiding PostgREST row limits and stale data.
  const allCategories = [
    "Weaner Steer", "Yearling Steer", "Grown Steer",
    "Heifer", "Yearling Heifer", "Grown Heifer",
    "Cows", "Grown Bull",
  ];

  const { data: prices, error } = await supabase.rpc("latest_saleyard_prices", {
    p_saleyards: [sy],
    p_categories: allCategories,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(prices ?? []);
}
