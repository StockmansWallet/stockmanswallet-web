import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { ClientOverview } from "@/components/app/advisory/client-overview";
import { ClientHerdsTable } from "@/components/app/advisory/client-herds-table";
import { AdvisorChatClient } from "./advisor-chat-client";
import { EmptyState } from "@/components/ui/empty-state";
import { Lock } from "lucide-react";
import { RemoveClientButton } from "./remove-client-button";
import type { ConnectionRequest, AdvisoryMessage } from "@/lib/types/advisory";
import { parseSharingPermissions, hasActivePermission } from "@/lib/types/advisory";
import { calculateHerdValuation, categoryFallback, type CategoryPriceEntry } from "@/lib/engines/valuation-engine";
import { resolveMLACategory } from "@/lib/data/weight-mapping";
import { cattleBreedPremiums, resolveMLASaleyardName } from "@/lib/data/reference-data";
import { expandWithNearbySaleyards } from "@/lib/data/saleyard-proximity";
import { generateAccountantData } from "@/lib/services/report-service";
import { ClientReportTab } from "@/components/app/advisory/client-report-tab";
import { LensSavedList } from "@/components/app/advisory/lens-saved-list";
import { Eye } from "lucide-react";
import type { LensReport } from "@/lib/types/lens-report";
import type { HerdInfo } from "@/components/app/advisory/lens-herd-card";

