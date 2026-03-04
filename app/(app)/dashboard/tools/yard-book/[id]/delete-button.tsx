"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { deleteYardBookItem } from "../actions";

export function DeleteYardBookItemButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteYardBookItem(id);
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete Item"
        size="sm"
      >
        <p className="mb-6 text-sm text-text-secondary">
          Are you sure you want to delete <strong>{title}</strong>? This action
          cannot be undone.
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
            {deleting ? "Deleting..." : "Delete Item"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
