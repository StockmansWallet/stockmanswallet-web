import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { MLA_CATEGORIES, AU_STATES, daysAgo } from "@/app/(app)/dashboard/market/_constants";
import { AlertsManager } from "./alerts-manager";
import type { AlertRow, SaleyardOption } from "./types";

export const revalidate = 0;
export const metadata = { title: "Price alerts" };

type PriceRow = { saleyard: string | null; state: string | null };

async function loadSaleyards(): Promise<SaleyardOption[]> {
  const supabase = await createClient();
  // Distinct saleyards that have reported in the last 60 days. We exclude
  // the synthetic "National" bucket because users pick categories for that.
  const since = daysAgo(60);
  const { data, error } = await supabase
    .from("category_prices")
    .select("saleyard, state")
    .gte("data_date", since)
    .not("saleyard", "is", null);

  if (error || !data) return [];

  const map = new Map<string, SaleyardOption>();
  for (const row of data as PriceRow[]) {
    const name = row.saleyard?.trim();
    if (!name || name === "National") continue;
    if (!map.has(name)) {
      map.set(name, { name, state: row.state ?? null });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

async function loadAlerts(userId: string): Promise<AlertRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("market_price_alerts")
    .select(
      "id, target_kind, target_name, state, comparator, threshold_cents, is_active, triggered_at, last_observed_price_cents, note, created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as AlertRow[];
}

export default async function PriceAlertsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-4xl">
        <PageHeader
          title="Price alerts"
          subtitle="Get notified when categories or saleyards cross your target price."
        />
        <p className="text-text-muted text-sm">Sign in to manage your alerts.</p>
      </div>
    );
  }

  const [alerts, saleyards] = await Promise.all([loadAlerts(user.id), loadSaleyards()]);

  const categoryOptions = MLA_CATEGORIES.map((c) => ({ value: c, label: c }));
  const stateOptions = [
    { value: "", label: "All of Australia" },
    ...AU_STATES.map((s) => ({ value: s, label: s })),
  ];

  return (
    <div className="max-w-4xl">
      <div className="mb-4 sm:hidden">
        <Link
          href="/dashboard/settings"
          className="bg-surface-lowest text-text-secondary hover:bg-surface-raised hover:text-text-primary inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Settings
        </Link>
      </div>
      <PageHeader
        title="Price alerts"
        titleClassName="text-4xl font-bold text-pink"
        subtitle="Get notified when categories or saleyards cross your target price."
      />

      <AlertsManager
        alerts={alerts}
        categoryOptions={categoryOptions}
        stateOptions={stateOptions}
        saleyards={saleyards}
      />
    </div>
  );
}
