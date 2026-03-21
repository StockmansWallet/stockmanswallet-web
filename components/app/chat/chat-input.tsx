"use client";

import { useState, useRef, useCallback } from "react";
import { ArrowUp, Loader2, Mic } from "lucide-react";

interface ChatInputProps {
  onSend: (text: string) => void | Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  accentClass?: string;
  /** Called on each keystroke - use for typing indicator broadcast */
  onTyping?: () => void;
  /** Whether voice input is currently active */
  isListening?: boolean;
  /** Called when mic button is tapped */
  onMicTap?: () => void;
  /** Whether the browser supports speech recognition */
  micSupported?: boolean;
  /** Live transcript to display while listening */
  liveTranscript?: string;
}

export function ChatInput({
  onSend,
  placeholder = "Write a message...",
  disabled = false,
  loading = false,
  accentClass = "bg-purple-500 hover:bg-purple-600",
  onTyping,
  isListening = false,
  onMicTap,
  micSupported = false,
  liveTranscript,
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

  // Display live transcript in the textarea while listening
  const displayValue = isListening && liveTranscript ? liveTranscript : value;

  return (
    <div className="flex items-center gap-2">
      {/* Input field with send button inside */}
      <div className="flex min-h-[44px] flex-1 items-center rounded-[22px] border border-white/10 bg-white/5 pl-4 pr-1.5 transition-colors focus-within:border-white/20 focus-within:bg-white/[0.08]">
        <textarea
          ref={textareaRef}
          value={displayValue}
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
          placeholder={isListening ? "Listening..." : placeholder}
          disabled={disabled || loading || isListening}
          rows={1}
          className="max-h-[120px] flex-1 resize-none bg-transparent py-2.5 text-sm leading-5 text-text-primary placeholder:text-text-muted outline-none disabled:opacity-50"
        />

        {/* Send button - only visible when there is text */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || loading || !hasText}
          className={`ml-2 flex h-8 shrink-0 items-center justify-center rounded-full px-4 text-white transition-all ${accentClass} ${
            hasText ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
          }`}
          aria-label="Send message"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
          )}
        </button>
      </div>

      {/* Mic button - only shown when browser supports Web Speech API */}
      {micSupported && onMicTap && (
        <button
          type="button"
          onClick={onMicTap}
          disabled={disabled || loading}
          className={`flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full transition-all ${
            isListening
              ? `${accentClass} text-white animate-pulse`
              : "bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-secondary border border-white/10"
          }`}
          aria-label={isListening ? "Stop listening" : "Voice input"}
        >
          <Mic className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
