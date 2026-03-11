import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, MapPin, Handshake } from "lucide-react";
import type { DirectoryFarmer } from "@/lib/types/advisory";

export function FarmerCard({ farmer }: { farmer: DirectoryFarmer }) {
  return (
    <Link href={`/dashboard/farmer-network/directory/${farmer.user_id}`} className="block">
      <Card className="group cursor-pointer bg-white/[0.08] transition-all hover:bg-white/[0.12]">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
                <Handshake className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {farmer.display_name}
                </p>
                {farmer.company_name && (
                  <p className="text-xs text-text-secondary">{farmer.company_name}</p>
                )}
                {farmer.state && (
                  <span className="mt-1.5 flex items-center gap-1 text-xs text-text-muted">
                    <MapPin className="h-3 w-3" />
                    {farmer.state}
                    {farmer.region ? `, ${farmer.region}` : ""}
                  </span>
                )}
                {farmer.bio && (
                  <p className="mt-2 line-clamp-2 text-xs text-text-muted">
                    {farmer.bio}
                  </p>
                )}
              </div>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
