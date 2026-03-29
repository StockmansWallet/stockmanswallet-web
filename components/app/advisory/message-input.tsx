"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import type { MessageType } from "@/lib/types/advisory";

interface MessageInputProps {
  onSend: (content: string, type: MessageType) => Promise<{ error?: string; success?: boolean }>;
  hideTypeSelector?: boolean;
  placeholder?: string;
}

const typeOptions: { value: MessageType; label: string }[] = [
  { value: "general_note", label: "Note" },
  { value: "review_request", label: "Review Request" },
  { value: "renewal_request", label: "Renewal Request" },
  { value: "access_request", label: "Access Request" },
];

export function MessageInput({ onSend, hideTypeSelector, placeholder = "Write a note..." }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("general_note");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    const result = await onSend(trimmed, messageType);
    if (result?.error) {
      setError(result.error);
    } else {
      setContent("");
      setMessageType("general_note");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {!hideTypeSelector && (
        <div className="flex items-center gap-2">
          <select
            value={messageType}
            onChange={(e) => setMessageType(e.target.value as MessageType)}
            className="rounded-lg border border-white/10 bg-surface-raised px-2.5 py-1.5 text-xs text-text-secondary outline-none focus:border-[#2F8CD9]/50"
          >
            {typeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex items-end gap-2">
        <div className="flex flex-1 items-end rounded-2xl border border-white/10 bg-surface-raised px-3 py-2">
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              // Auto-resize
              const el = e.target;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={placeholder}
            rows={1}
            className="max-h-[120px] flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
        </div>
        <Button
          type="submit"
          variant="purple"
          disabled={loading || !content.trim()}
          className="!p-0 h-10 w-10 shrink-0 rounded-full"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}
