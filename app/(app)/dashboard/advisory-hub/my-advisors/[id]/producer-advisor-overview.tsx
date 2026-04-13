"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, Calendar, Shield, Trash2, EyeOff, Eye, Building2 } from "lucide-react";
import { stopSharing, grantDataAccess, disconnectAdvisor } from "../actions";
import { ConfirmModal } from "@/components/app/advisory/confirm-modal";
import { useRouter } from "next/navigation";

interface ProducerAdvisorOverviewProps {
  advisorName: string;
  advisorCompany?: string | null;
  advisorState?: string | null;
  advisorRegion?: string | null;
  advisorBio?: string | null;
  advisorEmail?: string | null;
  advisorPhone?: string | null;
  connectedDate: string;
  isActive: boolean;
  connectionId: string;
}

export function ProducerAdvisorOverview({
  advisorName,
  advisorCompany,
  advisorState,
  advisorRegion,
  advisorBio,
  advisorEmail,
  advisorPhone,
  connectedDate,
  isActive,
  connectionId,
}: ProducerAdvisorOverviewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showRemove, setShowRemove] = useState(false);

  const handleToggleSharing = async () => {
    setLoading(true);
    if (isActive) {
      await stopSharing(connectionId);
    } else {
      await grantDataAccess(connectionId);
    }
    setLoading(false);
  };

  const handleRemove = async () => {
    setLoading(true);
    await disconnectAdvisor(connectionId);
    setLoading(false);
    router.push("/dashboard/advisory-hub/my-advisors");
  };

  return (
    <div className="space-y-4">
      {/* Connection status */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Shield className={`h-5 w-5 ${isActive ? "text-emerald-400" : "text-text-muted"}`} />
            <div>
              <p className="text-sm font-semibold text-text-primary">
                {isActive ? "Data sharing is active" : "Data sharing is paused"}
              </p>
              <p className="text-xs text-text-muted">
                {isActive
                  ? "Your advisor can view the data categories you have enabled."
                  : "Your advisor cannot view any of your data."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <Calendar className="h-3.5 w-3.5" />
            Connected {connectedDate}
          </div>
        </CardContent>
      </Card>

      {/* Advisor details */}
      <Card>
        <CardContent className="space-y-4 p-5">
          {advisorCompany && (
            <div className="flex items-center gap-2.5 text-sm text-text-secondary">
              <Building2 className="h-4 w-4 text-text-muted" />
              {advisorCompany}
            </div>
          )}
          {advisorState && (
            <div className="flex items-center gap-2.5 text-sm text-text-secondary">
              <MapPin className="h-4 w-4 text-text-muted" />
              {advisorState}{advisorRegion ? `, ${advisorRegion}` : ""}
            </div>
          )}
          {advisorBio && (
            <p className="text-sm leading-relaxed text-text-secondary">{advisorBio}</p>
          )}
          {(advisorEmail || advisorPhone) && (
            <div className="flex flex-wrap items-center gap-3">
              {advisorEmail && (
                <a
                  href={`mailto:${advisorEmail}`}
                  className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-sm text-[#2F8CD9] transition-colors hover:bg-white/[0.06]"
                >
                  <Mail className="h-4 w-4" />
                  {advisorEmail}
                </a>
              )}
              {advisorPhone && (
                <a
                  href={`tel:${advisorPhone.replace(/\s/g, "")}`}
                  className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-sm text-[#2F8CD9] transition-colors hover:bg-white/[0.06]"
                >
                  <Phone className="h-4 w-4" />
                  {advisorPhone}
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <Button
            variant={isActive ? "ghost" : "teal"}
            size="sm"
            onClick={handleToggleSharing}
            disabled={loading}
            className="gap-1.5"
          >
            {isActive ? (
              <><EyeOff className="h-4 w-4" /> Stop Sharing</>
            ) : (
              <><Eye className="h-4 w-4" /> Start Sharing</>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRemove(true)}
            disabled={loading}
            className="gap-1.5 text-red-400/70 hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" /> Remove Advisor
          </Button>
        </CardContent>
      </Card>

      <ConfirmModal
        open={showRemove}
        onClose={() => setShowRemove(false)}
        onConfirm={handleRemove}
        title="Remove Advisor"
        description={`This will remove ${advisorName} from your advisors and stop all data sharing. They will need to send a new request to reconnect.`}
        confirmLabel="Remove"
        loading={loading}
      />
    </div>
  );
}
