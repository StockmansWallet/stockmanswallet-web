"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, UserX, Layers, Map, FileText, DollarSign, ArrowRight } from "lucide-react";
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
  const categoryColour = categoryConfig?.colorClass ?? "text-[#2F8CD9]";
  const categoryBg = categoryConfig?.bgClass ?? "bg-[#2F8CD9]/15";

  const connectedDate = new Date(connection.created_at).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

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
        <Card className="group border border-white/5 transition-all hover:border-white/10 hover:bg-white/[0.02]">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              {/* Left: Avatar + Info */}
              <div className="flex items-start gap-3.5">
                {/* Category-coloured initials avatar */}
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${categoryBg} shadow-sm`}>
                  {categoryConfig ? (
                    <categoryConfig.icon className={`h-5 w-5 ${categoryColour}`} />
                  ) : (
                    <span className="text-sm font-bold text-[#2F8CD9]">
                      {connection.requester_name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary">
                    {connection.requester_name}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    {categoryConfig && (
                      <Badge variant="default">{categoryConfig.label}</Badge>
                    )}
                    {connection.requester_company && (
                      <span className="text-xs text-text-muted">{connection.requester_company}</span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-text-muted">Connected {connectedDate}</p>

                  {/* Sharing status icons */}
                  {isSharing && (
                    <div className="mt-2 flex items-center gap-1.5">
                      {sharingIcons.map(({ key, icon: Icon, label }) => {
                        const active = permissions[key as keyof typeof permissions];
                        return (
                          <div
                            key={key}
                            className={`flex h-6 w-6 items-center justify-center rounded-md ${active ? "bg-emerald-500/15" : "bg-white/5"}`}
                            title={`${label}: ${active ? "Shared" : "Not shared"}`}
                          >
                            <Icon className={`h-3 w-3 ${active ? "text-emerald-400" : "text-text-muted/40"}`} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Status + Actions */}
              <div className="flex shrink-0 items-center gap-2">
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
                  className="h-8 w-8 p-0"
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
                  title="Remove advisor"
                  className="h-8 w-8 p-0"
                >
                  <UserX className="h-4 w-4 text-red-400/60" />
                </Button>
                <ArrowRight className="ml-1 h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </CardContent>
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
