"use client";

import { useState, useTransition } from "react";
import type { ConnectionRequest } from "@/lib/types/advisory";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Copy, Loader2, AlertCircle } from "lucide-react";
import {
  duplicateClientHerds,
  fetchClientHerdPreview,
} from "@/app/(app)/dashboard/advisor/simulator/actions";

interface DuplicateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connections: ConnectionRequest[];
  clientProfiles: {
    user_id: string;
    display_name: string;
    property_name: string | null;
  }[];
}

export function DuplicateClientDialog({
  open,
  onOpenChange,
  connections,
  clientProfiles,
}: DuplicateClientDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sandboxName, setSandboxName] = useState("");
  const [preview, setPreview] = useState<{
    herdCount: number;
    totalHead: number;
  } | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function profileFor(userId: string) {
    return clientProfiles.find((p) => p.user_id === userId);
  }

  async function selectClient(userId: string) {
    setSelectedUserId(userId);
    setError(null);
    setPreview(null);

    const profile = profileFor(userId);
    if (profile && !sandboxName) {
      setSandboxName(`${profile.display_name} - Sandbox`);
    }

    setIsFetching(true);
    const result = await fetchClientHerdPreview(userId);
    setIsFetching(false);

    if ("error" in result) {
      setError(result.error ?? "Failed to fetch client herds");
    } else {
      setPreview(result);
      if (result.herdCount === 0) {
        setError("This client has no herds to duplicate.");
      }
    }
  }

  function handleDuplicate() {
    if (!selectedUserId || !sandboxName.trim()) return;
    startTransition(async () => {
      const result = await duplicateClientHerds(selectedUserId, sandboxName);
      if ("error" in result) {
        setError(result.error ?? "Failed to duplicate");
      } else {
        resetAndClose();
      }
    });
  }

  function resetAndClose() {
    setSelectedUserId(null);
    setSandboxName("");
    setPreview(null);
    setError(null);
    onOpenChange(false);
  }

  return (
    <Modal open={open} onClose={resetAndClose} title="Duplicate Client Data" size="sm">
      <div className="space-y-5">
        {/* Client picker */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[#FF5722]">Select Client</label>
          {connections.length === 0 ? (
            <p className="text-sm text-text-muted">
              No clients with active permissions.
            </p>
          ) : (
            <div className="space-y-1">
              {connections.map((conn) => {
                const profile = profileFor(conn.target_user_id);
                const name =
                  profile?.display_name ?? conn.requester_name ?? "Unknown";
                const propertyName = profile?.property_name;
                const isSelected = selectedUserId === conn.target_user_id;

                return (
                  <button
                    key={conn.id}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? "border-[#FF5722]/50 bg-[#FF5722]/10"
                        : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                    }`}
                    onClick={() => selectClient(conn.target_user_id)}
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {name}
                      </p>
                      {propertyName && (
                        <p className="text-xs text-text-muted">
                          {propertyName}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="h-5 w-5 text-[#FF5722]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sandbox name */}
        <div className="space-y-2">
          <label htmlFor="sandbox-name" className="text-sm font-medium text-[#FF5722]">
            Sandbox Property Name
          </label>
          <Input
            id="sandbox-name"
            value={sandboxName}
            onChange={(e) => setSandboxName(e.target.value)}
            placeholder="e.g. John Smith - Sandbox"
            className="border-zinc-700 bg-zinc-900"
          />
        </div>

        {/* Loading preview */}
        {isFetching && (
          <div className="flex items-center gap-2 text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin text-[#FF5722]" />
            <span className="text-sm">Fetching client herds...</span>
          </div>
        )}

        {/* Preview */}
        {preview && preview.herdCount > 0 && (
          <div className="flex items-center gap-3 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2.5">
            <Copy className="h-4 w-4 text-[#FF5722]" />
            <div>
              <p className="text-sm font-medium text-text-primary">
                {preview.herdCount} herd{preview.herdCount !== 1 ? "s" : ""} to clone
              </p>
              <p className="text-xs text-text-muted">
                {preview.totalHead} total head
              </p>
            </div>
            <CheckCircle2 className="ml-auto h-5 w-5 text-green-400" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-orange-500/30 bg-orange-500/10 px-3 py-2.5">
            <AlertCircle className="h-4 w-4 text-orange-400" />
            <span className="text-sm text-text-muted">{error}</span>
          </div>
        )}

        {/* Info */}
        <p className="text-xs text-text-muted">
          Herds will be copied into a new simulated property. The original data
          is never modified.
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={resetAndClose}
            className="text-text-muted"
          >
            Cancel
          </Button>
          <Button
            className="bg-[#FF5722] text-white hover:bg-[#FF5722]/90"
            disabled={
              !selectedUserId ||
              !sandboxName.trim() ||
              isPending ||
              !preview ||
              preview.herdCount === 0
            }
            onClick={handleDuplicate}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Duplicating...
              </>
            ) : (
              "Duplicate"
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
