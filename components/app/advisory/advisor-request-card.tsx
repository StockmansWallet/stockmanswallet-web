"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Clock } from "lucide-react";
import { approveRequest, denyRequest } from "@/app/(app)/dashboard/advisory-hub/my-advisors/actions";
import { ConfirmModal } from "@/components/app/advisory/confirm-modal";
import { getCategoryConfig, type ConnectionRequest } from "@/lib/types/advisory";

export function AdvisorRequestCard({ request }: { request: ConnectionRequest }) {
  const [loading, setLoading] = useState<"approve" | "deny" | null>(null);
  const [showDenyConfirm, setShowDenyConfirm] = useState(false);
  const categoryConfig = getCategoryConfig(request.requester_role);

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

  const createdDate = new Date(request.created_at).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <>
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2F8CD9]/15">
              {categoryConfig ? (
                <categoryConfig.icon className={`h-5 w-5 ${categoryConfig.colorClass}`} />
              ) : (
                <Clock className="h-5 w-5 text-[#2F8CD9]" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">
                {request.requester_name}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                {categoryConfig && (
                  <Badge variant="default">{categoryConfig.label}</Badge>
                )}
                {request.requester_company && (
                  <span className="text-xs text-text-muted">{request.requester_company}</span>
                )}
              </div>
              <p className="mt-1 text-xs text-text-muted">Requested {createdDate}</p>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button
              variant="purple"
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
