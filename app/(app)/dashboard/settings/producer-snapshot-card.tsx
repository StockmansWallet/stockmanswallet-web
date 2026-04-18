import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Eye, MapPin, Home } from "lucide-react";
import type { PrimarySpecies, HerdSizeBucket } from "@/lib/data/producer-enrichment";

const SPECIES_EMOJI: Record<string, string> = {
  Cattle: "\uD83D\uDC04",
  Sheep: "\uD83D\uDC0F",
  Pig: "\uD83D\uDC16",
  Goat: "\uD83D\uDC10",
};

const HERD_SIZE_LABEL: Record<string, string> = {
  small: "Small (< 100 head)",
  medium: "Medium (100-999 head)",
  large: "Large (1,000+ head)",
};

interface ProducerSnapshotCardProps {
  state: string | null;
  region: string | null;
  primary_species: PrimarySpecies | null;
  herd_size_bucket: HerdSizeBucket | null;
  property_count: number;
}

function SectionIcon() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
      <Eye className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
    </div>
  );
}

/**
 * Read-only preview of the fields other producers see on the user's
 * public Producer Profile card: location, primary species, herd-size
 * bucket, and property count. Everything here is derived from the user's
 * own herds and properties so it updates automatically as they change
 * those elsewhere in the app. No edit controls on this card.
 */
export function ProducerSnapshotCard({
  state,
  region,
  primary_species,
  herd_size_bucket,
  property_count,
}: ProducerSnapshotCardProps) {
  const hasAnything = state || region || primary_species || herd_size_bucket || property_count > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <SectionIcon />
          <CardTitle>What other producers see</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {hasAnything ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-secondary">
            {(state || region) && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-text-muted" aria-hidden="true" />
                {state}
                {region ? `, ${region}` : ""}
              </span>
            )}
            {primary_species && (
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true">{SPECIES_EMOJI[primary_species] ?? ""}</span>
                {primary_species}
              </span>
            )}
            {herd_size_bucket && (
              <span className="flex items-center gap-1.5 text-text-muted">
                {HERD_SIZE_LABEL[herd_size_bucket]}
              </span>
            )}
            {property_count > 0 && (
              <span className="flex items-center gap-1.5 text-text-muted">
                <Home className="h-4 w-4" aria-hidden="true" />
                {property_count === 1 ? "1 property" : `${property_count} properties`}
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-text-muted">
            Add a herd and a property so other producers can see what kind of operation you run.
          </p>
        )}
        <p className="mt-3 text-xs text-text-muted">
          These details are derived from your herds and properties. Update them there and this snapshot
          reflects the change automatically.
        </p>
      </CardContent>
    </Card>
  );
}
