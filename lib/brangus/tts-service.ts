// Brangus TTS service - calls the brangus-tts Edge Function and plays audio
// Returns MP3 audio via ElevenLabs, no fallback (text chat is fine if TTS fails)

import { createClient } from "../supabase/client";

// Strip markdown formatting before sending to TTS
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // bold
    .replace(/\*(.*?)\*/g, "$1") // italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/^[-*]\s+/gm, "") // bullet points
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/---+/g, "") // horizontal rules
    .trim();
}

// Expand common abbreviations and units for natural speech
function expandForSpeech(text: string): string {
  return text
    .replace(/\bkg\b/gi, "kilograms")
    .replace(/\bhd\b/gi, "head")
    .replace(/\bc\/kg\b/gi, "cents per kilogram")
    .replace(/\b(\d+)k\b/gi, "$1 thousand")
    .replace(/\$(\d{1,3}),(\d{3}),(\d{3})/g, "$$$1$2$3") // remove commas in large dollar amounts for TTS
    .replace(/\bMLA\b/g, "M.L.A.")
    .replace(/\bAECL\b/g, "A.E.C.L.");
}

const MAX_TEXT_LENGTH = 5000;

export async function fetchTTSAudio(text: string): Promise<Blob | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;

  const cleaned = expandForSpeech(stripMarkdown(text));
  if (!cleaned) return null;

  // Truncate if over limit (edge function enforces 5000 char max)
  const truncated = cleaned.length > MAX_TEXT_LENGTH
    ? cleaned.slice(0, MAX_TEXT_LENGTH)
    : cleaned;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/brangus-tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabaseAnonKey,
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({ text: truncated }),
    });

    if (!res.ok) {
      console.error("TTS request failed:", res.status);
      return null;
    }

    return await res.blob();
  } catch (err) {
    console.error("TTS fetch error:", err);
    return null;
  }
}

// Simple audio player - manages a single playback at a time
let currentAudio: HTMLAudioElement | null = null;
let currentBlobUrl: string | null = null;

export function playAudioBlob(blob: Blob): HTMLAudioElement {
  // Stop any existing playback
  stopPlayback();

  const url = URL.createObjectURL(blob);
  currentBlobUrl = url;
  const audio = new Audio(url);
  currentAudio = audio;

  audio.addEventListener("ended", () => {
    cleanup();
  });

  audio.addEventListener("error", () => {
    console.error("Audio playback error");
    cleanup();
  });

  audio.play().catch((err) => {
    console.error("Audio play failed:", err);
    cleanup();
  });

  return audio;
}

export function stopPlayback(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    cleanup();
  }
}

export function isPlaying(): boolean {
  return currentAudio !== null && !currentAudio.paused;
}

function cleanup(): void {
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
  currentAudio = null;
}
