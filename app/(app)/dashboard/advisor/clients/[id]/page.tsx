import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { ClientOverview } from "@/components/app/advisory/client-overview";
import { AdvisorNotes } from "./advisor-notes";
import { EmptyState } from "@/components/ui/empty-state";
import { AdvisorLensPanel } from "@/components/app/advisory/advisor-lens-panel";
import { Lock } from "lucide-react";
import { RemoveClientButton } from "./remove-client-button";
import type { ConnectionRequest, AdvisoryMessage } from "@/lib/types/advisory";
import { parseSharingPermissions } from "@/lib/types/advisory";
import type { AdvisorLens, AdvisorScenario } from "@/lib/types/advisor-lens";
import { calculateHerdValuation, categoryFallback, type CategoryPriceEntry } from "@/lib/engines/valuation-engine";
import { resolveMLACategory } from "@/lib/data/weight-mapping";
import { cattleBreedPremiums, resolveMLASaleyardName } from "@/lib/data/reference-data";
import { expandWithNearbySaleyards } from "@/lib/data/saleyard-proximity";
import { generateAccountantData } from "@/lib/services/report-service";
import { ClientReportTab } from "@/components/app/advisory/client-report-tab";

export const metadata = {
  title: "Client Detail",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Fetch the connection by ID
  const { data: connection } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!connection) notFound();

  // Verify the current user is the advisor on this connection
  if (connection.requester_user_id !== user.id) {
    notFound();
  }

  // Mark any unread notifications for this connection as read
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("related_connection_id", id)
    .eq("is_read", false);

  const conn = connection as ConnectionRequest;
  const permissions = parseSharingPermissions(conn.sharing_permissions);

  // Get client display name
  const { data: clientProfile } = await supabase
    .from("user_profiles")
    .select("display_name, company_name")
    .eq("user_id", conn.target_user_id)
    .single();

  const clientName = clientProfile?.display_name ?? "Unknown Producer";

  // Fetch messages for Notes tab
  const { data: messages } = await supabase
    .from("advisory_messages")
    .select("*")
    .eq("connection_id", id)
    .order("created_at", { ascending: true });

  // Service client to read client's data (bypasses RLS)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serviceClient = serviceRoleKey
    ? createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
    : null;

  // Fetch lens, scenarios, and client herds for Advisor Lens tab
  const [{ data: lensData }, { data: scenariosData }, { data: clientHerds }, { data: breedPremiumData }] = await Promise.all([
    supabase
      .from("advisor_lenses")
      .select("*")
      .eq("client_connection_id", id)
      .eq("is_deleted", false)
      .maybeSingle(),
    supabase
      .from("advisor_scenarios")
      .select("*")
      .eq("client_connection_id", id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false }),
    serviceClient
      ? serviceClient
          .from("herds")
          .select("*")
          .eq("user_id", conn.target_user_id)
          .eq("is_sold", false)
          .eq("is_deleted", false)
          .neq("is_demo_data", true)
      : Promise.resolve({ data: [] as unknown[] }),
    supabase
      .from("breed_premiums")
      .select("breed, premium_percent:premium_pct"),
  ]);

  // Calculate baseline portfolio value only if valuations are shared
  const herds = clientHerds ?? [];
  let baselineValue = 0;

  if (permissions.valuations && herds.length > 0) {
    const herdSaleyards = [...new Set(herds.map((h) => h.selected_saleyard ? resolveMLASaleyardName(h.selected_saleyard) : null).filter(Boolean))] as string[];
    const saleyards = expandWithNearbySaleyards(herdSaleyards);
    const primaryCategories = [...new Set(herds.map((h) => resolveMLACategory(h.category, h.initial_weight, h.breeder_sub_type ?? undefined).primaryMLACategory))];
    const mlaCategories = [...new Set([...primaryCategories, ...primaryCategories.map((c) => categoryFallback(c)).filter((c): c is string => c !== null)])];

    type PriceRow = { category: string; price_per_kg: number; weight_range: string | null; saleyard: string; breed: string | null; data_date: string };
    const emptyPrices: PriceRow[] = [];

    const { data: rpcPrices } = mlaCategories.length > 0
      ? await supabase.rpc("latest_saleyard_prices", {
          p_saleyards: saleyards,
          p_categories: mlaCategories,
        }) as unknown as { data: PriceRow[] | null }
      : { data: emptyPrices };

    const allPrices = rpcPrices ?? [];
    const nationalPriceMap = new Map<string, CategoryPriceEntry[]>();
    const saleyardPriceMap = new Map<string, CategoryPriceEntry[]>();
    const saleyardBreedPriceMap = new Map<string, CategoryPriceEntry[]>();
    for (const p of allPrices) {
      const priceEntry = { price_per_kg: p.price_per_kg / 100, weight_range: p.weight_range, data_date: p.data_date };
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
    const premiumMap = new Map<string, number>(Object.entries(cattleBreedPremiums));
    for (const b of (breedPremiumData ?? [])) {
      premiumMap.set(b.breed, b.premium_percent);
    }

    for (const h of herds) {
      const result = calculateHerdValuation(
        h as Parameters<typeof calculateHerdValuation>[0],
        nationalPriceMap, premiumMap, undefined, saleyardPriceMap, saleyardBreedPriceMap
      );
      baselineValue += result.netValue;
    }
  }

  // Generate accountant report for the client if reports are shared
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const reportData = permissions.reports && serviceClient
    ? await generateAccountantData(serviceClient, conn.target_user_id, {
        reportType: "accountant",
        startDate: oneYearAgo.toISOString().slice(0, 10),
        endDate: now.toISOString().slice(0, 10),
        selectedPropertyIds: [],
      })
    : null;

  const advisorName = user.user_metadata?.display_name ?? user.user_metadata?.first_name ?? "Advisor";

  const participants: Record<string, { name: string; role: string }> = {
    [user.id]: { name: "You", role: conn.requester_role },
    [conn.target_user_id]: { name: clientName, role: "producer" },
  };

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={clientName}
        titleClassName="text-4xl font-bold text-[#2F8CD9]"
        titleHref="/dashboard/advisor/clients"
        inline
        actions={
          <div className="flex items-center gap-2">
            {clientProfile?.company_name && (
              <Badge variant="default">{clientProfile.company_name}</Badge>
            )}
            <RemoveClientButton connectionId={id} clientName={clientName} />
          </div>
        }
      />

      <Tabs
        tabs={[
          {
            id: "overview",
            label: "Overview",
            content: <ClientOverview connection={conn} baselineValue={baselineValue} />,
          },
          {
            id: "notes",
            label: "Notes",
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <AdvisorNotes
                    connectionId={id}
                    currentUserId={user.id}
                    messages={(messages ?? []) as AdvisoryMessage[]}
                    participants={participants}
                  />
                </CardContent>
              </Card>
            ),
          },
          {
            id: "lens",
            label: "Advisor Lens",
            content: permissions.valuations ? (
              <AdvisorLensPanel
                connectionId={id}
                lens={(lensData as AdvisorLens) ?? null}
                scenarios={(scenariosData as AdvisorScenario[]) ?? []}
                baselineValue={baselineValue}
                advisorName={advisorName}
              />
            ) : (
              <Card>
                <EmptyState
                  icon={<Lock className="h-6 w-6 text-[#2F8CD9]" />}
                  title="Valuations Not Shared"
                  description="This producer has not enabled valuation sharing."
                  variant="purple"
                />
              </Card>
            ),
          },
          {
            id: "reports",
            label: "Reports",
            content: permissions.reports ? (
              <ClientReportTab reportData={reportData} clientName={clientName} />
            ) : (
              <Card>
                <EmptyState
                  icon={<Lock className="h-6 w-6 text-[#2F8CD9]" />}
                  title="Reports Not Shared"
                  description="This producer has not enabled report sharing."
                  variant="purple"
                />
              </Card>
            ),
          },
          {
            id: "documents",
            label: "Documents",
            content: (
              <Card>
                <EmptyState
                  icon={<Lock className="h-6 w-6 text-[#2F8CD9]" />}
                  title="Coming Soon"
                  description="Shared documents from this producer will appear here. Documents are read-only and cannot be modified by advisors."
                  variant="purple"
                />
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
