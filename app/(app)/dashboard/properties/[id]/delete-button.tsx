"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { deleteProperty } from "../actions";

export function DeletePropertyButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteProperty(id);
    if (result?.error) {
      setDeleting(false);
      setOpen(false);
    }
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Delete
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Delete Property" size="sm">
        <p className="mb-6 text-sm text-text-secondary">
          Are you sure you want to delete <strong>{name}</strong>? Herds
          assigned to this property will be unlinked but not deleted.
        </p>
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete Property"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
