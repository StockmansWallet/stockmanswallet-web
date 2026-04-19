"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Clock, Layers, Map, FileText, DollarSign } from "lucide-react";
import { approveRequest, denyRequest } from "@/app/(app)/dashboard/advisory-hub/my-advisors/actions";
import { ConfirmModal } from "@/components/app/advisory/confirm-modal";
import { getCategoryConfig, type ConnectionRequest } from "@/lib/types/advisory";

function getRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AdvisorRequestCard({ request }: { request: ConnectionRequest }) {
  const [loading, setLoading] = useState<"approve" | "deny" | null>(null);
  const [showDenyConfirm, setShowDenyConfirm] = useState(false);
  const categoryConfig = getCategoryConfig(request.requester_role);
  const categoryBg = categoryConfig?.bgClass ?? "bg-[#2F8CD9]/15";
  const categoryColour = categoryConfig?.colorClass ?? "text-[#2F8CD9]";

  const handleApprove = async () => {
    setLoading("approve");
    await approveRequest(request.id);
    setLoading(null);
  };

  const handleDeny = async () => {
    setLoading("deny");
    await denyRequest(request.id);
    setLoading(null);
    setShowDenyConfirm(false);
  };

  return (
    <>
    <Card className="bg-amber-500/[0.03]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            {/* Category-coloured avatar */}
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${categoryBg} shadow-sm`}>
              {categoryConfig ? (
                <categoryConfig.icon className={`h-5 w-5 ${categoryColour}`} />
              ) : (
                <Clock className="h-5 w-5 text-[#2F8CD9]" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">
                {request.requester_name}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                {categoryConfig && (
                  <Badge variant="default">{categoryConfig.label}</Badge>
                )}
                {request.requester_company && (
                  <span className="text-xs text-text-muted">{request.requester_company}</span>
                )}
              </div>
              <p className="mt-1 text-xs text-text-muted">{getRelativeTime(request.created_at)}</p>

              {/* What will be shared on approval */}
              <div className="mt-2 flex items-center gap-1">
                <span className="mr-1 text-[10px] text-text-muted">Will access:</span>
                {[Layers, Map, FileText, DollarSign].map((Icon, i) => (
                  <div key={i} className="flex h-5 w-5 items-center justify-center rounded bg-white/5">
                    <Icon className="h-2.5 w-2.5 text-text-muted" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button
              variant="teal"
              size="sm"
              onClick={handleApprove}
              disabled={loading !== null}
            >
              <Check className="mr-1 h-3.5 w-3.5" />
              {loading === "approve" ? "..." : "Approve"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="border border-white/[0.08] bg-white/[0.04] text-xs text-text-muted hover:border-error/30 hover:bg-error/10 hover:text-error"
              onClick={() => setShowDenyConfirm(true)}
              disabled={loading !== null}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Deny
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
    <ConfirmModal
      open={showDenyConfirm}
      onClose={() => setShowDenyConfirm(false)}
      onConfirm={handleDeny}
      title="Deny Request"
      description={`This will deny ${request.requester_name}'s connection request. They will be notified.`}
      confirmLabel="Deny"
      loading={loading === "deny"}
    />
    </>
  );
}
