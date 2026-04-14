"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Mail, Phone, MapPin, Building2, Calendar, Trash2 } from "lucide-react";
import { grantDataAccess, stopSharing, disconnectAdvisor } from "@/app/(app)/dashboard/advisory-hub/my-advisors/actions";
import { ConfirmModal } from "@/components/app/advisory/confirm-modal";
import {
  getCategoryConfig,
  hasActivePermission,
  type ConnectionRequest,
} from "@/lib/types/advisory";

interface AdvisorBusinessCardProps {
  connection: ConnectionRequest;
  advisorEmail?: string | null;
  advisorPhone?: string | null;
}

export function AdvisorBusinessCard({ connection, advisorEmail, advisorPhone }: AdvisorBusinessCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRemove, setShowRemove] = useState(false);
  const categoryConfig = getCategoryConfig(connection.requester_role);
  const isSharing = hasActivePermission(connection);

  const connectedDate = new Date(connection.created_at).toLocaleDateString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
  });

  const handleToggleSharing = async (checked: boolean) => {
    setLoading(true);
    if (checked) {
      await grantDataAccess(connection.id);
    } else {
      await stopSharing(connection.id);
    }
    setLoading(false);
  };

  const handleRemove = async () => {
    setLoading(true);
    await disconnectAdvisor(connection.id);
    setLoading(false);
    setShowRemove(false);
  };

  return (
    <>
      <div
        className="group cursor-pointer"
        style={{ perspective: "1000px" }}
      >
        <div
          className="relative transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front of card */}
          <Card
            className="relative"
            style={{ backfaceVisibility: "hidden" }}
            onClick={() => setFlipped(true)}
          >
            <div className="p-5">
              {/* Top row: name + role */}
              <div className="mb-3 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-text-primary">
                    {connection.requester_name}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {categoryConfig && (
                      <Badge variant="default">{categoryConfig.label}</Badge>
                    )}
                    <Badge variant={isSharing ? "success" : "default"}>
                      {isSharing ? "Sharing" : "Not sharing"}
                    </Badge>
                  </div>
                </div>
                {categoryConfig && (
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${categoryConfig.bgClass}`}>
                    <categoryConfig.icon className={`h-5 w-5 ${categoryConfig.colorClass}`} />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-1.5">
                {connection.requester_company && (
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                    {connection.requester_company}
                  </div>
                )}
                {advisorEmail && (
                  <a
                    href={`mailto:${advisorEmail}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 text-sm text-[#2F8CD9] transition-colors hover:text-[#5AA8E8]"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{advisorEmail}</span>
                  </a>
                )}
                {advisorPhone && (
                  <a
                    href={`tel:${advisorPhone.replace(/\s/g, "")}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 text-sm text-[#2F8CD9] transition-colors hover:text-[#5AA8E8]"
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {advisorPhone}
                  </a>
                )}
              </div>

              {/* Footer hint */}
              <p className="mt-3 text-center text-[10px] text-text-muted/50">
                Tap for settings
              </p>
            </div>
          </Card>

          {/* Back of card */}
          <Card
            className="absolute inset-0"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
            onClick={() => setFlipped(false)}
          >
            <div className="flex h-full flex-col p-5">
              {/* Header */}
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-text-primary">
                  {connection.requester_name}
                </h3>
                <p className="text-[10px] text-text-muted/50">Tap to flip back</p>
              </div>

              {/* Settings */}
              <div className="flex-1 space-y-4">
                <Switch
                  id={`sharing-${connection.id}`}
                  checked={isSharing}
                  onChange={handleToggleSharing}
                  disabled={loading}
                  color="green"
                  label="Data sharing"
                  description={isSharing ? "Your advisor can view shared data." : "No data is being shared."}
                />

                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  Connected {connectedDate}
                </div>

                <Link
                  href={`/dashboard/advisory-hub/my-advisors/${connection.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 rounded-lg bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-low hover:text-text-primary"
                >
                  View details
                </Link>
              </div>

              {/* Remove */}
              <div className="mt-4 border-t border-white/[0.06] pt-3">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setShowRemove(true); }}
                  disabled={loading}
                  className="gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove Advisor
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmModal
        open={showRemove}
        onClose={() => setShowRemove(false)}
        onConfirm={handleRemove}
        title="Remove Advisor"
        description={`This will remove ${connection.requester_name} from your advisors and stop all data sharing. They will need to send a new request to reconnect.`}
        confirmLabel="Remove"
        loading={loading}
      />
    </>
  );
}
