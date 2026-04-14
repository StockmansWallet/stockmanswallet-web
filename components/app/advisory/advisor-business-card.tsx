"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Mail, Phone, Building2, Calendar, Trash2, Info, X } from "lucide-react";
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

const cardFace = "absolute inset-0 overflow-hidden rounded-2xl border border-white/[0.08] shadow-lg shadow-black/20";
const frontGradient = "bg-gradient-to-b from-white/[0.05] to-transparent";
const backGradient = "bg-gradient-to-b from-white/[0.03] to-transparent";

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
        className="select-none"
        style={{ perspective: "1000px" }}
      >
        <div
          className="relative h-[210px] transition-transform duration-500 ease-out"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* ---- FRONT ---- */}
          <Link
            href={`/dashboard/advisory-hub/my-advisors/${connection.id}`}
            className={`${cardFace} ${frontGradient} block cursor-pointer transition-colors hover:border-white/[0.12]`}
            style={{ backfaceVisibility: "hidden" }}
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
                    className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white/10"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2F8CD9]/15 ring-2 ring-white/10">
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

              {/* Contact details + info button */}
              <div className="flex items-end justify-between">
                <div className="space-y-1">
                  {connection.requester_company && (
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <Building2 className="h-3 w-3 shrink-0 text-text-muted" />
                      <span className="truncate">{connection.requester_company}</span>
                    </div>
                  )}
                  {advisorEmail && (
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <Mail className="h-3 w-3 shrink-0 text-text-muted" />
                      <span className="truncate">{advisorEmail}</span>
                    </div>
                  )}
                  {advisorPhone && (
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <Phone className="h-3 w-3 shrink-0 text-text-muted" />
                      {advisorPhone}
                    </div>
                  )}
                </div>

                {/* Settings (i) button */}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFlipped(true); }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-text-muted transition-colors hover:bg-white/[0.15] hover:text-text-secondary"
                  aria-label="Settings"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </Link>

          {/* ---- BACK ---- */}
          <div
            className={`${cardFace} ${backGradient} cursor-pointer`}
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
            onClick={() => setFlipped(false)}
          >
            <div className="flex h-full flex-col justify-between p-5">
              {/* Header */}
              <h3 className="text-sm font-bold text-text-primary">{connection.requester_name}</h3>

              {/* Data sharing row: label left, toggle right */}
              <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                <span className="text-sm text-text-primary">Data sharing</span>
                <Switch
                  id={`sharing-${connection.id}`}
                  checked={isSharing}
                  onChange={handleToggleSharing}
                  disabled={loading}
                  color="green"
                />
              </div>

              {/* Connected date + remove */}
              <div className="flex items-end justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <Calendar className="h-3 w-3 shrink-0" />
                    Connected {connectedDate}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowRemove(true)}
                      disabled={loading}
                      className="gap-1.5"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove Advisor
                    </Button>
                  </div>
                </div>

                {/* Close button */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFlipped(false); }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-text-muted transition-colors hover:bg-white/[0.15] hover:text-text-secondary"
                  aria-label="Close settings"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
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
