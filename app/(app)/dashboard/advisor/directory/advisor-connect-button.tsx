"use client";

import { useState } from "react";
import { UserPlus, Check, Clock } from "lucide-react";
import { sendAdvisorConnectionRequest } from "../clients/actions";

interface AdvisorConnectButtonProps {
  targetUserId: string;
  existingStatus: string | null;
  compact?: boolean;
}

const base = "inline-flex items-center justify-center font-semibold transition-all duration-150";
const sm = "h-8 rounded-lg px-3.5 text-[13px]";
const md = "h-9 rounded-lg px-4 text-[13px]";

export function AdvisorConnectButton({
  targetUserId,
  existingStatus,
  compact,
}: AdvisorConnectButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(existingStatus);
  const [error, setError] = useState<string | null>(null);

  const sizeClass = compact ? sm : md;

  if (status === "approved") {
    return (
      <span className={`${base} ${sizeClass} bg-success/15 text-success`}>
        <Check className="mr-1.5 h-4 w-4" />
        Connected
      </span>
    );
  }

  if (status === "pending") {
    return (
      <span className={`${base} ${sizeClass} bg-warning/15 text-warning`}>
        <Clock className="mr-1.5 h-4 w-4" />
        Pending
      </span>
    );
  }

  const isDeniedOrExpired = status === "denied" || status === "expired";

  const handleRequest = async () => {
    setLoading(true);
    setError(null);
    const result = await sendAdvisorConnectionRequest(targetUserId);
    if (result.error) {
      setError(result.error);
    } else {
      setStatus("pending");
    }
    setLoading(false);
  };

  const label = loading
    ? "Sending..."
    : compact
      ? isDeniedOrExpired ? "Reconnect" : "Connect"
      : isDeniedOrExpired ? "Re-request Connection" : "Request Connection";

  return (
    <div>
      <button
        className={`${base} ${sizeClass} bg-advisor text-white shadow-sm hover:bg-advisor-dark active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none`}
        onClick={handleRequest}
        disabled={loading}
      >
        <UserPlus className="mr-1.5 h-4 w-4" />
        {label}
      </button>
      {!compact && isDeniedOrExpired && (
        <p className="mt-1 text-xs text-text-muted">
          Previous request was {status}. You can send a new one.
        </p>
      )}
      {error && (
        <p className="mt-2 text-xs text-error">{error}</p>
      )}
    </div>
  );
}
