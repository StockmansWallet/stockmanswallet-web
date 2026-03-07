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

  // Fetch prices for this saleyard + National (for fallback)
  const { data: prices, error } = await supabase
    .from("category_prices")
    .select("category, final_price_per_kg, weight_range, saleyard, breed, data_date")
    .in("saleyard", [sy, "National"])
    .order("data_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(prices ?? []);
}
