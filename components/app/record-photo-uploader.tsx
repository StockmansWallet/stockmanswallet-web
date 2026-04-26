"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const MAX_PHOTOS = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_DIM = 1600;
const JPEG_QUALITY = 0.8;
const SIGNED_URL_TTL_SECONDS = 60 * 60;
export const RECORD_PHOTO_BUCKET = "record-photos";

export interface RecordPhoto {
  path: string;
  url: string;
}

export type RecordPhotoKind = "muster" | "health";

interface Props {
  userId: string;
  recordId: string;
  kind: RecordPhotoKind;
  initialPhotos: RecordPhoto[];
  onChange: (paths: string[]) => void;
}

async function compressToJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest > MAX_DIM ? MAX_DIM / longest : 1;
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas context unavailable");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

export function RecordPhotoUploader({
  userId,
  recordId,
  kind,
  initialPhotos,
  onChange,
}: Props) {
  const [photos, setPhotos] = useState<RecordPhoto[]>(initialPhotos);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updatePhotos = useCallback(
    (next: RecordPhoto[]) => {
      setPhotos(next);
      onChange(next.map((p) => p.path));
    },
    [onChange],
  );

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (picked.length === 0) return;

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      setError(`Maximum ${MAX_PHOTOS} photos per record.`);
      return;
    }

    const queue = picked.slice(0, remaining);
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const added: RecordPhoto[] = [];
    let lastError: string | null = null;

    for (const file of queue) {
      if (!file.type.startsWith("image/")) {
        lastError = "Only image files are supported.";
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        lastError = "Each photo must be under 10MB.";
        continue;
      }
      try {
        const blob = await compressToJpeg(file);
        const path = `${userId}/${kind}/${recordId}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from(RECORD_PHOTO_BUCKET)
          .upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (upErr) {
          lastError = upErr.message;
          continue;
        }
        const { data: signed, error: signErr } = await supabase.storage
          .from(RECORD_PHOTO_BUCKET)
          .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
        if (signErr || !signed?.signedUrl) {
          lastError = signErr?.message ?? "Could not load uploaded photo.";
          continue;
        }
        added.push({ path, url: signed.signedUrl });
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Upload failed.";
      }
    }

    updatePhotos([...photos, ...added]);
    setError(lastError);
    setBusy(false);
  }

  async function handleRemove(photo: RecordPhoto) {
    // Best-effort delete. UI state advances regardless so the form stays consistent.
    const supabase = createClient();
    void supabase.storage.from(RECORD_PHOTO_BUCKET).remove([photo.path]);
    updatePhotos(photos.filter((p) => p.path !== photo.path));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">
          Photos {photos.length}/{MAX_PHOTOS}
        </span>
        {error && <span className="text-xs text-error">{error}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {photos.map((p) => (
          <div
            key={p.path}
            className="group relative h-20 w-20 overflow-hidden rounded-lg ring-1 ring-inset ring-white/10"
          >
            <Image
              src={p.url}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
              unoptimized
            />
            <button
              type="button"
              onClick={() => handleRemove(p)}
              aria-label="Remove photo"
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 bg-white/[0.02] text-text-muted transition-colors hover:border-white/30 hover:text-text-primary disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            <span className="text-[10px]">{busy ? "Uploading" : "Add"}</span>
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        className="hidden"
      />
    </div>
  );
}
