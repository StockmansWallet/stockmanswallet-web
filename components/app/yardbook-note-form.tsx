"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pin, PinOff } from "lucide-react";
import { YardbookGloveboxAttachments } from "@/components/app/yardbook-glovebox-attachments";

interface YardbookNoteFormProps {
  note?: {
    id: string;
    title: string;
    body: string;
    is_pinned: boolean;
    linked_herd_ids: string[] | null;
    attachment_file_ids?: string[] | null;
  };
  herds: { id: string; name: string; head_count: number }[];
  action: (formData: FormData) => Promise<{ error: string } | void>;
  submitLabel: string;
}

export function YardbookNoteForm({ note, herds, action, submitLabel }: YardbookNoteFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [isPinned, setIsPinned] = useState(note?.is_pinned ?? false);
  const [selectedHerdIds, setSelectedHerdIds] = useState<Set<string>>(
    new Set(note?.linked_herd_ids ?? [])
  );

  const canSubmit = title.trim().length > 0 || body.trim().length > 0;

  function toggleHerd(id: string) {
    setSelectedHerdIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("linked_herd_ids", JSON.stringify(Array.from(selectedHerdIds)));
    if (isPinned) formData.set("is_pinned", "on");

    const result = await action(formData);
    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title + Pin */}
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <Input
            name="title"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="text-lg font-semibold"
          />
        </div>
        <button
          type="button"
          onClick={() => setIsPinned((v) => !v)}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors ${
            isPinned
              ? "border-yardbook/40 bg-yardbook/15 text-yardbook-light"
              : "border-white/[0.08] bg-white/[0.04] text-text-muted hover:bg-white/[0.06]"
          }`}
          aria-label={isPinned ? "Unpin note" : "Pin note"}
          aria-pressed={isPinned}
        >
          {isPinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
        </button>
      </div>

      {/* Body */}
      <textarea
        name="body"
        placeholder="Start typing…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={20000}
        rows={14}
        className="w-full resize-y rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-yardbook/40 focus:bg-white/[0.06] focus:outline-none"
      />

      {/* Linked herds */}
      {herds.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Link to herd (optional)
          </p>
          <div className="flex flex-wrap gap-2">
            {herds.map((herd) => {
              const selected = selectedHerdIds.has(herd.id);
              return (
                <button
                  key={herd.id}
                  type="button"
                  onClick={() => toggleHerd(herd.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    selected
                      ? "bg-yardbook/20 text-yardbook-light"
                      : "bg-white/[0.06] text-text-secondary hover:bg-white/[0.10]"
                  }`}
                  aria-pressed={selected}
                >
                  {herd.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <YardbookGloveboxAttachments initialFileIds={note?.attachment_file_ids ?? []} />

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          className="border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06]"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || !canSubmit} variant="yardbook">
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
