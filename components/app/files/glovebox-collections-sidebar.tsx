import { Folder, Plus } from "lucide-react";
import type { GloveboxCollectionGroupRow, GloveboxCollectionRow } from "@/lib/glovebox/files";
import { ALL_COLLECTIONS, UNCATEGORISED } from "./glovebox-shared";
import { CollectionButton, GroupHeader } from "./glovebox-sidebar-rows";
import { EditRow, InlineCreate } from "./glovebox-sidebar-controls";

export function GloveboxCollectionsSidebar({
  filesCount,
  groups,
  collectionsByGroupId,
  collectionCounts,
  activeCollection,
  openCollectionMenu,
  openGroupMenu,
  dropCollection,
  isCreatingCollection,
  isCreatingGroup,
  collectionDraft,
  groupDraft,
  editingCollection,
  editingGroup,
  editingDraft,
  draggedCollection,
  collapsedGroupIds,
  onToggleCreateGroup,
  onToggleCreateCollection,
  onToggleGroupCollapse,
  onCollectionDraftChange,
  onGroupDraftChange,
  onCreateCollection,
  onCreateGroup,
  onActiveCollectionChange,
  onToggleCollectionMenu,
  onToggleGroupMenu,
  onStartRenameCollection,
  onStartRenameGroup,
  onDeleteCollection,
  onDeleteGroup,
  onEditingDraftChange,
  onSaveCollectionRename,
  onSaveGroupRename,
  onCancelRename,
  onCollectionDragStart,
  onCollectionDragEnd,
  onCollectionDropOnGroup,
}: {
  filesCount: number;
  groups: GloveboxCollectionGroupRow[];
  collectionsByGroupId: Map<string, GloveboxCollectionRow[]>;
  collectionCounts: Map<string, number>;
  activeCollection: string;
  openCollectionMenu: string | null;
  openGroupMenu: string | null;
  dropCollection: string | null;
  isCreatingCollection: string | null;
  isCreatingGroup: boolean;
  collectionDraft: string;
  groupDraft: string;
  editingCollection: string | null;
  editingGroup: string | null;
  editingDraft: string;
  draggedCollection: string | null;
  collapsedGroupIds: Set<string>;
  onToggleCreateGroup: () => void;
  onToggleCreateCollection: (groupId: string) => void;
  onToggleGroupCollapse: (groupId: string) => void;
  onCollectionDraftChange: (value: string) => void;
  onGroupDraftChange: (value: string) => void;
  onCreateCollection: (groupId: string) => void;
  onCreateGroup: () => void;
  onActiveCollectionChange: (value: string) => void;
  onToggleCollectionMenu: (value: string) => void;
  onToggleGroupMenu: (value: string) => void;
  onStartRenameCollection: (collection: GloveboxCollectionRow) => void;
  onStartRenameGroup: (group: GloveboxCollectionGroupRow) => void;
  onDeleteCollection: (collection: GloveboxCollectionRow) => void;
  onDeleteGroup: (group: GloveboxCollectionGroupRow) => void;
  onEditingDraftChange: (value: string) => void;
  onSaveCollectionRename: (collection: GloveboxCollectionRow) => void;
  onSaveGroupRename: (group: GloveboxCollectionGroupRow) => void;
  onCancelRename: () => void;
  onCollectionDragStart: (collectionId: string) => void;
  onCollectionDragEnd: () => void;
  onCollectionDropOnGroup: (groupId: string) => void;
}) {
  return (
    <aside className="rounded-xl border border-white/10 bg-white/[0.02] p-2 lg:sticky lg:top-4 lg:self-start">
      <div className="flex items-center justify-between gap-2 px-2 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-white/45 uppercase">
          <Folder className="h-4 w-4" />
          Glovebox
        </div>
        <button
          type="button"
          onClick={onToggleCreateGroup}
          className="rounded-lg p-1.5 text-white/45 hover:bg-white/[0.05] hover:text-white"
          aria-label="New section"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {isCreatingGroup && (
        <InlineCreate
          value={groupDraft}
          placeholder="Section name"
          actionLabel="Add"
          onChange={onGroupDraftChange}
          onSave={onCreateGroup}
          onCancel={onToggleCreateGroup}
        />
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

      {groups.map((group) => {
        const collapsed = collapsedGroupIds.has(group.id);
        return (
          <section key={group.id} className="py-1">
            {editingGroup === group.id ? (
              <EditRow
                value={editingDraft}
                onChange={onEditingDraftChange}
                onSave={() => onSaveGroupRename(group)}
                onCancel={onCancelRename}
              />
            ) : (
              <GroupHeader
                group={group}
                menuOpen={openGroupMenu === group.id}
                dragActive={draggedCollection !== null}
                collapsed={collapsed}
                onToggleCollapse={() => onToggleGroupCollapse(group.id)}
                onToggleMenu={() => onToggleGroupMenu(group.id)}
                onRename={() => onStartRenameGroup(group)}
                onDelete={() => onDeleteGroup(group)}
                onAddCollection={() => onToggleCreateCollection(group.id)}
                onDrop={() => onCollectionDropOnGroup(group.id)}
              />
            )}

            <div
              className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                collapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                {isCreatingCollection === group.id && (
                  <InlineCreate
                    value={collectionDraft}
                    placeholder="Folder name"
                    actionLabel="Add"
                    onChange={onCollectionDraftChange}
                    onSave={() => onCreateCollection(group.id)}
                    onCancel={() => onToggleCreateCollection(group.id)}
                  />
                )}

                <div className="space-y-0.5">
                  {(collectionsByGroupId.get(group.id) ?? []).map((collection) =>
                    editingCollection === collection.id ? (
                      <EditRow
                        key={collection.id}
                        value={editingDraft}
                        onChange={onEditingDraftChange}
                        onSave={() => onSaveCollectionRename(collection)}
                        onCancel={onCancelRename}
                      />
                    ) : (
                      <CollectionButton
                        key={collection.id}
                        label={collection.name}
                        count={collectionCounts.get(collection.id) ?? 0}
                        active={activeCollection === collection.id}
                        menuOpen={openCollectionMenu === collection.id}
                        dropTarget={collection.id}
                        dropActive={dropCollection === collection.id}
                        draggable
                        onDragStart={() => onCollectionDragStart(collection.id)}
                        onDragEnd={onCollectionDragEnd}
                        onClick={() => onActiveCollectionChange(collection.id)}
                        onToggleMenu={() => onToggleCollectionMenu(collection.id)}
                        onRename={() => onStartRenameCollection(collection)}
                        onDelete={() => onDeleteCollection(collection)}
                      />
                    )
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </aside>
  );
}
