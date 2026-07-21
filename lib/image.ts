/**
 * Client-side screenshot compression before upload.
 *
 * Why: the screenshot is sent to Gemini as a base64 data URL, and base64
 * inflates bytes by ~33%. A raw 6 MB phone screenshot becomes ~8 MB on the
 * wire, which is slow, costs more tokens, and can trip request-size limits.
 *
 * Accuracy note: these are text-heavy screenshots, so we keep the long edge
 * generous (1600px) and quality high (0.85). Downscaling below ~1000px starts
 * to blur small glyphs like "2h 0m 25s" and hurts OCR — so we never go lower.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // hard reject above this
const MAX_DIM = 1600; // long edge
const QUALITY = 0.85;
const SKIP_BELOW = 400 * 1024; // already small — don't re-encode

export type CompressResult = {
  file: File;
  originalBytes: number;
  finalBytes: number;
  skipped: boolean;
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}

export async function compressScreenshot(file: File): Promise<CompressResult> {
  const originalBytes = file.size;

  // Small files (and anything non-raster we can't canvas) pass through.
  if (file.size <= SKIP_BELOW) {
    return { file, originalBytes, finalBytes: originalBytes, skipped: true };
  }

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    // If decoding fails, let the server deal with the original.
    return { file, originalBytes, finalBytes: originalBytes, skipped: true };
  }

  const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { file, originalBytes, finalBytes: originalBytes, skipped: true };

  // White backdrop so transparent PNGs don't turn black in JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY)
  );

  // Keep the original if compression didn't actually help.
  if (!blob || blob.size >= originalBytes) {
    return { file, originalBytes, finalBytes: originalBytes, skipped: true };
  }

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return {
    file: new File([blob], name, { type: "image/jpeg" }),
    originalBytes,
    finalBytes: blob.size,
    skipped: false,
  };
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
