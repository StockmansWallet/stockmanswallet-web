"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Loader2, Paperclip } from "lucide-react";

export interface ChatAttachmentAction {
  id: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  iconClassName?: string;
  disabled?: boolean;
  onSelect: () => void;
}

interface ChatAttachmentMenuProps {
  open: boolean;
  busy?: boolean;
  disabled?: boolean;
  accentClassName: string;
  actions: ChatAttachmentAction[];
  onOpenChange: (open: boolean) => void;
}

export function ChatAttachmentMenu({
  open,
  busy = false,
  disabled = false,
  accentClassName,
  actions,
  onOpenChange,
}: ChatAttachmentMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (menuRef.current?.contains(event.target as Node)) return;
      onOpenChange(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [onOpenChange, open]);

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        disabled={busy || disabled}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all disabled:opacity-40 ${
          open
            ? `${accentClassName} bg-white/[0.08]`
            : "border-white/10 bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-secondary"
        }`}
        aria-label="Add attachment"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Add attachment"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Paperclip className="h-4 w-4" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Attachments"
          className="absolute bottom-full left-0 z-30 mb-2 w-64 overflow-hidden rounded-xl border border-white/[0.08] bg-bg-alt p-2 shadow-2xl shadow-black/35"
        >
          {actions.map((action, index) => (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              disabled={action.disabled}
              onClick={() => {
                onOpenChange(false);
                action.onSelect();
              }}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50 ${
                index > 0 ? "border-t border-white/[0.06]" : ""
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  action.iconClassName ?? "bg-white/[0.06] text-text-secondary"
                }`}
              >
                {action.icon}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">{action.title}</p>
                <p className="line-clamp-2 text-[11px] leading-snug text-text-muted">
                  {action.subtitle}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
