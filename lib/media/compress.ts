/**
 * lib/media/compress.ts
 *
 * Client-side image compression using the Canvas API.
 * Reduces file size by 50% before uploading to Supabase Storage.
 *
 * Strategy:
 *  - JPEG / WebP  → re-encode at quality 0.5 (50%)
 *  - PNG          → resize dimensions to 50% (lossless codec, so we shrink pixels)
 *  - Other types  → returned unchanged (PDF, video, etc.)
 *
 * This module is client-only (uses browser APIs: Image, Canvas, FileReader).
 * Never import this in Server Components or API routes.
 */

export interface CompressOptions {
  /** 0–1 quality for JPEG/WebP re-encoding. Defaults to 0.5. */
  quality?: number;
  /**
   * For PNG: scale factor applied to both dimensions before re-encoding.
   * Defaults to 0.5 (half-resolution).
   */
  scaleForPng?: number;
  /** Max width in px. Image is proportionally scaled down if wider. Defaults to 2560. */
  maxWidth?: number;
  /** Max height in px. Image is proportionally scaled down if taller. Defaults to 1440. */
  maxHeight?: number;
}

const LOSSY_TYPES = ["image/jpeg", "image/webp"] as const;

/**
 * Loads a File into an HTMLImageElement via a blob URL.
 * Resolves once the image is fully decoded.
 */
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
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    img.src = url;
  });
}

/**
 * Calculates output dimensions.
 * For JPEG/WebP: respect maxWidth/maxHeight only.
 * For PNG: apply scaleForPng then cap at maxWidth/maxHeight.
 */
function calcDimensions(
  naturalWidth: number,
  naturalHeight: number,
  isPng: boolean,
  opts: Required<CompressOptions>,
): { width: number; height: number } {
  let w = naturalWidth;
  let h = naturalHeight;

  if (isPng) {
    w = Math.round(w * opts.scaleForPng);
    h = Math.round(h * opts.scaleForPng);
  }

  if (w > opts.maxWidth) {
    h = Math.round((h * opts.maxWidth) / w);
    w = opts.maxWidth;
  }
  if (h > opts.maxHeight) {
    w = Math.round((w * opts.maxHeight) / h);
    h = opts.maxHeight;
  }

  // Canvas must be at least 1×1
  return { width: Math.max(1, w), height: Math.max(1, h) };
}

/**
 * Compresses a single image File.
 *
 * Returns the original file unchanged if:
 * - The MIME type is not an image
 * - The environment does not support OffscreenCanvas or HTMLCanvasElement
 *
 * @example
 * const compressed = await compressImage(file, { quality: 0.5 });
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const opts: Required<CompressOptions> = {
    quality: options.quality ?? 0.5,
    scaleForPng: options.scaleForPng ?? 0.5,
    maxWidth: options.maxWidth ?? 2560,
    maxHeight: options.maxHeight ?? 1440,
  };

  // Only handle image/* MIME types.
  if (!file.type.startsWith("image/")) {
    return file;
  }

  // Verify Canvas API is available (not in SSR / Node environments).
  if (typeof document === "undefined") {
    return file;
  }

  const mimeOut = LOSSY_TYPES.includes(
    file.type as (typeof LOSSY_TYPES)[number],
  )
    ? file.type
    : "image/jpeg"; // re-encode PNG as JPEG for maximum compression

  const isPng = file.type === "image/png";

  const img = await loadImage(file);
  const { width, height } = calcDimensions(
    img.naturalWidth,
    img.naturalHeight,
    isPng,
    opts,
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(img, 0, 0, width, height);

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas.toBlob returned null"));
          return;
        }
        // Preserve original file name; update extension if MIME changed.
        const ext = mimeOut === "image/jpeg" ? ".jpg" : `.${mimeOut.split("/")[1]}`;
        const baseName = file.name.replace(/\.[^.]+$/, "");
        const compressed = new File([blob], `${baseName}${ext}`, {
          type: mimeOut,
          lastModified: Date.now(),
        });
        resolve(compressed);
      },
      mimeOut,
      opts.quality,
    );
  });
}

/**
 * Convenience wrapper to compress an array of files.
 * Non-image files are passed through unchanged.
 */
export async function compressImages(
  files: File[],
  options: CompressOptions = {},
): Promise<File[]> {
  return Promise.all(files.map((f) => compressImage(f, options)));
}
