import { useEffect, type RefObject } from "react";
import type { GloveboxFileRow } from "@/lib/glovebox/files";
import {
  collectionDropTargetFromPoint,
  DRAG_ACTIVATION_DISTANCE,
  type DragPreview,
  UNCATEGORISED,
} from "./glovebox-shared";

export function useGloveboxDrag({
  dragPreview,
  dragPreviewRef,
  suppressNextFileOpenRef,
  setDragPreview,
  setDropCollection,
  moveFileToCollection,
}: {
  dragPreview: DragPreview | null;
  dragPreviewRef: RefObject<DragPreview | null>;
  suppressNextFileOpenRef: RefObject<boolean>;
  setDragPreview: (preview: DragPreview | null) => void;
  setDropCollection: (collection: string | null) => void;
  moveFileToCollection: (fileId: string, nextCollection: string | null) => void;
}) {
  useEffect(() => {
    dragPreviewRef.current = dragPreview;
  }, [dragPreview, dragPreviewRef]);

  useEffect(() => {
    if (!dragPreview) return;

    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    function finishDrag(event?: globalThis.PointerEvent, shouldDrop = false) {
      const current = dragPreviewRef.current;
      if (!current) return;

      const active =
        current.active ||
        (event
          ? Math.hypot(event.clientX - current.startX, event.clientY - current.startY) >=
            DRAG_ACTIVATION_DISTANCE
          : false);
      const dropTarget =
        shouldDrop && active && event
          ? collectionDropTargetFromPoint(event.clientX, event.clientY)
          : undefined;

      if (dropTarget !== undefined) {
        moveFileToCollection(current.file.id, dropTarget);
      }

      if (active) {
        suppressNextFileOpenRef.current = true;
        window.setTimeout(() => {
          suppressNextFileOpenRef.current = false;
        }, 0);
      }

      dragPreviewRef.current = null;
      setDragPreview(null);
      setDropCollection(null);
    }

    function handlePointerMove(event: globalThis.PointerEvent) {
      const current = dragPreviewRef.current;
      if (!current) return;

      const active =
        current.active ||
        Math.hypot(event.clientX - current.startX, event.clientY - current.startY) >=
          DRAG_ACTIVATION_DISTANCE;
      const next = {
        ...current,
        x: event.clientX,
        y: event.clientY,
        active,
      };

      event.preventDefault();
      dragPreviewRef.current = next;
      setDragPreview(next);

      if (active) {
        const dropTarget = collectionDropTargetFromPoint(event.clientX, event.clientY);
        setDropCollection(
          dropTarget === undefined ? null : dropTarget === null ? UNCATEGORISED : dropTarget
        );
      }
    }

    function handlePointerUp(event: globalThis.PointerEvent) {
      finishDrag(event, true);
    }

    function handlePointerCancel() {
      finishDrag();
    }

    document.addEventListener("pointermove", handlePointerMove, { passive: false });
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerCancel);
      document.body.style.userSelect = previousUserSelect;
    };
  }, [
    dragPreview,
    dragPreviewRef,
    moveFileToCollection,
    setDragPreview,
    setDropCollection,
    suppressNextFileOpenRef,
  ]);
}

export function makeDragPreview(
  file: GloveboxFileRow,
  type: DragPreview["type"],
  event: React.PointerEvent<HTMLLIElement>
): DragPreview {
  return {
    file,
    type,
    startX: event.clientX,
    startY: event.clientY,
    x: event.clientX,
    y: event.clientY,
    active: false,
  };
}
