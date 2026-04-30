"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

// Shared spring config used by every animated bubble in the app so a
// new message bubble and the typing indicator that just preceded it
// move with the same physics. Tuned to match iOS Messages: quick,
// slight overshoot past 1.0, settles fast.
const bubbleSpring = {
  type: "spring" as const,
  stiffness: 520,
  damping: 30,
  mass: 0.7,
};

interface ChatBubbleProps {
  side: "left" | "right";
  bgClass: string;
  /** Raw CSS color for the bubble tail (must match bgClass visually) */
  tailColor: string;
  textClass?: string;
  senderName?: string;
  timestamp?: string;
  animate?: boolean;
  /** "bounce" = spring pop-in (default), "fade" = gentle opacity fade */
  animationType?: "bounce" | "fade";
  /** Optional profile image URL shown beside the bubble */
  avatarUrl?: string;
  /** Initials to show if no avatarUrl (e.g. "LE" for Leon Ernst) */
  avatarInitials?: string;
  /**
   * When true and no avatar is rendered, reserve the avatar's horizontal
   * space so consecutive same-sender bubbles (iMessage-style grouping) stay
   * aligned with the group's last bubble that does show the avatar.
   */
  reserveAvatarSpace?: boolean;
  children: ReactNode;
}

/** iMessage-style SVG tail using a custom bezier path. */
function BubbleTail({ side, color }: { side: "left" | "right"; color: string }) {
  const isRight = side === "right";

  return (
    <svg
      width="22"
      height="17"
      viewBox="0 0 22.37 16.55"
      fill="none"
      className={`absolute -bottom-[10px] ${isRight ? "right-[4px]" : "left-[4px]"}`}
      style={isRight ? undefined : { transform: "scaleX(-1)" }}
    >
      <path
        d="M0,4.5s1.82-.06,5.8,5.76c3.03,4.43,6.92,5.51,10.01,6.09,4.81.9,8.2-1.45,5.76-1.96-1.77-.37-5.28-2.66-5.09-7.46.21-5.51,2.28-6.94,2.28-6.94L0,4.5Z"
        fill={color}
      />
    </svg>
  );
}

export function ChatBubble({
  side,
  bgClass,
  tailColor,
  textClass = "text-text-primary",
  senderName,
  timestamp,
  animate = false,
  animationType = "bounce",
  avatarUrl,
  avatarInitials,
  reserveAvatarSpace = false,
  children,
}: ChatBubbleProps) {
  const isRight = side === "right";

  const avatar = avatarUrl ? (
    <img
      src={avatarUrl}
      alt=""
      className="-mb-8 h-12 w-12 shrink-0 self-end rounded-full object-cover"
    />
  ) : avatarInitials ? (
    <div className="-mb-8 flex h-12 w-12 shrink-0 items-center justify-center self-end rounded-full bg-white/10">
      <span className="text-text-primary text-sm font-bold">{avatarInitials}</span>
    </div>
  ) : reserveAvatarSpace ? (
    <div className="h-12 w-12 shrink-0 self-end" aria-hidden="true" />
  ) : null;

  const hasHangingAvatar = Boolean(avatarUrl || avatarInitials);
  const wrapperClass = `flex items-end gap-2 px-1 ${hasHangingAvatar ? "pb-8" : ""} ${isRight ? "justify-end pl-14" : "justify-start pr-14"}`;

  const content = (
    <>
      {!isRight && avatar}
      <div className="relative max-w-[min(80%,42rem)] overflow-visible">
        <div className={`rounded-3xl px-4 py-2.5 text-sm leading-relaxed ${bgClass} ${textClass}`}>
          {(senderName || timestamp) && (
            <div className="mb-0.5 flex items-center gap-2">
              {senderName && <span className="text-xs font-semibold opacity-70">{senderName}</span>}
              {timestamp && <span className="text-[10px] opacity-40">{timestamp}</span>}
            </div>
          )}
          <div className="break-words whitespace-pre-wrap">{children}</div>
        </div>
        <BubbleTail side={side} color={tailColor} />
      </div>
      {isRight && avatar}
    </>
  );

  if (!animate) {
    return <div className={wrapperClass}>{content}</div>;
  }

  if (animationType === "fade") {
    return (
      <motion.div
        className={wrapperClass}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
      >
        {content}
      </motion.div>
    );
  }

  // Spring scale-pop matching the typing indicator's physics. Origin is
  // pinned to the bubble's tail side so the bubble grows out of where its
  // tail will sit, like iOS Messages.
  return (
    <motion.div
      className={wrapperClass}
      style={{ transformOrigin: isRight ? "bottom right" : "bottom left" }}
      initial={{ opacity: 0, scale: 0.6, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={bubbleSpring}
    >
      {content}
    </motion.div>
  );
}
