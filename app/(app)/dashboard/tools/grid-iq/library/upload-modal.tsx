"use client";

import { Modal } from "@/components/ui/modal";
import { GridIQUploader } from "../upload/grid-iq-uploader";

interface Props {
  open: boolean;
  initialType: "grid" | "killsheet";
  onClose: () => void;
}

export function UploadModal({ open, initialType, onClose }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialType === "grid" ? "Upload Grid" : "Upload Kill Sheet"}
      size="lg"
    >
      <GridIQUploader initialType={initialType} />
    </Modal>
  );
}
