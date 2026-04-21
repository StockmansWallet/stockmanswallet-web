"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Crown, HelpCircle, LogOut, Settings, User } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { tierDisplayName, type SubscriptionTier } from "@/lib/subscriptions/tiers";

interface TopBarProps {
  firstName?: string;
  lastName?: string;
  email?: string;
  roleLabel?: string;
  avatarUrl?: string;
  subscriptionTier?: string;
}

export function TopBar({
  firstName,
  lastName,
  email,
  roleLabel,
  avatarUrl,
  subscriptionTier = "stockman",
}: TopBarProps) {
  const initials =
    firstName && lastName ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() : "SW";
  const displayName = firstName && lastName ? `${firstName} ${lastName}` : email || "";
  const planLabel = tierDisplayName(subscriptionTier as SubscriptionTier);

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const updatePos = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    };
    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const menu =
    open && mounted ? (
      <div
        ref={menuRef}
        role="menu"
        className="fixed z-[60] w-64 overflow-hidden rounded-xl border border-white/[0.08] shadow-2xl"
        style={{
          top: menuPos.top,
          right: menuPos.right,
          backgroundColor: "rgba(26, 26, 26, 0.55)",
          backdropFilter: "blur(28px) saturate(1.6)",
          WebkitBackdropFilter: "blur(28px) saturate(1.6)",
        }}
      >
        {/* Header */}
        <div className="border-b border-white/[0.06] px-4 py-3">
          <p className="text-text-primary truncate text-sm font-semibold">{displayName}</p>
          {email && <p className="text-text-muted truncate text-xs">{email}</p>}
        </div>

        {/* Plan */}
        <Link
          role="menuitem"
          href="/dashboard/settings/account"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.04]"
        >
          <Crown className="text-brand h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-text-primary text-sm font-medium">Plan</p>
            <p className="text-text-muted text-xs">{planLabel}</p>
          </div>
          <span className="text-text-muted text-xs">Manage</span>
        </Link>

        <div className="border-t border-white/[0.06]" />

        <Link
          role="menuitem"
          href="/dashboard/settings/profile"
          onClick={() => setOpen(false)}
          className="text-text-secondary hover:text-text-primary flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/[0.04]"
        >
          <User className="h-4 w-4" />
          Profile
        </Link>
        <Link
          role="menuitem"
          href="/dashboard/settings"
          onClick={() => setOpen(false)}
          className="text-text-secondary hover:text-text-primary flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/[0.04]"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <Link
          role="menuitem"
          href="/dashboard/help"
          onClick={() => setOpen(false)}
          className="text-text-secondary hover:text-text-primary flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/[0.04]"
        >
          <HelpCircle className="h-4 w-4" />
          Help Center
        </Link>

        <div className="border-t border-white/[0.06]" />

        <form action={signOut}>
          <button
            type="submit"
            role="menuitem"
            className="text-red hover:bg-red/10 flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </form>
      </div>
    ) : null;

  return (
    <header className="bg-surface-lowest hidden h-20 shrink-0 items-center justify-between border-b border-white/[0.04] px-8 backdrop-blur-xl lg:flex">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <Image
          src="/images/sw-logo-tally.svg"
          alt="Stockman's Wallet"
          width={44}
          height={44}
          className="h-11 w-11"
        />
        <span className="text-xl font-bold text-white">Stockman&apos;s Wallet</span>
      </Link>

      {/* User menu trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors hover:bg-white/[0.04]"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={displayName}
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="bg-brand/15 text-brand flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <span className="text-sm font-bold">{initials}</span>
          </div>
        )}
        <div className="min-w-0 text-left">
          <p className="text-text-secondary text-sm font-medium">{displayName}</p>
          {roleLabel && <p className="text-text-muted text-xs">{roleLabel}</p>}
        </div>
        <ChevronDown
          className={`text-text-muted h-4 w-4 shrink-0 transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {mounted && menu && createPortal(menu, document.body)}
    </header>
  );
}
