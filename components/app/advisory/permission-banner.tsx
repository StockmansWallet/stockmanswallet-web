"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Send, Clock } from "lucide-react";
import { requestRenewal } from "@/app/(app)/dashboard/advisor/clients/actions";
import type { ConnectionRequest } from "@/lib/types/advisory";

interface PermissionBannerProps {
  connection: ConnectionRequest;
  isActive: boolean;
}

export function PermissionBanner({ connection, isActive }: PermissionBannerProps) {
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(false);
  const router = useRouter();

  const handleRequestAccess = async () => {
    setLoading(true);
    const result = await requestRenewal(connection.id);
    setLoading(false);

    if (result && "error" in result) {
      return;
    }

    setRequested(true);
    router.refresh();
  };

  if (isActive) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-green-500/10 px-4 py-3">
        <Shield className="h-4 w-4 text-green-400" />
        <span className="text-sm font-medium text-green-400">Data Shared</span>
        <span className="text-xs text-green-400/70">Producer is sharing their portfolio with you</span>
      </div>
    );
  }

  // Show pending state when connection status is pending or after just requesting
  if (connection.status === "pending" || requested) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-blue-500/10 px-4 py-3">
        <Clock className="h-4 w-4 text-blue-400" />
        <div>
          <span className="text-sm font-medium text-blue-400">Access Requested</span>
          <p className="text-xs text-blue-400/70">
            Waiting for the producer to grant data access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-xl bg-amber-500/10 px-4 py-3">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-amber-400" />
        <div>
          <span className="text-sm font-medium text-amber-400">Data Not Shared</span>
          <p className="text-xs text-amber-400/70">
            Request access to view this client's portfolio data.
          </p>
        </div>
      </div>
      <Button
        variant="amber"
        size="sm"
        onClick={handleRequestAccess}
        disabled={loading}
      >
        <Send className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Requesting..." : "Request Access"}
      </Button>
    </div>
  );
}
