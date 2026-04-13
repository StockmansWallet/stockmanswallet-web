"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Calendar, Shield, Trash2, EyeOff, Eye } from "lucide-react";
import { stopSharing, grantDataAccess, disconnectAdvisor } from "../actions";
import { ConfirmModal } from "@/components/app/advisory/confirm-modal";
import { useRouter } from "next/navigation";

interface ProducerAdvisorOverviewProps {
  advisorName: string;
  advisorEmail?: string | null;
  advisorPhone?: string | null;
  connectedDate: string;
  isActive: boolean;
  connectionId: string;
}

export function ProducerAdvisorOverview({
  advisorName,
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
      {/* Two-column grid: sharing status + contact */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Data sharing status + toggle */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Shield className={`mt-0.5 h-5 w-5 shrink-0 ${isActive ? "text-emerald-400" : "text-text-muted"}`} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-primary">
                  {isActive ? "Data sharing is active" : "Data sharing is paused"}
                </p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {isActive
                    ? "Your advisor can view the data categories you have enabled."
                    : "Your advisor cannot view any of your data."}
                </p>
                <Button
                  variant={isActive ? "ghost" : "teal"}
                  size="sm"
                  onClick={handleToggleSharing}
                  disabled={loading}
                  className="mt-3 gap-1.5"
                >
                  {isActive ? (
                    <><EyeOff className="h-3.5 w-3.5" /> Stop Sharing</>
                  ) : (
                    <><Eye className="h-3.5 w-3.5" /> Start Sharing</>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact + connection info */}
        <Card>
          <CardContent className="p-5">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 text-xs text-text-muted">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                Connected {connectedDate}
              </div>

              {advisorEmail && (
                <a
                  href={`mailto:${advisorEmail}`}
                  className="flex items-center gap-2.5 text-sm text-[#2F8CD9] transition-colors hover:text-[#5AA8E8]"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{advisorEmail}</span>
                </a>
              )}
              {advisorPhone && (
                <a
                  href={`tel:${advisorPhone.replace(/\s/g, "")}`}
                  className="flex items-center gap-2.5 text-sm text-[#2F8CD9] transition-colors hover:text-[#5AA8E8]"
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  {advisorPhone}
                </a>
              )}

              {!advisorEmail && !advisorPhone && (
                <p className="text-xs text-text-muted">No contact details shared.</p>
              )}
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
