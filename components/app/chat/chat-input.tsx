"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ArrowUp, Loader2, Mic } from "lucide-react";

interface ChatInputProps {
  onSend: (text: string) => void | Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  accentClass?: string;
  /** Called on each keystroke - use for typing indicator broadcast */
  onTyping?: () => void;
  /**
   * Called when the local user has explicitly stopped typing - input
   * cleared, message sent, or composer unmounted. Use to broadcast a
   * typing-stop event so the peer's indicator drops immediately.
   */
  onTypingStop?: () => void;
  /** Whether voice input is currently active */
  isListening?: boolean;
  /** Called when mic button is tapped */
  onMicTap?: () => void;
  /** Whether the browser supports speech recognition */
  micSupported?: boolean;
  /** Live transcript to display while listening */
  liveTranscript?: string;
  /**
   * When true, the Send button stays visible and can fire even without
   * typed text. Used by the Producer chat when an attachment is queued,
   * so the sender can share a herd or price with no extra note.
   */
  allowEmpty?: boolean;
}

export function ChatInput({
  onSend,
  placeholder = "Write a message...",
  disabled = false,
  loading = false,
  accentClass = "bg-violet hover:bg-violet",
  onTyping,
  onTypingStop,
  isListening = false,
  onMicTap,
  micSupported = false,
  liveTranscript,
  allowEmpty = false,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Tracks whether the peer believes we're typing right now. Flips to true
  // on the first keystroke and back to false when the input clears or the
  // composer unmounts, so we only fire one typing-stop per session of
  // typing - no spam.
  const isTypingRef = useRef(false);

  const hasText = value.trim().length > 0;
  const canSend = hasText || allowEmpty;

  const resetHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, []);

  const stopTyping = useCallback(() => {
    if (!isTypingRef.current) return;
    isTypingRef.current = false;
    onTypingStop?.();
  }, [onTypingStop]);

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!canSend || disabled || loading) return;

    setValue("");
    resetHeight();
    // Tell peers we've stopped typing. Presence's track() is idempotent
    // and last-write-wins, so this won't bounce or race the message
    // INSERT - either ordering produces a clean transition.
    stopTyping();
    await onSend(trimmed);
  }, [value, canSend, disabled, loading, onSend, resetHeight, stopTyping]);

  // Fire typing-stop on unmount so the peer's indicator clears even if the
  // user navigates away mid-compose.
  useEffect(() => {
    return () => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTypingStop?.();
      }
    };
  }, [onTypingStop]);

  // Fire typing-stop when the tab becomes hidden (user switched tabs,
  // minimised the window, or backgrounded the browser). Without this the
  // peer continues to see the typing dots until presence times out.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && isTypingRef.current) {
        isTypingRef.current = false;
        onTypingStop?.();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [onTypingStop]);

  // Display live transcript in the textarea while listening
  const displayValue = isListening && liveTranscript ? liveTranscript : value;

  return (
    <div className="flex items-center gap-2">
      {/* Input field with send button inside */}
      <div className="flex min-h-[44px] flex-1 items-center rounded-[22px] border border-white/10 bg-white/5 pr-1.5 pl-4 transition-colors focus-within:border-white/20 focus-within:bg-white/[0.08]">
        <textarea
          ref={textareaRef}
          value={displayValue}
          onChange={(e) => {
            const next = e.target.value;
            setValue(next);
            const nextHasText = next.trim().length > 0;
            if (nextHasText) {
              if (!isTypingRef.current) isTypingRef.current = true;
              onTyping?.();
            } else if (isTypingRef.current) {
              // User cleared the input without sending - tell the peer to
              // drop the indicator immediately rather than waiting on the
              // auto-hide timer.
              stopTyping();
            }
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
          className="text-text-primary placeholder:text-text-muted max-h-[120px] flex-1 resize-none bg-transparent py-2.5 text-sm leading-5 outline-none disabled:opacity-50"
        />

        {/* Send button - visible when there is text or an attachment is queued */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || loading || !canSend}
          className={`ml-2 flex h-8 shrink-0 items-center justify-center rounded-full px-4 text-white transition-all ${accentClass} ${
            canSend ? "scale-100 opacity-100" : "pointer-events-none scale-75 opacity-0"
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
              ? `${accentClass} animate-pulse text-white`
              : "text-text-muted hover:text-text-secondary border border-white/10 bg-white/5 hover:bg-white/10"
          }`}
          aria-label={isListening ? "Stop listening" : "Voice input"}
        >
          <Mic className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
