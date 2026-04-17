"use client";

import { Modal } from "@/components/ui/modal";
import { GridIQUploader } from "@/components/grid-iq/uploader";

interface Props {
  open: boolean;
  initialType: "grid" | "killsheet";
  onClose: () => void;
  // When opened from a flow that already knows the processor (eg. the
  // Analyse Step 2 picker), pre-select the linked processor so the user
  // doesn't choose it twice.
  defaultProcessorId?: string | null;
}

export function UploadModal({
  open,
  initialType,
  onClose,
  defaultProcessorId,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialType === "grid" ? "Upload Grid" : "Upload Kill Sheet"}
      size="lg"
    >
      <GridIQUploader
        initialType={initialType}
        onSaved={onClose}
        defaultProcessorId={defaultProcessorId ?? null}
      />
    </Modal>
  );
}
