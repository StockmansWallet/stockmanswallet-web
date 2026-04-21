"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Mail, Phone, MapPin, Calendar, Trash2, Building2 } from "lucide-react";
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

  const hasDetails = advisorCompany || advisorState || advisorBio || advisorEmail || advisorPhone;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Left: Advisor details */}
        <Card>
          <CardContent className="p-5">
            {hasDetails ? (
              <div className="space-y-3">
                {advisorCompany && (
                  <div className="text-text-secondary flex items-center gap-2.5 text-sm">
                    <Building2 className="text-text-muted h-4 w-4 shrink-0" />
                    {advisorCompany}
                  </div>
                )}
                {advisorState && (
                  <div className="text-text-secondary flex items-center gap-2.5 text-sm">
                    <MapPin className="text-text-muted h-4 w-4 shrink-0" />
                    {advisorState}
                    {advisorRegion ? `, ${advisorRegion}` : ""}
                  </div>
                )}
                {advisorBio && (
                  <p className="text-text-muted text-sm leading-relaxed">{advisorBio}</p>
                )}
                {advisorEmail && (
                  <a
                    href={`mailto:${advisorEmail}`}
                    className="text-advisor hover:text-advisor-light flex items-center gap-2.5 text-sm transition-colors"
                  >
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{advisorEmail}</span>
                  </a>
                )}
                {advisorPhone && (
                  <a
                    href={`tel:${advisorPhone.replace(/\s/g, "")}`}
                    className="text-advisor hover:text-advisor-light flex items-center gap-2.5 text-sm transition-colors"
                  >
                    <Phone className="h-4 w-4 shrink-0" />
                    {advisorPhone}
                  </a>
                )}
              </div>
            ) : (
              <p className="text-text-muted text-sm">No details shared by this advisor.</p>
            )}
          </CardContent>
        </Card>

        {/* Right: Sharing + connection info */}
        <Card>
          <CardContent className="p-5">
            <div className="space-y-4">
              <Switch
                id="data-sharing"
                checked={isActive}
                onChange={handleToggleSharing}
                disabled={loading}
                color="green"
                label="Data sharing"
                description={
                  isActive
                    ? "Your advisor can view the data categories you have enabled."
                    : "Your advisor cannot view any of your data."
                }
              />
              <div className="text-text-muted flex items-center gap-2.5 border-t border-white/[0.06] pt-3 text-xs">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                Connected {connectedDate}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Remove advisor */}
      <div className="pt-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowRemove(true)}
          disabled={loading}
          className="gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove Advisor
        </Button>
      </div>

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
