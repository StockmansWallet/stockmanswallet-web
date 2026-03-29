"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, UserX } from "lucide-react";
import { grantDataAccess, stopSharing, disconnectAdvisor } from "@/app/(app)/dashboard/advisory-hub/my-advisors/actions";
import { ConfirmModal } from "@/components/app/advisory/confirm-modal";
import {
  getCategoryConfig,
  hasActivePermission,
  type ConnectionRequest,
} from "@/lib/types/advisory";

export function ConnectedAdvisorCard({ connection }: { connection: ConnectionRequest }) {
  const [loading, setLoading] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const categoryConfig = getCategoryConfig(connection.requester_role);
  const isSharing = hasActivePermission(connection);

  const handleToggleSharing = async () => {
    setLoading(true);
    if (isSharing) {
      await stopSharing(connection.id);
    } else {
      await grantDataAccess(connection.id);
    }
    setLoading(false);
  };

  const handleDisconnect = async () => {
    setLoading(true);
    await disconnectAdvisor(connection.id);
    setLoading(false);
    setShowDisconnect(false);
  };

  return (
    <>
      <Link href={`/dashboard/advisory-hub/my-advisors/${connection.id}`}>
        <Card className="transition-colors hover:bg-white/[0.02]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15">
                  {categoryConfig ? (
                    <categoryConfig.icon className={`h-5 w-5 ${categoryConfig.colorClass}`} />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-purple-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    {connection.requester_name}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    {categoryConfig && (
                      <Badge variant="default">{categoryConfig.label}</Badge>
                    )}
                    {connection.requester_company && (
                      <span className="text-xs text-text-muted">{connection.requester_company}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={isSharing ? "success" : "default"}>
                  {isSharing ? "Sharing" : "Not sharing"}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleSharing();
                  }}
                  disabled={loading}
                  title={isSharing ? "Stop sharing data" : "Share data"}
                >
                  {isSharing ? (
                    <EyeOff className="h-4 w-4 text-text-muted" />
                  ) : (
                    <Eye className="h-4 w-4 text-green-400" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowDisconnect(true);
                  }}
                  disabled={loading}
                  title="Disconnect advisor"
                >
                  <UserX className="h-4 w-4 text-red-400/60" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
      <ConfirmModal
        open={showDisconnect}
        onClose={() => setShowDisconnect(false)}
        onConfirm={handleDisconnect}
        title="Disconnect Advisor"
        description={`This will remove ${connection.requester_name} from your advisors. They will need to send a new connection request to reconnect.`}
        confirmLabel="Disconnect"
        loading={loading}
      />
    </>
  );
}
