"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldOff } from "lucide-react";
import { revokeAccess } from "@/app/(app)/dashboard/advisory-hub/my-advisors/actions";
import { ConfirmModal } from "@/components/app/advisory/confirm-modal";
import {
  getCategoryConfig,
  hasActivePermission,
  permissionTimeRemaining,
  type ConnectionRequest,
} from "@/lib/types/advisory";

export function ConnectedAdvisorCard({ connection }: { connection: ConnectionRequest }) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const categoryConfig = getCategoryConfig(connection.requester_role);
  const isActive = hasActivePermission(connection);
  const timeRemaining = permissionTimeRemaining(connection);

  const handleRevoke = async () => {
    setLoading(true);
    await revokeAccess(connection.id);
    setLoading(false);
    setShowConfirm(false);
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

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <Badge variant={isActive ? "success" : "warning"}>
                    {isActive ? "Active" : "Expired"}
                  </Badge>
                  <p className="mt-0.5 text-xs text-text-muted">{timeRemaining}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowConfirm(true);
                  }}
                  disabled={loading}
                  title="Revoke access"
                >
                  <ShieldOff className="h-4 w-4 text-text-muted" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
      <ConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleRevoke}
        title="Revoke Access"
        description={`This will immediately end ${connection.requester_name}'s access to your data. They will need to request access again.`}
        confirmLabel="Revoke"
        loading={loading}
      />
    </>
  );
}
