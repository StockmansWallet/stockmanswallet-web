"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Check, Clock } from "lucide-react";
import { sendAdvisorConnectionRequest } from "../clients/actions";

interface AdvisorConnectButtonProps {
  targetUserId: string;
  existingStatus: string | null;
}

export function AdvisorConnectButton({
  targetUserId,
  existingStatus,
}: AdvisorConnectButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(existingStatus);
  const [error, setError] = useState<string | null>(null);

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
    const result = await sendAdvisorConnectionRequest(targetUserId);
    if (result.error) {
      setError(result.error);
    } else {
      setStatus("pending");
    }
    setLoading(false);
  };

  return (
    <div>
      <Button
        variant="purple"
        onClick={handleRequest}
        disabled={loading}
      >
        <UserPlus className="mr-1.5 h-4 w-4" />
        {loading ? "Sending..." : isDeniedOrExpired ? "Re-request Connection" : "Request Connection"}
      </Button>
      {isDeniedOrExpired && (
        <p className="mt-1 text-xs text-text-muted">
          Previous request was {status}. You can send a new one.
        </p>
      )}
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
