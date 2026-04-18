import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, MapPin, Handshake } from "lucide-react";
import type { DirectoryFarmer } from "@/lib/types/advisory";

const SPECIES_EMOJI: Record<string, string> = {
  Cattle: "\uD83D\uDC04", // cow
  Sheep: "\uD83D\uDC0F", // sheep
  Pig: "\uD83D\uDC16",   // pig
  Goat: "\uD83D\uDC10",  // goat
};

export function FarmerCard({ farmer }: { farmer: DirectoryFarmer }) {
  return (
    <Link href={`/dashboard/farmer-network/directory/${farmer.user_id}`} className="block">
      <Card className="group cursor-pointer bg-white/[0.08] transition-all hover:bg-white/[0.12]">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15" aria-hidden="true">
                <Handshake className="h-5 w-5 text-orange-400" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary">
                  {farmer.display_name}
                </p>
                {farmer.company_name && (
                  <p className="truncate text-xs text-text-secondary">{farmer.company_name}</p>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
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
                  <p className="mt-2 line-clamp-2 text-xs text-text-muted">
                    {farmer.bio}
                  </p>
                )}
              </div>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
