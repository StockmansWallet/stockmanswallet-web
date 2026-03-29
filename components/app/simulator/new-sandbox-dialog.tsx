"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { createSandboxProperty } from "@/app/(app)/dashboard/advisor/simulator/actions";

interface NewSandboxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewSandboxDialog({ open, onOpenChange }: NewSandboxDialogProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await createSandboxProperty(name);
      if ("error" in result) {
        setError(result.error ?? "Failed to create property");
      } else {
        setName("");
        setError(null);
        onOpenChange(false);
      }
    });
  }

  function handleClose() {
    setName("");
    setError(null);
    onOpenChange(false);
  }

  return (
    <Modal open={open} onClose={handleClose} title="New Sandbox Property" size="sm">
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="prop-name" className="text-sm font-medium text-[#FF5722]">
            Property Name
          </label>
          <Input
            id="prop-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Test Property"
            className="border-zinc-700 bg-zinc-900"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <p className="text-xs text-text-muted">
          Creates a simulated property for sandbox testing.
        </p>

        <div className="flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="text-text-muted"
          >
            Cancel
          </Button>
          <Button
            className="bg-[#FF5722] text-white hover:bg-[#FF5722]/90"
            disabled={!name.trim() || isPending}
            onClick={handleCreate}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create
          </Button>
        </div>
      </div>
    </Modal>
  );
}
