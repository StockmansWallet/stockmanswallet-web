import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { UserAvatar } from "@/components/app/user-avatar";
import type { DirectoryFarmer } from "@/lib/types/advisory";

const SPECIES_EMOJI: Record<string, string> = {
  Cattle: "\uD83D\uDC04",
  Sheep: "\uD83D\uDC0F",
  Pig: "\uD83D\uDC16",
  Goat: "\uD83D\uDC10",
};

/**
 * Flat row-style directory item. Designed to live inside a Card with
 * divide-y dividers (matches the advisor directory pattern documented in
 * CLAUDE.md). The wrapping Card provides the surface tone; this component
 * only provides the row contents and hover state.
 */
export function FarmerCard({ farmer, avatarUrl }: { farmer: DirectoryFarmer; avatarUrl?: string | null }) {
  return (
    <Link
      href={`/dashboard/farmer-network/directory/${farmer.user_id}`}
      className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-white/[0.03]"
    >
      <UserAvatar
        name={farmer.display_name}
        avatarUrl={avatarUrl}
        sizeClass="h-11 w-11"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className="truncate text-sm font-semibold text-text-primary">
            {farmer.display_name}
          </p>
          {(farmer.property_name || farmer.company_name) && (
            <span className="truncate text-xs text-text-secondary">
              {farmer.property_name ?? farmer.company_name}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
          {farmer.state && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {farmer.state}
              {farmer.region ? `, ${farmer.region}` : ""}
            </span>
          )}
          {farmer.primary_species && (
            <span className="flex items-center gap-1">
              <span aria-hidden="true">{SPECIES_EMOJI[farmer.primary_species] ?? ""}</span>
              {farmer.primary_species}
            </span>
          )}
          {farmer.bio && <span className="truncate">{farmer.bio}</span>}
        </div>
      </div>

      <ArrowRight
        className="h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}
