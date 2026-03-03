import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateProjectedWeight } from "@/lib/engines/valuation-engine";
import { DeleteHerdButton } from "./delete-button";

export const metadata = {
  title: "Herd Details",
};

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex justify-between py-2 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium text-text-primary">{String(value)}</span>
    </div>
  );
}

export default async function HerdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: herd } = await supabase
    .from("herds")
    .select("*, properties(property_name)")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (!herd) notFound();

  // Calculate projected weight if we have the data
  let projectedWeight: number | null = null;
  if (herd.initial_weight > 0 && herd.daily_weight_gain > 0) {
    const created = new Date(herd.created_at);
    const now = new Date();
    projectedWeight = calculateProjectedWeight(
      herd.initial_weight,
      created,
      herd.dwg_change_date ? new Date(herd.dwg_change_date) : now,
      now,
      herd.previous_dwg ?? herd.daily_weight_gain,
      herd.daily_weight_gain
    );
  }

  const property = herd.properties as { property_name: string } | null;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={herd.name}
        subtitle={[herd.species, herd.breed, herd.category]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/herds/${id}/edit`}>
              <Button variant="secondary" size="sm">
                Edit
              </Button>
            </Link>
            <DeleteHerdButton id={id} name={herd.name} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 divide-y divide-black/5 dark:divide-white/5">
            <InfoRow label="Species" value={herd.species} />
            <InfoRow label="Breed" value={herd.breed} />
            <InfoRow label="Sex" value={herd.sex} />
            <InfoRow label="Category" value={herd.category} />
            <InfoRow label="Head Count" value={herd.head_count?.toLocaleString()} />
            <InfoRow label="Age" value={herd.age_months ? `${herd.age_months} months` : null} />
            <InfoRow label="Animal ID" value={herd.animal_id_number} />
            {herd.is_sold && (
              <div className="flex justify-between py-2 text-sm">
                <span className="text-text-muted">Status</span>
                <Badge variant="danger">Sold</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weight & Growth */}
        <Card>
          <CardHeader>
            <CardTitle>Weight & Growth</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 divide-y divide-black/5 dark:divide-white/5">
            <InfoRow
              label="Initial Weight"
              value={herd.initial_weight ? `${herd.initial_weight} kg` : null}
            />
            <InfoRow
              label="Current Weight"
              value={herd.current_weight ? `${herd.current_weight} kg` : null}
            />
            {projectedWeight && (
              <InfoRow
                label="Projected Weight"
                value={`${Math.round(projectedWeight)} kg`}
              />
            )}
            <InfoRow
              label="Daily Weight Gain"
              value={
                herd.daily_weight_gain
                  ? `${herd.daily_weight_gain} kg/day`
                  : null
              }
            />
          </CardContent>
        </Card>

        {/* Breeding */}
        {herd.is_breeder && (
          <Card>
            <CardHeader>
              <CardTitle>Breeding</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 divide-y divide-black/5 dark:divide-white/5">
              <div className="flex justify-between py-2 text-sm">
                <span className="text-text-muted">Pregnant</span>
                <Badge variant={herd.is_pregnant ? "success" : "default"}>
                  {herd.is_pregnant ? "Yes" : "No"}
                </Badge>
              </div>
              <InfoRow label="Joined Date" value={herd.joined_date} />
              <InfoRow
                label="Calving Rate"
                value={herd.calving_rate ? `${herd.calving_rate}%` : null}
              />
              <InfoRow label="Lactation Status" value={herd.lactation_status} />
              <InfoRow
                label="Breeding Program"
                value={herd.breeding_program_type}
              />
            </CardContent>
          </Card>
        )}

        {/* Location & Market */}
        <Card>
          <CardHeader>
            <CardTitle>Location & Market</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 divide-y divide-black/5 dark:divide-white/5">
            {property && (
              <div className="flex justify-between py-2 text-sm">
                <span className="text-text-muted">Property</span>
                <Link
                  href={`/dashboard/properties/${herd.property_id}`}
                  className="font-medium text-brand hover:underline"
                >
                  {property.property_name}
                </Link>
              </div>
            )}
            <InfoRow label="Paddock" value={herd.paddock_name} />
            <InfoRow label="Saleyard" value={herd.selected_saleyard} />
            <InfoRow label="Market Category" value={herd.market_category} />
          </CardContent>
        </Card>

        {/* Notes */}
        {herd.notes && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-text-secondary">
                {herd.notes}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
