import Image from "next/image";
import { MapPin } from "lucide-react";
import { AdvisorConnectButton } from "./advisor-connect-button";

interface ProducerCardProps {
  producer: {
    user_id: string;
    display_name: string;
    company_name: string;
    property_name?: string;
    state: string;
    region: string;
    bio: string;
  };
  connectionStatus: string | null;
  avatarUrl: string | null;
}

export function ProducerCard({ producer, connectionStatus, avatarUrl }: ProducerCardProps) {
  const initials = producer.display_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3.5 px-4 py-3">
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={producer.display_name}
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15">
          <span className="text-xs font-bold text-success">{initials}</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary">{producer.display_name}</p>
        <div className="mt-0.5 flex items-center gap-x-2 overflow-hidden text-xs text-text-muted">
          {[
            producer.company_name && (
              <span key="company" className="shrink-0 text-text-secondary">{producer.company_name}</span>
            ),
            producer.property_name && (
              <span key="property" className="truncate">{producer.property_name}</span>
            ),
            producer.state && (
              <span key="location" className="inline-flex shrink-0 items-center gap-1">
                <MapPin className="h-3 w-3" />
                {producer.state}{producer.region ? `, ${producer.region}` : ""}
              </span>
            ),
            producer.bio && (
              <span key="bio" className="truncate">{producer.bio}</span>
            ),
          ]
            .filter(Boolean)
            .flatMap((item, i) =>
              i === 0 ? [item] : [<span key={`sep-${i}`} className="text-white/15">|</span>, item]
            )}
        </div>
      </div>
      <div className="shrink-0">
        <AdvisorConnectButton
          targetUserId={producer.user_id}
          existingStatus={connectionStatus}
          compact
        />
      </div>
    </div>
  );
}
