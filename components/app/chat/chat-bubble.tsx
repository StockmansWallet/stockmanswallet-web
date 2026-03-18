"use client";

import type { ReactNode } from "react";

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
  children,
}: ChatBubbleProps) {
  const isRight = side === "right";
  const animClass = animate
    ? animationType === "fade"
      ? "animate-fade-in"
      : "animate-bubble-in"
    : "";

  const avatar = avatarUrl ? (
    <img
      src={avatarUrl}
      alt=""
      className="-mb-8 h-12 w-12 shrink-0 self-end rounded-full object-cover"
    />
  ) : avatarInitials ? (
    <div className="-mb-8 flex h-12 w-12 shrink-0 items-center justify-center self-end rounded-full bg-white/10">
      <span className="text-sm font-bold text-text-primary">{avatarInitials}</span>
    </div>
  ) : null;

  return (
    <div
      className={`flex items-end gap-2 ${isRight ? "justify-end" : "justify-start"} ${animClass}`}
      style={animate && animationType === "bounce" ? { transformOrigin: isRight ? "bottom right" : "bottom left" } : undefined}
    >
      {!isRight && avatar}
      <div className="relative max-w-[80%] overflow-visible">
        <div
          className={`rounded-3xl px-4 py-2.5 text-sm leading-relaxed ${bgClass} ${textClass}`}
        >
          {(senderName || timestamp) && (
            <div className="mb-0.5 flex items-center gap-2">
              {senderName && (
                <span className="text-xs font-semibold opacity-70">{senderName}</span>
              )}
              {timestamp && (
                <span className="text-[10px] opacity-40">{timestamp}</span>
              )}
            </div>
          )}
          <div className="whitespace-pre-wrap">{children}</div>
        </div>
        <BubbleTail side={side} color={tailColor} />
      </div>
      {isRight && avatar}
    </div>
  );
}