export const revalidate = 0;
export const metadata = { title: "Client Detail" };

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

  // Verify the current user is involved in this connection (either direction)
  const isRequester = connection.requester_user_id === user.id;
  const isTarget = connection.target_user_id === user.id;
  if (!isRequester && !isTarget) notFound();

  // Resolve the client (other party) user ID regardless of who initiated
  const clientUserId = isRequester ? connection.target_user_id : connection.requester_user_id;

  // Mark unread notifications as read
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("related_connection_id", id)
    .eq("is_read", false);

  const conn = connection as ConnectionRequest;
  const permissions = parseSharingPermissions(conn.sharing_permissions);
  const isActive = hasActivePermission(conn);

  // Service client to read client's data (bypasses RLS)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serviceClient = serviceRoleKey
    ? createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
    : null;

  // Get client display name
  const { data: clientProfile } = await supabase
    .from("user_profiles")
    .select("display_name, company_name, property_name, role")
    .eq("user_id", clientUserId)
    .single();

  const clientName = clientProfile?.display_name ?? "Unknown Producer";

  // Fetch client avatar from auth metadata
  let clientAvatarUrl: string | null = null;
  if (serviceRoleKey) {
    const svc = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);
    const { data: authUser } = await svc.auth.admin.getUserById(clientUserId);
    clientAvatarUrl = authUser?.user?.user_metadata?.avatar_url ?? null;
  }

  const clientInitials = clientName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Fetch messages for Notes tab
  const { data: messages } = await supabase
    .from("advisory_messages")
    .select("*")
    .eq("connection_id", id)
    .order("created_at", { ascending: true });

  // Fetch client herds and breed premiums
  const [{ data: clientHerds }, { data: breedPremiumData }] = await Promise.all([
    serviceClient
      ? serviceClient
          .from("herds")
          .select("*")
          .eq("user_id", clientUserId)
          .eq("is_sold", false)
          .eq("is_deleted", false)
          .neq("is_demo_data", true)
      : Promise.resolve({ data: [] as unknown[] }),
    supabase
      .from("breed_premiums")
      .select("breed, premium_percent:premium_pct"),
  ]);

  // Calculate per-herd valuations (same pattern as producer herds page)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const herds = (clientHerds ?? []) as any[];
  let baselineValue = 0;
  const herdValues: Record<string, number> = {};
  const herdSources: Record<string, string> = {};
  const herdPricePerKg: Record<string, number> = {};
  const herdBreedingAccrual: Record<string, number> = {};
  const herdNearestSaleyard: Record<string, string | null> = {};
  const herdProjectedWeight: Record<string, number> = {};
  const herdBreedPremium: Record<string, number> = {};

  if (permissions.valuations && herds.length > 0) {
    const herdSaleyards = [...new Set(herds.map((h) => h.selected_saleyard ? resolveMLASaleyardName(h.selected_saleyard as string) : null).filter(Boolean))] as string[];
    const saleyards = expandWithNearbySaleyards(herdSaleyards);
    const primaryCategories = [...new Set(herds.map((h) => resolveMLACategory(h.category as string, h.initial_weight as number, (h.breeder_sub_type as string) ?? undefined).primaryMLACategory))];
    const mlaCategories = [...new Set([...primaryCategories, ...primaryCategories.map((c) => categoryFallback(c)).filter((c): c is string => c !== null)])];

    type PriceRow = { category: string; price_per_kg: number; weight_range: string | null; saleyard: string; breed: string | null; data_date: string };
    const emptyPrices: PriceRow[] = [];
    const { data: rpcPrices } = mlaCategories.length > 0
      ? await supabase.rpc("latest_saleyard_prices", { p_saleyards: saleyards, p_categories: mlaCategories }) as unknown as { data: PriceRow[] | null }
      : { data: emptyPrices };

    const nationalPriceMap = new Map<string, CategoryPriceEntry[]>();
    const saleyardPriceMap = new Map<string, CategoryPriceEntry[]>();
    const saleyardBreedPriceMap = new Map<string, CategoryPriceEntry[]>();
    for (const p of (rpcPrices ?? [])) {
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
      const hid = h.id as string;
      herdValues[hid] = result.netValue;
      herdSources[hid] = result.priceSource;
      herdPricePerKg[hid] = result.pricePerKg;
      herdBreedingAccrual[hid] = result.breedingAccrual;
      herdNearestSaleyard[hid] = result.nearestSaleyardUsed;
      herdProjectedWeight[hid] = result.projectedWeight;
      herdBreedPremium[hid] = result.breedPremiumApplied;
      baselineValue += result.netValue;
    }
  }

  // Generate accountant report for the client if reports are shared
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const reportData = permissions.reports && serviceClient
    ? await generateAccountantData(serviceClient, clientUserId, {
        reportType: "accountant",
        startDate: oneYearAgo.toISOString().slice(0, 10),
        endDate: now.toISOString().slice(0, 10),
        selectedPropertyIds: [],
      })
    : null;

  // Fetch saved lens reports for this connection
  const { data: lensReportsRaw } = await supabase
    .from("lens_reports")
    .select("*")
    .eq("client_connection_id", id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  const lensReports = (lensReportsRaw ?? []) as LensReport[];

  // Build HerdInfo array for the lens wizard
  const lensHerds: HerdInfo[] = herds.map((h) => ({
    id: h.id as string,
    name: (h.name as string) ?? "",
    category: h.category as string,
    breed: h.breed as string,
    species: h.species as string,
    head_count: h.head_count as number,
    initial_weight: h.initial_weight as number,
    daily_weight_gain: h.daily_weight_gain as number,
    mortality_rate: h.mortality_rate as number | null,
    calving_rate: h.calving_rate as number,
    breed_premium_override: h.breed_premium_override as number | null,
    selected_saleyard: h.selected_saleyard as string | null,
    is_breeder: h.is_breeder as boolean,
  }));

  const participants: Record<string, { name: string; role: string }> = {
    [user.id]: { name: "You", role: isRequester ? conn.requester_role : "advisor" },
    [clientUserId]: { name: clientName, role: isRequester ? "producer" : conn.requester_role },
  };

  return (
    <div className="max-w-5xl">
      {/* Client header: avatar + name + badges + actions */}
      <div className="mb-6 mt-6 flex items-end gap-4">
        {clientAvatarUrl ? (
          <Image
            src={clientAvatarUrl}
            alt={clientName}
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
            <span className="text-lg font-bold text-emerald-400">{clientInitials}</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-text-primary">{clientName}</h1>
          {(clientProfile?.property_name || clientProfile?.company_name) && (
            <p className="mt-0.5 text-sm text-text-secondary">
              {[clientProfile?.property_name, clientProfile?.company_name].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="shrink-0">
          <Badge variant={isActive ? "success" : "default"}>
            {isActive ? "Sharing Data" : "Not Sharing"}
          </Badge>
        </div>
      </div>

      <Tabs
        tabs={[
          {
            id: "overview",
            label: "Overview",
            content: <ClientOverview connection={conn} clientUserId={clientUserId} baselineValue={baselineValue} />,
          },
          {
            id: "herds",
            label: "Herds",
            content: permissions.herds && herds.length > 0 ? (
              <ClientHerdsTable
                herds={herds as Parameters<typeof ClientHerdsTable>[0]["herds"]}
                herdValues={herdValues}
                herdPricePerKg={herdPricePerKg}
                herdSources={herdSources}
                herdNearestSaleyard={herdNearestSaleyard}
                herdProjectedWeight={herdProjectedWeight}
                herdBreedPremium={herdBreedPremium}
                herdBreedingAccrual={herdBreedingAccrual}
                connectionId={id}
              />
            ) : (
              <Card>
                <EmptyState
                  icon={<Lock className="h-6 w-6 text-[#2F8CD9]" />}
                  title={permissions.herds ? "No Herds" : "Herds Not Shared"}
                  description={permissions.herds ? "This producer has no active herds." : "This producer has not enabled herd data sharing."}
                  variant="advisor"
                />
              </Card>
            ),
          },
          {
            id: "lens",
            label: "Lens",
            content: permissions.herds ? (
              <LensSavedList
                connectionId={id}
                lensReports={lensReports}
                herds={lensHerds}
                herdValues={herdValues}
              />
            ) : (
              <Card>
                <EmptyState
                  icon={<Eye className="h-6 w-6 text-[#2F8CD9]" />}
                  title="Herds Not Shared"
                  description="Herd data sharing is required to create lens assessments."
                  variant="advisor"
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
                  variant="advisor"
                />
              </Card>
            ),
          },
          {
            id: "chat",
            label: "Chat",
            content: (
              <Card className="flex h-[500px] flex-col">
                <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
                  <AdvisorChatClient
                    connectionId={id}
                    currentUserId={user.id}
                    messages={(messages ?? []) as AdvisoryMessage[]}
                    participants={participants}
                  />
                </CardContent>
              </Card>
            ),
          },
        ]}
      />

      {/* Remove client */}
      <div className="pt-6">
        <RemoveClientButton connectionId={id} clientName={clientName} />
      </div>
    </div>
  );
}
