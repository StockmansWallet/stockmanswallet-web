"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import { clearOverlay } from "@/lib/demo-overlay";
import {
  BookOpen,
  ChevronDown,
  FileText,
  HelpCircle,
  LogOut,
  Plus,
  Settings,
  UserRound,
  WalletCards,
} from "lucide-react";

type HeaderAccent =
  | "brand"
  | "warning"
  | "error"
  | "success"
  | "info"
  | "brangus"
  | "insights"
  | "markets"
  | "yard-book"
  | "reports"
  | "freight-iq"
  | "grid-iq"
  | "producer-network"
  | "advisor";

interface PageMeta {
  title: string;
  subtitle: string;
  titleHref: string;
  accent: HeaderAccent;
}

interface AppHeaderProps {
  displayName: string;
  email?: string;
  roleLabel?: string;
  avatarUrl?: string;
}

export function AppHeader({
  displayName,
  email = "",
  roleLabel = "",
  avatarUrl = "",
}: AppHeaderProps) {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileMenuPosition, setProfileMenuPosition] = useState({ top: 0, right: 0 });
  const [pageMeta, setPageMeta] = useState<PageMeta>({
    title: "",
    subtitle: "",
    titleHref: "",
    accent: "brand",
  });
  const profileTriggerRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const isDashboard = pathname === "/dashboard";
  const initials = displayName
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const dashboardMeta: PageMeta = {
    title: `G\u2019day, ${displayName}`,
    subtitle: "",
    titleHref: "",
    accent: "brand",
  };
  const activeMeta = isDashboard ? dashboardMeta : pageMeta;

  useEffect(() => {
    if (isDashboard) {
      return;
    }

    let frame = 0;
    let timeout = 0;

    function readPageHeader() {
      const markers = document.querySelectorAll<HTMLElement>("[data-page-header]");
      const marker = markers[markers.length - 1];
      if (!marker) return;
      const title = marker.dataset.pageTitle || "";
      if (!title) return;
      setPageMeta({
        title,
        subtitle: marker.dataset.pageSubtitle || "",
        titleHref: marker.dataset.pageTitleHref || "",
        accent: normalizeAccent(marker.dataset.pageAccent),
      });
    }

    frame = window.requestAnimationFrame(readPageHeader);
    timeout = window.setTimeout(readPageHeader, 80);

    const observer = new MutationObserver(readPageHeader);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      observer.disconnect();
    };
  }, [displayName, isDashboard, pathname]);

  useEffect(() => {
    if (!profileOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (profileTriggerRef.current?.contains(event.target as Node)) return;
      if (profileMenuRef.current?.contains(event.target as Node)) return;
      setProfileOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setProfileOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen]);

  useEffect(() => {
    if (!profileOpen) return;

    function updateProfileMenuPosition() {
      const rect = profileTriggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setProfileMenuPosition({
        top: rect.bottom + 8,
        right: Math.max(12, window.innerWidth - rect.right),
      });
    }

    updateProfileMenuPosition();
    window.addEventListener("resize", updateProfileMenuPosition);
    window.addEventListener("scroll", updateProfileMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateProfileMenuPosition);
      window.removeEventListener("scroll", updateProfileMenuPosition, true);
    };
  }, [profileOpen]);

  const profileMenu =
    profileOpen ? (
      <div
        ref={profileMenuRef}
        role="menu"
        className="fixed z-[100] w-64 overflow-hidden rounded-2xl border border-white/[0.10] bg-white/[0.08] bg-clip-padding p-2 shadow-2xl shadow-black/35 backdrop-blur-xl backdrop-saturate-150"
        style={{
          top: profileMenuPosition.top,
          right: profileMenuPosition.right,
        }}
      >
        <div className="border-b border-white/[0.06] px-3 py-3">
          <p className="text-text-primary truncate text-sm font-semibold">{displayName}</p>
          {email && <p className="text-text-muted truncate text-xs">{email}</p>}
          {roleLabel && (
            <p className="text-brand mt-1 text-[11px] font-semibold tracking-wide uppercase">
              {roleLabel}
            </p>
          )}
        </div>

        <div className="py-2">
          <ProfileMenuLink href="/dashboard/settings/profile" icon={<UserRound className="h-4 w-4" />}>
            Profile
          </ProfileMenuLink>
          <ProfileMenuLink
            href="/dashboard/settings/account"
            icon={<WalletCards className="h-4 w-4" />}
          >
            Account
          </ProfileMenuLink>
          <ProfileMenuLink href="/dashboard/settings" icon={<Settings className="h-4 w-4" />}>
            Settings
          </ProfileMenuLink>
          <ProfileMenuLink href="/dashboard/help" icon={<HelpCircle className="h-4 w-4" />}>
            Help Center
          </ProfileMenuLink>
        </div>

        <form action={signOut} onSubmit={() => clearOverlay()} className="border-t border-white/[0.06] pt-2">
          <button
            type="submit"
            className="text-error hover:bg-error/10 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </form>
      </div>
    ) : null;

  return (
    <>
      <header
        className="sticky top-0 z-30 hidden border-b border-white/[0.08] bg-[#201B18]/68 px-4 py-2.5 shadow-sm shadow-black/15 backdrop-blur-xl lg:block"
      >
      <div className="mx-auto flex w-full max-w-[1960px] items-center gap-4">
        <Link
          href="/dashboard"
          aria-label="Stockman's Wallet"
          className="relative flex h-14 w-64 shrink-0 items-center justify-center overflow-visible px-3 transition-opacity hover:opacity-90"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-1/2 h-56 w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(ellipse at center, color-mix(in srgb, var(--color-brand) 16%, transparent), color-mix(in srgb, var(--color-brand) 7%, transparent) 36%, color-mix(in srgb, var(--color-brand) 2%, transparent) 62%, transparent 82%)",
            }}
          />
          <Image
            src="/images/sw-logo.svg"
            alt="Stockman's Wallet"
            width={220}
            height={146}
            priority
            className="relative h-[3.35rem] w-auto object-contain"
          />
        </Link>

        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="flex min-w-0 flex-1 items-baseline gap-3">
            {activeMeta.titleHref ? (
              <Link
                href={activeMeta.titleHref}
                className={`${accentTitleClass[activeMeta.accent]} truncate text-xl font-semibold tracking-tight transition-opacity hover:opacity-85 xl:text-2xl`}
              >
                {activeMeta.title}
              </Link>
            ) : (
              <h1
                className={`${accentTitleClass[activeMeta.accent]} truncate text-xl font-semibold tracking-tight xl:text-2xl`}
              >
                {activeMeta.title}
              </h1>
            )}
            {activeMeta.subtitle && (
              <p className="text-text-secondary truncate text-sm font-medium">
                {activeMeta.subtitle}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2">
            {isDashboard && (
              <>
                <Link
                  href="/dashboard/herds/new"
                  className="bg-brand hover:bg-brand-dark inline-flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-semibold text-white transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Herd
                </Link>
                <Link
                  href="/dashboard/tools/reports"
                  className="border border-white/[0.08] bg-white/[0.07] text-text-secondary hover:bg-white/[0.09] hover:text-text-primary inline-flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-semibold transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  Reports
                </Link>
                <Link
                  href="/dashboard/tools/yard-book"
                  className="border border-white/[0.08] bg-white/[0.07] text-text-secondary hover:bg-white/[0.09] hover:text-text-primary inline-flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-semibold transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  Yard Book
                </Link>
              </>
            )}
            {!isDashboard && (
              <div id="app-header-page-actions" className="flex items-center gap-2" />
            )}

          <div ref={profileTriggerRef} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((open) => !open)}
              className="flex h-9 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.07] bg-clip-padding p-1 pr-2.5 text-left transition-colors hover:bg-white/[0.09]"
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <span className="bg-brand/15 text-brand flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold">
                  {initials || "SW"}
                </span>
              )}
              <span className="text-text-primary max-w-28 truncate text-sm font-semibold">
                {displayName}
              </span>
              <ChevronDown
                className={`text-text-muted h-3.5 w-3.5 transition-transform ${
                  profileOpen ? "rotate-180" : ""
                }`}
              />
            </button>

          </div>
          </div>
        </div>
      </div>
      </header>
      {profileMenu && typeof document !== "undefined" ? createPortal(profileMenu, document.body) : null}
    </>
  );
}

const accentTitleClass: Record<HeaderAccent, string> = {
  brand: "text-brand",
  warning: "text-warning",
  error: "text-error",
  success: "text-success",
  info: "text-info",
  brangus: "text-brangus",
  insights: "text-insights",
  markets: "text-markets",
  "yard-book": "text-yard-book",
  reports: "text-reports",
  "freight-iq": "text-freight-iq",
  "grid-iq": "text-grid-iq",
  "producer-network": "text-producer-network-light",
  advisor: "text-advisor",
};

function normalizeAccent(value: string | undefined): HeaderAccent {
  if (!value) return "brand";
  if (value in accentTitleClass) return value as HeaderAccent;
  return "brand";
}

function ProfileMenuLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-text-secondary hover:bg-white/[0.06] hover:text-text-primary flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}
