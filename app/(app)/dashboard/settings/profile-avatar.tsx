"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Camera, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateAvatarUrl, removeAvatar } from "./actions";

interface ProfileAvatarProps {
  avatarUrl: string;
  firstName: string;
  lastName: string;
  email: string;
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function formatBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProfileAvatar({ avatarUrl, firstName, lastName, email }: ProfileAvatarProps) {
  const [currentUrl, setCurrentUrl] = useState(avatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials =
    firstName && lastName ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() : "SW";
  const displayName = firstName && lastName ? `${firstName} ${lastName}` : email;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setError(
        "Image format not supported. Please use JPG, PNG, WebP, or GIF (HEIC photos from iPhone need to be converted)."
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError(
        `Image is ${formatBytes(file.size)}. Maximum size is 2 MB. Try resizing or compressing it.`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("You appear to be signed out. Please refresh and try again.");
        return;
      }

      const ext = file.name.split(".").pop() || "jpg";
      const path = `avatars/${user.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`);
        return;
      }

      const { data: urlData } = supabase.storage.from("profile-photos").getPublicUrl(path);

      // Append cache-buster to force refresh
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const result = await updateAvatarUrl(publicUrl);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCurrentUrl(publicUrl);
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setError(null);
    const result = await removeAvatar();
    if (result.error) {
      setError(result.error);
      return;
    }
    setCurrentUrl("");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-5">
        <div className="relative">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="group focus:ring-brand/50 focus:ring-offset-background relative block h-20 w-20 rounded-full focus:ring-2 focus:ring-offset-2 focus:outline-none"
          >
            {currentUrl ? (
              <Image
                src={currentUrl}
                alt={displayName}
                width={80}
                height={80}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="bg-brand/15 text-brand flex h-20 w-20 items-center justify-center rounded-full">
                <span className="text-2xl font-bold">{initials}</span>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-5 w-5 text-white" />
            </div>
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </div>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="min-w-0">
          <p className="text-text-primary truncate text-base font-semibold">{displayName}</p>
          {email && firstName && <p className="text-text-muted truncate text-sm">{email}</p>}
          <div className="mt-1.5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-brand hover:text-brand-light text-xs font-medium transition-colors"
            >
              {currentUrl ? "Change photo" : "Upload photo"}
            </button>
            {currentUrl && (
              <button
                type="button"
                onClick={handleRemove}
                className="text-text-muted hover:text-error inline-flex items-center gap-1 text-xs font-medium transition-colors"
              >
                <X className="h-3 w-3" />
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
      {error && (
        <div
          role="alert"
          className="border-error/40 bg-error/10 text-error rounded-xl border px-4 py-3 text-sm"
        >
          {error}
        </div>
      )}
    </div>
  );
}
