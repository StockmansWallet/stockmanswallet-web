"use client";

import { motion } from "framer-motion";
import { ChatAvatar } from "@/components/app/chat/chat-avatar";

interface TypingIndicatorProps {
  /** Solid opaque background color for the bubble */
  bgColor: string;
  /** Color for the bouncing dots */
  dotClass?: string;
  /** Reserve the sender avatar lane so the bubble lines up with chat rows */
  reserveAvatarSpace?: boolean;
  /** Peer's avatar URL to render alongside the bubble (matches message rows) */
  avatarUrl?: string | null;
  /** Initials fallback when no avatar URL is available */
  avatarInitials?: string;
  className?: string;
}

// iMessage-style spring: quick, slight overshoot on entry, smooth fade
// on exit. The transformOrigin pin to bottom-left makes the bubble grow
// out of its tail so the entrance reads as "coming from the peer", not
// dropping in from above. Callers wrap this in <AnimatePresence> so the
// exit animation actually plays before unmount.
const typingMotion = {
  initial: { opacity: 0, scale: 0.7, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.7, y: 4 },
  transition: {
    type: "spring" as const,
    stiffness: 520,
    damping: 30,
    mass: 0.7,
  },
};

/**
 * Shared typing indicator bubble with three bouncing dots.
 * Used by both Brangus AI chat and producer peer chat.
 */
export function TypingIndicator({
  bgColor,
  dotClass = "bg-white/50",
  reserveAvatarSpace = false,
  avatarUrl,
  avatarInitials,
  className = "",
}: TypingIndicatorProps) {
  const hasHangingAvatar = Boolean(avatarUrl || avatarInitials);

  return (
    <motion.div
      layout="position"
      role="status"
      aria-live="polite"
      aria-label="Other participant is typing"
      className={`flex items-end justify-start gap-2 px-1 pr-14 ${hasHangingAvatar ? "pb-8" : ""} ${className}`}
      style={{ transformOrigin: "bottom left" }}
      initial={typingMotion.initial}
      animate={typingMotion.animate}
      exit={typingMotion.exit}
      transition={typingMotion.transition}
    >
      <ChatAvatar
        avatarUrl={avatarUrl}
        initials={avatarInitials}
        reserveSpace={reserveAvatarSpace}
        className={`${hasHangingAvatar ? "-mb-8" : ""} self-end`}
      />
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
    </motion.div>
  );
}
