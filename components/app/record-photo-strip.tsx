"use client";

import { useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import type { RecordPhoto } from "./record-photo-uploader";

export function RecordPhotoStrip({ photos }: { photos: RecordPhoto[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  if (photos.length === 0) return null;

  const active = activeIndex != null ? photos[activeIndex] : null;

  return (
    <>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {photos.map((p, i) => (
          <button
            key={p.path}
            type="button"
            onClick={() => setActiveIndex(i)}
            className="relative h-14 w-14 overflow-hidden rounded-lg ring-1 ring-inset ring-white/10 transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
            aria-label={`Open photo ${i + 1} of ${photos.length}`}
          >
            <Image
              src={p.url}
              alt=""
              fill
              sizes="56px"
              className="object-cover"
              unoptimized
            />
          </button>
        ))}
      </div>
      <Modal
        open={active !== null}
        onClose={() => setActiveIndex(null)}
        size="lg"
        title={active ? `Photo ${(activeIndex ?? 0) + 1} of ${photos.length}` : undefined}
      >
        {active && (
          <div className="relative mx-auto aspect-square w-full max-w-xl overflow-hidden rounded-2xl bg-black/40">
            <Image
              src={active.url}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 600px"
              className="object-contain"
              unoptimized
            />
          </div>
        )}
      </Modal>
    </>
  );
}
