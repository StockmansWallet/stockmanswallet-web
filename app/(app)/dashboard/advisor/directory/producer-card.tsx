import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, MapPin, User } from "lucide-react";

interface ProducerCardProps {
  producer: {
    user_id: string;
    display_name: string;
    company_name: string;
    state: string;
    region: string;
    bio: string;
  };
}

export function ProducerCard({ producer }: ProducerCardProps) {
  return (
    <Link href={`/dashboard/advisor/directory/${producer.user_id}`} className="block">
      <Card className="group cursor-pointer bg-surface transition-all hover:bg-surface-low">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15">
                <User className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {producer.display_name}
                </p>
                {producer.company_name && (
                  <p className="text-xs text-text-secondary">{producer.company_name}</p>
                )}
                {producer.state && (
                  <span className="mt-1.5 flex items-center gap-1 text-xs text-text-muted">
                    <MapPin className="h-3 w-3" />
                    {producer.state}
                    {producer.region ? `, ${producer.region}` : ""}
                  </span>
                )}
                {producer.bio && (
                  <p className="mt-2 line-clamp-2 text-xs text-text-muted">
                    {producer.bio}
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
