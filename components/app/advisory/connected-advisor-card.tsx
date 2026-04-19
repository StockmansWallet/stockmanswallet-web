"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EyeOff, Eye, Trash2, Layers, Map, FileText, DollarSign, ArrowRight } from "lucide-react";
import { grantDataAccess, stopSharing, disconnectAdvisor } from "@/app/(app)/dashboard/advisory-hub/my-advisors/actions";
import { ConfirmModal } from "@/components/app/advisory/confirm-modal";
import {
  getCategoryConfig,
  hasActivePermission,
  parseSharingPermissions,
  type ConnectionRequest,
} from "@/lib/types/advisory";

const sharingIcons = [
  { key: "herds", icon: Layers, label: "Herds" },
  { key: "properties", icon: Map, label: "Properties" },
  { key: "reports", icon: FileText, label: "Reports" },
  { key: "valuations", icon: DollarSign, label: "Valuations" },
] as const;

export function ConnectedAdvisorCard({ connection }: { connection: ConnectionRequest }) {
  const [loading, setLoading] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const categoryConfig = getCategoryConfig(connection.requester_role);
  const isSharing = hasActivePermission(connection);
  const permissions = parseSharingPermissions(connection.sharing_permissions);
  const categoryBg = categoryConfig?.bgClass ?? "bg-advisor/15";
  const categoryColour = categoryConfig?.colorClass ?? "text-advisor";

  const connectedDate = new Date(connection.created_at).toLocaleDateString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
  });

  const handleToggleSharing = async () => {
    setLoading(true);
    if (isSharing) { await stopSharing(connection.id); }
    else { await grantDataAccess(connection.id); }
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
      <Link href={`/dashboard/advisory-hub/my-advisors/${connection.id}`} className="block">
        <Card className="group transition-all hover:bg-white/[0.02]">
          <div className="p-0">
            {/* Main row */}
            <div className="flex items-center gap-4 p-4">
              {/* Avatar */}
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${categoryBg}`}>
                {categoryConfig ? (
                  <categoryConfig.icon className={`h-6 w-6 ${categoryColour}`} />
                ) : (
                  <span className="text-base font-bold text-advisor">
                    {connection.requester_name.charAt(0)}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {connection.requester_name}
                  </p>
                  {categoryConfig && (
                    <Badge variant="default" className="shrink-0">{categoryConfig.label}</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-text-muted">
                  {connection.requester_company ? `${connection.requester_company} · ` : ""}
                  Connected {connectedDate}
                </p>
              </div>

              {/* Status + Arrow */}
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={isSharing ? "success" : "default"}>
                  {isSharing ? "Sharing" : "Not sharing"}
                </Badge>
                <ArrowRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>

            {/* Footer: sharing icons + actions */}
            <div className="flex items-center justify-between border-t border-white/5 px-4 py-2.5">
              {/* Sharing icons */}
              <div className="flex items-center gap-1.5">
                {isSharing ? (
                  sharingIcons.map(({ key, icon: Icon, label }) => {
                    const active = permissions[key as keyof typeof permissions];
                    return (
                      <div
                        key={key}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg ${active ? "bg-success/15" : "bg-white/5"}`}
                        title={`${label}: ${active ? "Shared" : "Not shared"}`}
                      >
                        <Icon className={`h-3.5 w-3.5 ${active ? "text-success" : "text-text-muted/40"}`} />
                      </div>
                    );
                  })
                ) : (
                  <span className="text-xs text-text-muted">Data access paused</span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleSharing(); }}
                  disabled={loading}
                  className="h-7 gap-1.5 px-2.5 text-xs"
                >
                  {isSharing ? (
                    <><EyeOff className="h-3 w-3" /> Stop</>
                  ) : (
                    <><Eye className="h-3 w-3" /> Share</>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDisconnect(true); }}
                  disabled={loading}
                  className="h-7 gap-1.5 px-2.5 text-xs"
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </Link>
      <ConfirmModal
        open={showDisconnect}
        onClose={() => setShowDisconnect(false)}
        onConfirm={handleDisconnect}
        title="Remove Advisor"
        description={`This will remove ${connection.requester_name} from your advisors. They will need to send a new request to reconnect.`}
        confirmLabel="Remove"
        loading={loading}
      />
    </>
  );
}
