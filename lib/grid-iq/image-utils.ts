// Grid IQ image compression utility.
// Compresses images before sending to AI extraction to reduce cost and latency.
// Mirrors iOS normaliseImageData() behaviour - target max ~3.75 MB.

const MAX_FILE_SIZE = 3.75 * 1024 * 1024; // 3.75 MB
const INITIAL_QUALITY = 0.7;
const FALLBACK_QUALITY = 0.5;
const MAX_DIMENSION = 4096; // Max width/height before resizing

/**
 * Compress an image file to JPEG, reducing quality and dimensions if needed.
 * Returns a base64 string (no data URI prefix) ready for Claude API.
 */
export async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  // Calculate scaled dimensions if image exceeds max
  let targetWidth = width;
  let targetHeight = height;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    targetWidth = Math.round(width * scale);
    targetHeight = Math.round(height * scale);
  }

  // Draw to canvas and export as JPEG
  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to create canvas context for image compression.");
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  // Try initial quality
  let blob = await canvas.convertToBlob({ type: "image/jpeg", quality: INITIAL_QUALITY });

  // If still too large, reduce quality
  if (blob.size > MAX_FILE_SIZE) {
    blob = await canvas.convertToBlob({ type: "image/jpeg", quality: FALLBACK_QUALITY });
  }

  // If still too large, halve dimensions and try again
  if (blob.size > MAX_FILE_SIZE) {
    const halfWidth = Math.round(targetWidth / 2);
    const halfHeight = Math.round(targetHeight / 2);
    const smallCanvas = new OffscreenCanvas(halfWidth, halfHeight);
    const smallCtx = smallCanvas.getContext("2d");
    if (!smallCtx) throw new Error("Failed to create canvas context for resize.");

    // Re-create bitmap from the existing blob to draw scaled
    const tmpBitmap = await createImageBitmap(blob);
    smallCtx.drawImage(tmpBitmap, 0, 0, halfWidth, halfHeight);
    tmpBitmap.close();

    blob = await smallCanvas.convertToBlob({ type: "image/jpeg", quality: FALLBACK_QUALITY });
  }

  // Convert blob to base64
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Check if a file is an image that should be compressed.
 */
export function isCompressibleImage(file: File): boolean {
  const type = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return (
    type.startsWith("image/") ||
    ["jpg", "jpeg", "png", "heic", "webp"].includes(ext)
  );
}
