"use client";

import { useState } from "react";
import { Pencil, Loader2, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface EditableProcessorNameProps {
  recordId: string;
  table: "processor_grids" | "kill_sheet_records" | "grid_iq_analyses";
  column?: string;
  initialName: string;
}

export function EditableProcessorName({
  recordId,
  table,
  column,
  initialName,
}: EditableProcessorNameProps) {
  const [name, setName] = useState(initialName);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === name) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from(table)
        .update({ [column ?? (table === "processor_grids" ? "grid_name" : "record_name")]: trimmed })
        .eq("id", recordId);

      if (error) throw error;
      setName(trimmed);
      setIsEditing(false);
    } catch {
      // Revert on error
      setDraft(name);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") {
              setDraft(name);
              setIsEditing(false);
            }
          }}
          autoFocus
          disabled={isSaving}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-2xl font-bold text-teal-400 outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/25 disabled:opacity-50"
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-lg p-1.5 text-teal-400 hover:bg-teal-500/10 disabled:opacity-50"
          title="Save"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={() => {
            setDraft(name);
            setIsEditing(false);
          }}
          disabled={isSaving}
          className="rounded-lg p-1.5 text-text-muted hover:bg-white/5 hover:text-text-primary disabled:opacity-50"
          title="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(name);
        setIsEditing(true);
      }}
      className="group flex items-center gap-2 text-left"
      title="Click to rename"
    >
      <span className="text-2xl font-bold text-teal-400">{name}</span>
      <Pencil className="h-3.5 w-3.5 text-text-muted/50 transition-colors group-hover:text-teal-400" />
    </button>
  );
}
