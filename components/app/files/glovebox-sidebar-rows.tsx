import {
  ChevronRight,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { GloveboxCollectionGroupRow } from "@/lib/glovebox/files";
import { DROP_UNCATEGORISED } from "./glovebox-shared";
import { MenuButton, MenuPopover } from "./glovebox-sidebar-controls";

export function GroupHeader({
  group,
  menuOpen,
  dragActive,
  collapsed,
  onToggleCollapse,
  onToggleMenu,
  onRename,
  onDelete,
  onAddCollection,
  onDrop,
}: {
  group: GloveboxCollectionGroupRow;
  menuOpen: boolean;
  dragActive: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onToggleMenu: () => void;
  onRename: () => void;
  onDelete: () => void;
  onAddCollection: () => void;
  onDrop: () => void;
}) {
  return (
    <div
      className={`group relative mt-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold tracking-wide text-white/45 uppercase ${
        dragActive ? "outline-brand/30 outline outline-1" : ""
      }`}
      onDragOver={(event) => {
        if (!dragActive) return;
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      data-files-collection-menu-root
    >
      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md py-1 text-left hover:text-white"
        aria-expanded={!collapsed}
      >
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${collapsed ? "" : "rotate-90"}`}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate">{group.name}</span>
      </button>
      <button
        type="button"
        onClick={onAddCollection}
        className="rounded-md p-1 hover:bg-white/[0.06]"
        aria-label={`Add folder to ${group.name}`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onToggleMenu}
        className="rounded-md p-1 hover:bg-white/[0.06]"
        aria-label={`Manage ${group.name}`}
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      {menuOpen && (
        <MenuPopover>
          <MenuButton icon={<Pencil className="h-4 w-4" />} label="Rename" onClick={onRename} />
          <MenuButton
            destructive
            icon={<Trash2 className="h-4 w-4" />}
            label="Delete"
            onClick={onDelete}
          />
        </MenuPopover>
      )}
    </div>
  );
}

export function CollectionButton({
  label,
  count,
  active,
  menuOpen,
  dropTarget,
  dropActive,
  draggable,
  onClick,
  onToggleMenu,
  onRename,
  onDelete,
  onDragStart,
  onDragEnd,
}: {
  label: string;
  count: number;
  active: boolean;
  menuOpen?: boolean;
  dropTarget?: string | null;
  dropActive?: boolean;
  draggable?: boolean;
  onClick: () => void;
  onToggleMenu?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-files-collection-drop-target={
        dropTarget === undefined ? undefined : dropTarget === null ? DROP_UNCATEGORISED : dropTarget
      }
      data-files-collection-menu-root={onToggleMenu ? "" : undefined}
      className={`group relative flex w-full items-center rounded-lg px-2 py-2 pr-9 text-left text-sm transition ${
        dropActive
          ? "bg-brand/25 text-brand ring-brand/35 ring-1"
          : active
            ? "bg-brand/15 text-brand"
            : "text-white/70 hover:bg-white/[0.05] hover:text-white"
      }`}
    >
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2">
        {active ? (
          <FolderOpen className="h-4 w-4 shrink-0" />
        ) : (
          <Folder className="h-4 w-4 shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      </button>
      {count > 0 && (
        <span className="text-brand border-brand/20 bg-brand/15 absolute right-3 flex h-5 min-w-5 items-center justify-center rounded-full border px-1.5 text-[10px] font-bold tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
      )}
      {onToggleMenu && (
        <>
          <button
            type="button"
            onClick={onToggleMenu}
            className={`absolute right-2 rounded-md p-1 text-white/35 transition hover:bg-white/[0.08] hover:text-white focus:bg-white/[0.08] focus:text-white ${
              menuOpen
                ? "opacity-100"
                : "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
            }`}
            aria-label={`Manage ${label}`}
            aria-expanded={menuOpen}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <MenuPopover>
              {onRename && (
                <MenuButton
                  icon={<Pencil className="h-4 w-4" />}
                  label="Rename"
                  onClick={onRename}
                />
              )}
              {onDelete && (
                <MenuButton
                  destructive
                  icon={<Trash2 className="h-4 w-4" />}
                  label="Delete"
                  onClick={onDelete}
                />
              )}
            </MenuPopover>
          )}
        </>
      )}
    </div>
  );
}
