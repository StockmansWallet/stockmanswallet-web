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

export function ProfileAvatar({ avatarUrl, firstName, lastName, email }: ProfileAvatarProps) {
  const [currentUrl, setCurrentUrl] = useState(avatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = firstName && lastName
    ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    : "SW";
  const displayName = firstName && lastName ? `${firstName} ${lastName}` : email;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size (max 2MB)
    if (!file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) return;

    setIsUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const ext = file.name.split(".").pop() || "jpg";
      const path = `avatars/${user.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        console.error("Upload error:", uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(path);

      // Append cache-buster to force refresh
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const result = await updateAvatarUrl(publicUrl);
      if (!result.error) {
        setCurrentUrl(publicUrl);
      }
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove() {
    const result = await removeAvatar();
    if (!result.error) {
      setCurrentUrl("");
    }
  }

  return (
    <div className="flex items-center gap-5">
      <div className="relative">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="group relative block h-20 w-20 rounded-full focus:outline-none focus:ring-2 focus:ring-brand/50 focus:ring-offset-2 focus:ring-offset-background"
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
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand/15 text-brand">
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
        <p className="truncate text-base font-semibold text-text-primary">{displayName}</p>
        {email && firstName && (
          <p className="truncate text-sm text-text-muted">{email}</p>
        )}
        <div className="mt-1.5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="text-xs font-medium text-brand hover:text-brand-light transition-colors"
          >
            {currentUrl ? "Change photo" : "Upload photo"}
          </button>
          {currentUrl && (
            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex items-center gap-1 text-xs font-medium text-text-muted hover:text-error transition-colors"
            >
              <X className="h-3 w-3" />
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
