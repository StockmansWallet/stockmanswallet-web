"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Check, Clock, Layers, Map, FileText, DollarSign } from "lucide-react";
import { sendConnectionRequest } from "@/app/(app)/dashboard/advisory-hub/directory/actions";

interface ConnectionRequestButtonProps {
  targetUserId: string;
  existingStatus: string | null;
}

export function ConnectionRequestButton({
  targetUserId,
  existingStatus,
}: ConnectionRequestButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(existingStatus);
  const [error, setError] = useState<string | null>(null);
  const [showToggles, setShowToggles] = useState(false);

  // Sync server-refreshed prop to local state (router.refresh updates the prop)
  useEffect(() => {
    setStatus(existingStatus);
  }, [existingStatus]);

  // Sharing toggles
  const [shareHerds, setShareHerds] = useState(true);
  const [shareProperties, setShareProperties] = useState(true);
  const [shareReports, setShareReports] = useState(true);
  const [shareValuations, setShareValuations] = useState(true);

  if (status === "approved") {
    return (
      <Badge variant="success">
        <Check className="mr-1 h-3 w-3" />
        Connected
      </Badge>
    );
  }

  if (status === "pending") {
    return (
      <Badge variant="warning">
        <Clock className="mr-1 h-3 w-3" />
        Request Pending
      </Badge>
    );
  }

  const isDeniedOrExpired = status === "denied" || status === "expired";

  const handleRequest = async () => {
    setLoading(true);
    setError(null);
    const result = await sendConnectionRequest(targetUserId, {
      herds: shareHerds,
      properties: shareProperties,
      reports: shareReports,
      valuations: shareValuations,
    });
    if (result.error) {
      setError(result.error);
    } else {
      setStatus("pending");
    }
    setLoading(false);
  };

  if (!showToggles) {
    return (
      <div>
        <Button variant="purple" onClick={() => setShowToggles(true)} disabled={loading}>
          <UserPlus className="mr-1.5 h-4 w-4" />
          {isDeniedOrExpired ? "Re-request Connection" : "Connect with Advisor"}
        </Button>
        {isDeniedOrExpired && (
          <p className="text-text-muted mt-1 text-xs">
            Previous request was {status}. You can send a new one.
          </p>
        )}
        {error && <p className="text-error mt-2 text-xs">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-text-primary mb-1 text-sm font-semibold">Choose what to share</h4>
        <p className="text-text-muted text-xs">You can change these settings after connecting.</p>
      </div>

      <div className="divide-y divide-white/5 rounded-xl bg-white/[0.03]">
        <SharingToggle
          icon={<Layers className="h-4 w-4" />}
          title="Herds"
          subtitle="Herd names, head counts, breeds, weights"
          checked={shareHerds}
          onChange={setShareHerds}
        />
        <SharingToggle
          icon={<Map className="h-4 w-4" />}
          title="Properties"
          subtitle="Property names, locations, regions"
          checked={shareProperties}
          onChange={setShareProperties}
        />
        <SharingToggle
          icon={<FileText className="h-4 w-4" />}
          title="Reports"
          subtitle="Portfolio reports and exports"
          checked={shareReports}
          onChange={setShareReports}
        />
        <SharingToggle
          icon={<DollarSign className="h-4 w-4" />}
          title="Valuations"
          subtitle="Portfolio values, market prices"
          checked={shareValuations}
          onChange={setShareValuations}
        />
      </div>

      <div className="flex gap-2">
        <Button variant="purple" onClick={handleRequest} disabled={loading} className="flex-1">
          {loading ? "Connecting..." : "Connect & Share"}
        </Button>
        <Button
          variant="ghost"
          className="border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06]"
          onClick={() => setShowToggles(false)}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>

      {error && <p className="text-error text-xs">{error}</p>}
    </div>
  );
}

function SharingToggle({
  icon,
  title,
  subtitle,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]">
      <span className="text-chat-advisor-accent">{icon}</span>
      <div className="flex-1">
        <p className="text-text-primary text-sm font-medium">{title}</p>
        <p className="text-text-muted text-xs">{subtitle}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="text-chat-advisor-accent accent-chat-advisor-accent h-4 w-4 rounded border-white/20 bg-white/5"
      />
    </label>
  );
}
