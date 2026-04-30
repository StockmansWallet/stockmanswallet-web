"use client";

interface TypingIndicatorProps {
  /** Solid opaque background color for the bubble */
  bgColor: string;
  /** Color for the bouncing dots */
  dotClass?: string;
  /** Reserve the sender avatar lane so the bubble lines up with chat rows */
  reserveAvatarSpace?: boolean;
  className?: string;
  /**
   * When true, plays the bubble-out exit animation so the indicator
   * appears to morph into the incoming message bubble. Caller is
   * responsible for unmounting after the animation completes.
   */
  isExiting?: boolean;
}

/**
 * Shared typing indicator bubble with three bouncing dots.
 * Used by both Brangus AI chat and producer peer chat.
 */
export function TypingIndicator({
  bgColor,
  dotClass = "bg-white/50",
  reserveAvatarSpace = false,
  className = "",
  isExiting = false,
}: TypingIndicatorProps) {
  return (
    <div
      className={`flex items-end justify-start gap-2 px-1 pr-14 ${isExiting ? "animate-bubble-out" : "animate-bubble-in"} ${className}`}
      style={{ transformOrigin: "bottom left" }}
    >
      {reserveAvatarSpace && <div className="h-12 w-12 shrink-0 self-end" aria-hidden="true" />}
      <div className="relative">
        <div
          className="flex min-h-10 min-w-14 items-center justify-center gap-1.5 rounded-3xl px-4 py-3"
          style={{ backgroundColor: bgColor }}
        >
          <span
            className={`h-2 w-2 rounded-full ${dotClass} animate-bounce [animation-delay:0ms]`}
          />
          <span
            className={`h-2 w-2 rounded-full ${dotClass} animate-bounce [animation-delay:150ms]`}
          />
          <span
            className={`h-2 w-2 rounded-full ${dotClass} animate-bounce [animation-delay:300ms]`}
          />
        </div>
        <svg
          width="22"
          height="17"
          viewBox="0 0 22.37 16.55"
          fill="none"
          className="absolute -bottom-[10px] left-[4px]"
          style={{ transform: "scaleX(-1)" }}
        >
          <path
            d="M0,4.5s1.82-.06,5.8,5.76c3.03,4.43,6.92,5.51,10.01,6.09,4.81.9,8.2-1.45,5.76-1.96-1.77-.37-5.28-2.66-5.09-7.46.21-5.51,2.28-6.94,2.28-6.94L0,4.5Z"
            fill={bgColor}
          />
        </svg>
      </div>
    </div>
  );
}
