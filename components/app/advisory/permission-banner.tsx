"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Clock, RefreshCw } from "lucide-react";
import { requestRenewal } from "@/app/(app)/dashboard/advisor/clients/actions";
import { permissionTimeRemaining, type ConnectionRequest } from "@/lib/types/advisory";

interface PermissionBannerProps {
  connection: ConnectionRequest;
  isActive: boolean;
}

export function PermissionBanner({ connection, isActive }: PermissionBannerProps) {
  const [loading, setLoading] = useState(false);
  const timeRemaining = permissionTimeRemaining(connection);

  const handleRenewal = async () => {
    setLoading(true);
    await requestRenewal(connection.id);
    setLoading(false);
  };

  if (isActive) {
    return (
      <div className="flex items-center justify-between rounded-xl bg-green-500/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-green-400" />
          <span className="text-sm font-medium text-green-400">Active Permission</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-green-400/70" />
          <span className="text-xs text-green-400/70">{timeRemaining}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-xl bg-amber-500/10 px-4 py-3">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-amber-400" />
        <div>
          <span className="text-sm font-medium text-amber-400">Permission Expired</span>
          <p className="text-xs text-amber-400/70">
            Request renewal to view this client's data.
          </p>
        </div>
      </div>
      <Button
        variant="amber"
        size="sm"
        onClick={handleRenewal}
        disabled={loading}
      >
        <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Requesting..." : "Request Renewal"}
      </Button>
    </div>
  );
}
