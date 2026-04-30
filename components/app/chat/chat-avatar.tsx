"use client";

import Image from "next/image";

interface ChatAvatarProps {
  avatarUrl?: string | null;
  initials?: string;
  reserveSpace?: boolean;
  className?: string;
}

/**
 * Shared peer/self avatar used by chat bubbles and typing indicators.
 * Keeping the dimensions in one component prevents the typing row from
 * drifting away from the bubble row it hands off to.
 */
export function ChatAvatar({
  avatarUrl,
  initials,
  reserveSpace = false,
  className = "",
}: ChatAvatarProps) {
  const baseClass = `h-12 w-12 shrink-0 rounded-full ${className}`;

  if (avatarUrl) {
    return (
      <div className={`${baseClass} relative overflow-hidden`}>
        <Image src={avatarUrl} alt="" fill sizes="48px" className="object-cover" />
      </div>
    );
  }

  if (initials) {
    return (
      <div className={`${baseClass} flex items-center justify-center bg-white/10`}>
        <span className="text-text-primary text-sm font-bold">{initials}</span>
      </div>
    );
  }

  if (reserveSpace) {
    return <div className={baseClass} aria-hidden="true" />;
  }

  return null;
}
