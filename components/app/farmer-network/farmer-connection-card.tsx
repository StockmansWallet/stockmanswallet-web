import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Handshake, MessageSquare } from "lucide-react";

interface FarmerConnectionCardProps {
  connection: {
    id: string;
    other_name: string;
    other_company: string;
    last_message?: string | null;
  };
}

export function FarmerConnectionCard({ connection }: FarmerConnectionCardProps) {
  return (
    <Link href={`/dashboard/farmer-network/connections/${connection.id}`}>
      <Card className="group cursor-pointer transition-all hover:bg-surface-low">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
                <Handshake className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {connection.other_name}
                </p>
                {connection.other_company && (
                  <p className="text-xs text-text-secondary">{connection.other_company}</p>
                )}
                {connection.last_message && (
                  <p className="mt-1 flex items-center gap-1 truncate text-xs text-text-muted">
                    <MessageSquare className="h-3 w-3 shrink-0" />
                    <span className="truncate">{connection.last_message}</span>
                  </p>
                )}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
