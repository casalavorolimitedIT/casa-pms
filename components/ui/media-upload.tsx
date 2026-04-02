"use client";

/**
 * components/ui/media-upload.tsx
 *
 * Reusable image/file upload component that supports:
 *  1. File picked from device (gallery / file explorer)
 *  2. Photo taken with device camera (front or rear)
 *  3. Drag-and-drop into the drop zone
 *
 * All selected images are compressed to 50% before upload via lib/media/compress.
 * Upload is handled externally via the `onUpload` callback so this component
 * stays decoupled from bucket/feature-type concerns.
 *
 * Usage:
 *   <MediaUpload
 *     label="Guest ID Document"
 *     accept="image/*,application/pdf"
 *     maxFiles={3}
 *     onUpload={async (files) => { await uploadMedia({ bucket, file: files[0], ... }) }}
 *   />
 */

import {
  useCallback,
  useId,
  useRef,
  useState,
  type DragEvent,
  type ChangeEvent,
} from "react";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/media/compress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MediaFile {
  /** Original file from the input / camera. */
  original: File;
  /** Compressed version (same as original for non-images). */
  compressed: File;
  /** Object URL for preview. Must be revoked when no longer needed. */
  previewUrl: string;
  /** Compression stats. */
  originalSizeBytes: number;
  compressedSizeBytes: number;
}

