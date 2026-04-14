"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Mail, Phone, Building2, Calendar, Trash2 } from "lucide-react";
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
  avatarUrl?: string | null;
}

export function AdvisorBusinessCard({ connection, advisorEmail, advisorPhone, avatarUrl }: AdvisorBusinessCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRemove, setShowRemove] = useState(false);
  const categoryConfig = getCategoryConfig(connection.requester_role);
  const isSharing = hasActivePermission(connection);

  const initials = connection.requester_name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const connectedDate = new Date(connection.created_at).toLocaleDateString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
  });

  const handleToggleSharing = async (checked: boolean) => {
    setLoading(true);
    if (checked) { await grantDataAccess(connection.id); }
    else { await stopSharing(connection.id); }
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
        className="cursor-pointer"
        style={{ perspective: "1000px" }}
      >
        <div
          className="relative h-[210px] transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* ---- FRONT ---- */}
          <Card
            className="absolute inset-0 overflow-hidden"
            style={{ backfaceVisibility: "hidden" }}
            onClick={() => setFlipped(true)}
          >
            <div className="flex h-full flex-col justify-between p-5">
              {/* Top: avatar + name + badges */}
              <div className="flex items-start gap-3">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={connection.requester_name}
                    width={44}
                    height={44}
                    className="h-11 w-11 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2F8CD9]/15">
                    <span className="text-sm font-bold text-[#2F8CD9]">{initials}</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-text-primary">{connection.requester_name}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {categoryConfig && <Badge variant="default">{categoryConfig.label}</Badge>}
                    <Badge variant={isSharing ? "success" : "default"}>
                      {isSharing ? "Sharing" : "Not sharing"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Middle: contact details */}
              <div className="space-y-1">
                {connection.requester_company && (
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <Building2 className="h-3 w-3 shrink-0 text-text-muted" />
                    <span className="truncate">{connection.requester_company}</span>
                  </div>
                )}
                {advisorEmail && (
                  <a
                    href={`mailto:${advisorEmail}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 text-xs text-[#2F8CD9] transition-colors hover:text-[#5AA8E8]"
                  >
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{advisorEmail}</span>
                  </a>
                )}
                {advisorPhone && (
                  <a
                    href={`tel:${advisorPhone.replace(/\s/g, "")}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 text-xs text-[#2F8CD9] transition-colors hover:text-[#5AA8E8]"
                  >
                    <Phone className="h-3 w-3 shrink-0" />
                    {advisorPhone}
                  </a>
                )}
              </div>

              {/* Bottom hint */}
              <p className="text-center text-[10px] text-text-muted/40">Tap for settings</p>
            </div>
          </Card>

          {/* ---- BACK ---- */}
          <Card
            className="absolute inset-0 overflow-hidden"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
            onClick={() => setFlipped(false)}
          >
            <div className="flex h-full flex-col justify-between p-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-text-primary">{connection.requester_name}</h3>
                <span className="text-[10px] text-text-muted/40">Tap to flip back</span>
              </div>

              {/* Settings */}
              <div className="space-y-3">
                <Switch
                  id={`sharing-${connection.id}`}
                  checked={isSharing}
                  onChange={handleToggleSharing}
                  disabled={loading}
                  color="green"
                  label="Data sharing"
                />

                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Calendar className="h-3 w-3 shrink-0" />
                  Connected {connectedDate}
                </div>

                <Link
                  href={`/dashboard/advisory-hub/my-advisors/${connection.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center rounded-lg bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-low hover:text-text-primary"
                >
                  View details
                </Link>
              </div>

              {/* Remove */}
              <Button
                variant="destructive"
                size="sm"
                onClick={(e) => { e.stopPropagation(); setShowRemove(true); }}
                disabled={loading}
                className="w-full gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove Advisor
              </Button>
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
