import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
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
export function FarmerCard({ farmer }: { farmer: DirectoryFarmer }) {
  const initial = (farmer.display_name?.trim().charAt(0) || "?").toUpperCase();
  return (
    <Link
      href={`/dashboard/farmer-network/directory/${farmer.user_id}`}
      className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-white/[0.03]"
    >
      {/* Avatar: first initial inside an orange tile. */}
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-producer-network/15">
        <span className="text-sm font-bold text-producer-network-light">{initial}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-text-primary">
            {farmer.display_name}
          </p>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
          {farmer.company_name && <span className="truncate">{farmer.company_name}</span>}
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
        </div>
        {farmer.bio && (
          <p className="mt-1 line-clamp-1 text-xs text-text-muted">{farmer.bio}</p>
        )}
      </div>

      <ArrowRight
        className="h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}
