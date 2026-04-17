"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { deleteHerd } from "../actions";

export function DeleteHerdButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteHerd(id);
    if (result?.error) {
      setDeleting(false);
      setOpen(false);
    }
  }

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Delete
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Delete Herd" size="sm">
        <p className="mb-6 text-sm text-text-secondary">
          Are you sure you want to delete <strong>{name}</strong>? This will
          also remove all associated muster, health, and sales records.
        </p>
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            className="border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06]"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete Herd"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