export interface MediaUploadProps {
  /** Accessible label shown above the drop zone. */
  label?: string;
  /** Accepted file types, e.g. "image/*" or "image/jpeg,image/png". Defaults to "image/*". */
  accept?: string;
  /** Maximum number of files allowed. Defaults to 1. */
  maxFiles?: number;
  /** Called with the processed MediaFile array once the user selects/captures files. */
  onUpload: (files: MediaFile[]) => void | Promise<void>;
  /** Optional additional class names for the root container. */
  className?: string;
  /** Whether uploads are disabled. */
  disabled?: boolean;
  /**
   * Show the "Take Photo" button.
   * Defaults to true. Set to false for contexts where camera is not relevant
   * (e.g., PDF document upload).
   */
  showCamera?: boolean;
  /**
   * Camera facing mode for the capture button.
   * "environment" = rear camera (default for room/asset photos).
   * "user" = front camera (selfie mode).
   */
  cameraFacing?: "environment" | "user";
  /** Compression quality (0–1). Defaults to 0.5. */
  quality?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function savingPercent(original: number, compressed: number): number {
  if (original === 0) return 0;
  return Math.round(((original - compressed) / original) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function MediaUpload({
  label,
  accept = "image/*",
  maxFiles = 1,
  onUpload,
  className,
  disabled = false,
  showCamera = true,
  cameraFacing = "environment",
  quality = 0.5,
}: MediaUploadProps) {
  const inputId = useId();
  const cameraInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Process raw File[] → MediaFile[] (compress + preview) ─────────────────
  const processFiles = useCallback(
    async (rawFiles: FileList | File[]): Promise<void> => {
      const files = Array.from(rawFiles);
      const remaining = maxFiles - mediaFiles.length;
      if (remaining <= 0) {
        setError(`Maximum ${maxFiles} file${maxFiles !== 1 ? "s" : ""} allowed.`);
        return;
      }
      const toProcess = files.slice(0, remaining);
      setError(null);
      setIsProcessing(true);

      try {
        const processed: MediaFile[] = await Promise.all(
          toProcess.map(async (file) => {
            const compressed = await compressImage(file, { quality });
            const previewUrl = URL.createObjectURL(compressed);
            return {
              original: file,
              compressed,
              previewUrl,
              originalSizeBytes: file.size,
              compressedSizeBytes: compressed.size,
            };
          }),
        );
        setMediaFiles((prev) => [...prev, ...processed]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to process file(s).",
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [maxFiles, mediaFiles.length, quality],
  );

  // ── File-input change ──────────────────────────────────────────────────────
  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
        // Reset so the same file can be re-selected
        e.target.value = "";
      }
    },
    [processFiles],
  );

  // ── Drag-and-drop ──────────────────────────────────────────────────────────
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles],
  );

  // ── Remove a staged file ───────────────────────────────────────────────────
  const removeFile = useCallback((index: number) => {
    setMediaFiles((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].previewUrl);
      next.splice(index, 1);
      return next;
    });
    setError(null);
  }, []);

  // ── Confirm & upload ───────────────────────────────────────────────────────
  const handleConfirmUpload = useCallback(async () => {
    if (mediaFiles.length === 0) return;
    setIsUploading(true);
    setError(null);
    try {
      await onUpload(mediaFiles);
      // Revoke preview URLs after successful upload
      mediaFiles.forEach((m) => URL.revokeObjectURL(m.previewUrl));
      setMediaFiles([]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Upload failed. Please retry.",
      );
    } finally {
      setIsUploading(false);
    }
  }, [mediaFiles, onUpload]);

  const canAddMore = mediaFiles.length < maxFiles && !disabled;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}

      {/* Drop zone (shown when more files can be added) */}
      {canAddMore && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Drop files here or click to upload"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              fileInputRef.current?.click();
            }
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed",
            "cursor-pointer px-6 py-8 text-center transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/40",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          {/* Upload icon */}
          <svg
            className="h-8 w-8 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>

          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Click to upload</span>
            {" "}or drag and drop
          </p>
          {maxFiles > 1 && (
            <p className="text-xs text-muted-foreground">
              {mediaFiles.length}/{maxFiles} files selected
            </p>
          )}

          {isProcessing && (
            <p className="text-xs text-primary animate-pulse">
              Compressing…
            </p>
          )}
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple={maxFiles > 1}
        className="sr-only"
        onChange={handleFileChange}
        disabled={disabled}
        aria-label={label ?? "Upload file"}
      />

      {/* Camera input: capture attribute triggers native camera on mobile */}
      {showCamera && (
        <input
          ref={cameraInputRef}
          id={cameraInputId}
          type="file"
          accept="image/*"
          capture={cameraFacing}
          className="sr-only"
          onChange={handleFileChange}
          disabled={disabled}
          aria-label="Take photo with camera"
        />
      )}

      {/* Action buttons */}
      {canAddMore && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isProcessing}
            onClick={() => fileInputRef.current?.click()}
          >
            {/* Folder icon */}
            <svg
              className="mr-1.5 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
              />
            </svg>
            Choose from device
          </Button>

          {showCamera && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || isProcessing}
              onClick={() => cameraInputRef.current?.click()}
            >
              {/* Camera icon */}
              <svg
                className="mr-1.5 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
                />
              </svg>
              Take photo
            </Button>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Preview grid */}
      {mediaFiles.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-foreground">
            {mediaFiles.length} file{mediaFiles.length !== 1 ? "s" : ""} ready to upload
          </p>

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {mediaFiles.map((mf, i) => (
              <li
                key={mf.previewUrl}
                className="group relative overflow-hidden rounded-md border bg-muted/40"
              >
                {/* Preview */}
                {mf.compressed.type.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mf.previewUrl}
                    alt={`Preview ${i + 1}`}
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center text-muted-foreground">
                    <svg
                      className="h-10 w-10"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                      />
                    </svg>
                  </div>
                )}

                {/* Compression stats badge */}
                {mf.compressed.type.startsWith("image/") &&
                  mf.originalSizeBytes !== mf.compressedSizeBytes && (
                    <Badge
                      variant="secondary"
                      className="absolute left-1 top-1 text-xs gap-0.5 bg-black/60 text-white border-0"
                    >
                      -{savingPercent(mf.originalSizeBytes, mf.compressedSizeBytes)}%
                    </Badge>
                  )}

                {/* File size */}
                <div className="px-2 py-1.5">
                  <p
                    className="truncate text-xs font-medium text-foreground"
                    title={mf.compressed.name}
                  >
                    {mf.compressed.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(mf.compressedSizeBytes)}
                    {mf.originalSizeBytes !== mf.compressedSizeBytes && (
                      <span className="ml-1 text-muted-foreground/70 line-through">
                        {formatBytes(mf.originalSizeBytes)}
                      </span>
                    )}
                  </p>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  aria-label={`Remove ${mf.compressed.name}`}
                  className={cn(
                    "absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full",
                    "bg-black/60 text-white opacity-0 transition-opacity",
                    "group-hover:opacity-100 focus:opacity-100",
                  )}
                >
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>

          {/* Upload confirm button */}
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleConfirmUpload}
              disabled={isUploading || isProcessing}
            >
              {isUploading ? (
                <>
                  <svg
                    className="mr-2 h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Uploading…
                </>
              ) : (
                `Upload ${mediaFiles.length} file${mediaFiles.length !== 1 ? "s" : ""}`
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              disabled={isUploading}
              onClick={() => {
                mediaFiles.forEach((m) => URL.revokeObjectURL(m.previewUrl));
                setMediaFiles([]);
                setError(null);
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
