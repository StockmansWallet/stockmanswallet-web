import { Check, Folder, FolderOpen, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { ALL_COLLECTIONS, DROP_UNCATEGORISED, UNCATEGORISED } from "./glovebox-shared";

export function GloveboxCollectionsSidebar({
  filesCount,
  collectionOptions,
  collectionCounts,
  activeCollection,
  openCollectionMenu,
  dropCollection,
  isCreatingCollection,
  collectionDraft,
  editingCollection,
  editingDraft,
  onToggleCreate,
  onCollectionDraftChange,
  onCreateCollection,
  onActiveCollectionChange,
  onToggleMenu,
  onStartRename,
  onDeleteCollection,
  onEditingDraftChange,
  onSaveRename,
  onCancelRename,
}: {
  filesCount: number;
  collectionOptions: string[];
  collectionCounts: Map<string, number>;
  activeCollection: string;
  openCollectionMenu: string | null;
  dropCollection: string | null;
  isCreatingCollection: boolean;
  collectionDraft: string;
  editingCollection: string | null;
  editingDraft: string;
  onToggleCreate: () => void;
  onCollectionDraftChange: (value: string) => void;
  onCreateCollection: () => void;
  onActiveCollectionChange: (value: string) => void;
  onToggleMenu: (value: string) => void;
  onStartRename: (value: string) => void;
  onDeleteCollection: (value: string) => void;
  onEditingDraftChange: (value: string) => void;
  onSaveRename: (collection: string) => void;
  onCancelRename: () => void;
}) {
  return (
    <aside className="rounded-xl border border-white/10 bg-white/[0.02] p-2 lg:sticky lg:top-4 lg:self-start">
      <div className="flex items-center justify-between gap-2 px-2 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-white/45 uppercase">
          <Folder className="h-4 w-4" />
          Collections
        </div>
        <button
          type="button"
          onClick={onToggleCreate}
          className="rounded-lg p-1.5 text-white/45 hover:bg-white/[0.05] hover:text-white"
          aria-label="New collection"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {isCreatingCollection && (
        <div className="mb-2 flex gap-1 px-2">
          <input
            value={collectionDraft}
            onChange={(e) => onCollectionDraftChange(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onCreateCollection();
              if (event.key === "Escape") onToggleCreate();
            }}
            placeholder="Collection name"
            className="h-8 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-2 text-xs text-white outline-none placeholder:text-white/35 focus:border-brand/50"
            autoFocus
          />
          <button
            type="button"
            onClick={onCreateCollection}
            className="bg-brand/15 text-brand hover:bg-brand/25 rounded-lg px-2 text-xs font-semibold"
          >
            Add
          </button>
        </div>
      )}

      <CollectionButton
        label="All files"
        count={filesCount}
        active={activeCollection === ALL_COLLECTIONS}
        onClick={() => onActiveCollectionChange(ALL_COLLECTIONS)}
      />
      <CollectionButton
        label={UNCATEGORISED}
        count={collectionCounts.get(UNCATEGORISED) ?? 0}
        active={activeCollection === UNCATEGORISED}
        onClick={() => onActiveCollectionChange(UNCATEGORISED)}
        dropTarget={null}
        dropActive={dropCollection === UNCATEGORISED}
      />

      <div className="my-2 h-px bg-white/[0.06]" />

      {collectionOptions.map((collection) => (
        <div key={collection}>
          {editingCollection === collection ? (
            <CollectionEditRow
              value={editingDraft}
              onChange={onEditingDraftChange}
              onSave={() => onSaveRename(collection)}
              onCancel={onCancelRename}
            />
          ) : (
            <CollectionButton
              label={collection}
              count={collectionCounts.get(collection) ?? 0}
              active={activeCollection === collection}
              menuOpen={openCollectionMenu === collection}
              onClick={() => onActiveCollectionChange(collection)}
              dropTarget={collection}
              dropActive={dropCollection === collection}
              onToggleMenu={() => onToggleMenu(collection)}
              onRename={() => onStartRename(collection)}
              onDelete={() => onDeleteCollection(collection)}
            />
          )}
        </div>
      ))}
    </aside>
  );
}

function CollectionButton({
  label,
  count,
  active,
  menuOpen,
  dropTarget,
  dropActive,
  onClick,
  onToggleMenu,
  onRename,
  onDelete,
}: {
  label: string;
  count: number;
  active: boolean;
  menuOpen?: boolean;
  dropTarget?: string | null;
  dropActive?: boolean;
  onClick: () => void;
  onToggleMenu?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      data-files-collection-drop-target={
        dropTarget === undefined ? undefined : dropTarget === null ? DROP_UNCATEGORISED : dropTarget
      }
      data-files-collection-menu-root={onToggleMenu ? "" : undefined}
      className={`group relative flex w-full items-center rounded-lg px-2 py-2 pr-9 text-left text-sm transition ${
        dropActive
          ? "bg-brand/25 text-brand ring-1 ring-brand/35"
          : active
            ? "bg-brand/15 text-brand"
            : "text-white/70 hover:bg-white/[0.05] hover:text-white"
      }`}
    >
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2">
        {active ? <FolderOpen className="h-4 w-4 shrink-0" /> : <Folder className="h-4 w-4 shrink-0" />}
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      </button>
      {count > 0 && (
        <span
          className={`text-brand border-brand/20 absolute right-3 flex h-5 min-w-5 items-center justify-center rounded-full border bg-brand/15 px-1.5 text-[10px] font-bold tabular-nums transition ${
            onToggleMenu && (menuOpen ? "opacity-0" : "group-hover:opacity-0 group-focus-within:opacity-0")
          }`}
        >
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
                : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
            }`}
            aria-label={`Manage ${label}`}
            aria-expanded={menuOpen}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute top-9 right-1 z-50 w-40 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] bg-clip-padding p-1.5 shadow-2xl shadow-black/35 backdrop-blur-xl backdrop-saturate-150"
            >
              {onRename && (
                <button
                  type="button"
                  onClick={onRename}
                  role="menuitem"
                  className="text-text-muted hover:text-text-primary flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-white/[0.06]"
                >
                  <Pencil className="h-4 w-4" />
                  Rename
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  role="menuitem"
                  className="text-error hover:bg-error/10 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CollectionEditRow({
  value,
  onChange,
  onSave,
  onCancel,
}: {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-white/[0.04] px-2 py-2">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onSave();
          if (event.key === "Escape") onCancel();
        }}
        className="h-7 min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-2 text-xs text-white outline-none focus:border-brand/50"
        autoFocus
      />
      <button type="button" onClick={onSave} className="rounded-md p-1.5 text-emerald-300 hover:bg-emerald-400/10" aria-label="Save collection name">
        <Check className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={onCancel} className="rounded-md p-1.5 text-white/45 hover:bg-white/[0.08] hover:text-white" aria-label="Cancel rename">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
