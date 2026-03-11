"use client";

import { useState, useRef, useCallback } from "react";
import { Send, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSend: (text: string) => void | Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  accentClass?: string;
  /** Called on each keystroke - use for typing indicator broadcast */
  onTyping?: () => void;
}

export function ChatInput({
  onSend,
  placeholder = "Write a message...",
  disabled = false,
  loading = false,
  accentClass = "bg-purple-500 hover:bg-purple-600",
  onTyping,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resetHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || loading) return;

    setValue("");
    resetHeight();
    await onSend(trimmed);
  }, [value, disabled, loading, onSend, resetHeight]);

  return (
    <div className="flex items-end gap-2">
      <div className="flex flex-1 items-end rounded-full border border-white/10 bg-white/5 px-4 py-2.5 transition-colors focus-within:border-white/20 focus-within:bg-white/[0.08]">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            onTyping?.();
            const el = e.target;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={placeholder}
          disabled={disabled || loading}
          rows={1}
          className="max-h-[120px] flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none disabled:opacity-50"
        />
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || loading || !value.trim()}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${accentClass}`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
