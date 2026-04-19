import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin, Clock } from "lucide-react";
import {
  hasActivePermission,
  type ConnectionRequest,
} from "@/lib/types/advisory";

interface ClientCardProps {
  connection: ConnectionRequest;
  clientName: string;
  clientState?: string;
  clientCompany?: string;
}

export function ClientCard({
  connection,
  clientName,
  clientState,
  clientCompany,
}: ClientCardProps) {
  const isSharing = hasActivePermission(connection);
  const isPending = connection.status === "pending";

  return (
    <Link href={`/dashboard/advisor/clients/${connection.id}`}>
      <Card className="group cursor-pointer bg-surface transition-all hover:bg-surface-low">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-advisor/15">
                <span className="text-sm font-bold text-advisor">
                  {clientName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">{clientName}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  {clientCompany && (
                    <span className="text-xs text-text-secondary">{clientCompany}</span>
                  )}
                  {clientState && (
                    <span className="flex items-center gap-1 text-xs text-text-muted">
                      <MapPin className="h-3 w-3" />
                      {clientState}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                {isPending ? (
                  <Badge variant="default">
                    <Clock className="mr-1 h-3 w-3" />
                    Pending
                  </Badge>
                ) : (
                  <Badge variant={isSharing ? "success" : "default"}>
                    {isSharing ? "Sharing" : "Connected"}
                  </Badge>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
