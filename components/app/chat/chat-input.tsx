"use client";

import { useState, useRef, useCallback } from "react";
import { ArrowUp, Loader2, Volume2, VolumeX } from "lucide-react";

interface ChatInputProps {
  onSend: (text: string) => void | Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  accentClass?: string;
  /** Called on each keystroke - use for typing indicator broadcast */
  onTyping?: () => void;
  /** Voice toggle state */
  voiceEnabled?: boolean;
  /** Called when the voice button is toggled */
  onVoiceToggle?: () => void;
}

export function ChatInput({
  onSend,
  placeholder = "Write a message...",
  disabled = false,
  loading = false,
  accentClass = "bg-purple-500 hover:bg-purple-600",
  onTyping,
  voiceEnabled = false,
  onVoiceToggle,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasText = value.trim().length > 0;

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
      {/* Input field with send button inside */}
      <div className="flex flex-1 items-end rounded-[22px] border border-white/10 bg-white/5 px-4 py-2 transition-colors focus-within:border-white/20 focus-within:bg-white/[0.08]">
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

        {/* Send button - short pill, only visible when there is text */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || loading || !hasText}
          className={`ml-2 flex h-[30px] shrink-0 items-center justify-center rounded-full px-3 text-white transition-all ${accentClass} ${
            hasText ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
          }`}
          style={{ minWidth: "36px" }}
          aria-label="Send message"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
          )}
        </button>
      </div>

      {/* Voice toggle button */}
      {onVoiceToggle && (
        <button
          type="button"
          onClick={onVoiceToggle}
          className={`flex h-[30px] shrink-0 items-center justify-center rounded-full px-3 transition-all ${
            voiceEnabled
              ? `${accentClass} text-white`
              : "bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-secondary border border-white/10"
          }`}
          style={{ minWidth: "36px" }}
          aria-label={voiceEnabled ? "Disable voice" : "Enable voice"}
        >
          {voiceEnabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );
}
