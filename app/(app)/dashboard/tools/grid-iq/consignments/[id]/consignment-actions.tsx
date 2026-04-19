// Consignment actions - client component for link kill sheet, complete sale, delete

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  linkKillSheet,
  completeSale,
  deleteConsignment,
} from "@/app/(app)/dashboard/tools/grid-iq/consignments/actions";
import { FileText, CheckCircle, Trash2, AlertCircle, Link2 } from "lucide-react";

interface ConsignmentActionsProps {
  consignmentId: string;
  status: string;
  hasKillSheet: boolean;
  // When a processor grid is attached, PostSaleFlow owns the link + complete
  // path; this component collapses to just the delete button.
  hasGrid: boolean;
  availableKillSheets: { id: string; label: string }[];
}

export function ConsignmentActions({
  consignmentId,
  status,
  hasKillSheet,
  hasGrid,
  availableKillSheets,
}: ConsignmentActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedKillSheetId, setSelectedKillSheetId] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  function handleLinkKillSheet() {
    if (!selectedKillSheetId) return;
    setError(null);
    startTransition(async () => {
      const result = await linkKillSheet(consignmentId, selectedKillSheetId);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function handleCompleteSale() {
    setError(null);
    startTransition(async () => {
      const result = await completeSale(consignmentId);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteConsignment(consignmentId);
      if (result.error) {
        setError(result.error);
      } else {
        router.push("/dashboard/tools/grid-iq/consignments");
      }
    });
  }

  return (
    <div className="mt-4 space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-error/10 px-4 py-3 text-sm text-error">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Link Kill Sheet + Complete Sale only render on legacy consignments
          without a grid attached. When a grid is attached, PostSaleFlow handles
          kill-sheet selection, analysis, allocation adjustment, and sale
          completion as one flow. */}
      {!hasGrid && !hasKillSheet && availableKillSheets.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="h-4 w-4 text-indigo-400" />
              <p className="text-sm font-semibold text-text-primary">Link Kill Sheet</p>
            </div>
            <div className="flex items-end gap-3">
              <div className="min-w-0 flex-1">
                <Select
                  id="killSheetId"
                  label="Kill Sheet"
                  placeholder="Select a kill sheet"
                  options={availableKillSheets.map((ks) => ({
                    value: ks.id,
                    label: ks.label,
                  }))}
                  value={selectedKillSheetId}
                  onChange={(e) => setSelectedKillSheetId(e.target.value)}
                />
              </div>
              <Button
                variant="indigo"
                size="sm"
                disabled={!selectedKillSheetId || isPending}
                onClick={handleLinkKillSheet}
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                {isPending ? "Linking..." : "Link"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!hasGrid && !showCompleteConfirm && (
        <div className="flex items-center gap-3">
          <Button
            variant="indigo"
            className="flex-1"
            disabled={isPending}
            onClick={() => setShowCompleteConfirm(true)}
          >
            <CheckCircle className="mr-1.5 h-4 w-4" />
            Complete Sale
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="border border-white/[0.08] bg-white/[0.04] text-text-muted hover:border-error/30 hover:bg-error/10 hover:text-error"
            onClick={() => setShowDeleteConfirm(true)}
            aria-label="Delete consignment"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!hasGrid && showCompleteConfirm && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-text-primary">Confirm Complete Sale</p>
            <p className="mt-1 text-xs text-text-muted">
              This will deduct head counts from allocated herds, create sale records,
              and mark this consignment as completed. This action cannot be undone.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Button
                variant="indigo"
                size="sm"
                disabled={isPending}
                onClick={handleCompleteSale}
              >
                {isPending ? "Processing..." : "Yes, Complete Sale"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="border border-white/[0.08] bg-white/[0.04] text-xs hover:bg-white/[0.06]"
                onClick={() => setShowCompleteConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete-only path when a grid is attached (PostSaleFlow owns complete).
          Sits below a divider and left-aligned so it doesn't visually compete
          with the primary Run Post-Kill Analysis / Confirm Sale CTA above. */}
      {hasGrid && (
        <div className="mt-8 flex border-t border-white/[0.06] pt-4">
          <Button
            variant="ghost"
            size="sm"
            className="border border-white/[0.08] bg-white/[0.04] text-text-muted hover:border-error/30 hover:bg-error/10 hover:text-error"
            onClick={() => setShowDeleteConfirm(true)}
            aria-label="Delete consignment"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete Consignment
          </Button>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-error">Delete Consignment?</p>
            <p className="mt-1 text-xs text-text-muted">
              This will remove the consignment record. Linked kill sheets and analyses will not be affected.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Button
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={handleDelete}
              >
                {isPending ? "Deleting..." : "Delete"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="border border-white/[0.08] bg-white/[0.04] text-xs hover:bg-white/[0.06]"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
