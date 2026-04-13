import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

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
  const initials = producer.display_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      href={`/dashboard/advisor/directory/${producer.user_id}`}
      className="group flex items-center gap-3.5 p-4 transition-colors hover:bg-white/[0.02]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
        <span className="text-sm font-bold text-emerald-400">{initials}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary">{producer.display_name}</p>
        <div className="mt-0.5 flex items-center gap-2">
          {producer.company_name && (
            <span className="text-xs text-text-muted">{producer.company_name}</span>
          )}
          {producer.state && (
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <MapPin className="h-3 w-3" />
              {producer.state}{producer.region ? `, ${producer.region}` : ""}
            </span>
          )}
        </div>
        {producer.bio && (
          <p className="mt-1 line-clamp-1 text-xs text-text-muted">{producer.bio}</p>
        )}
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
