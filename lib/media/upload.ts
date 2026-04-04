/**
 * lib/media/upload.ts
 *
 * Unified Supabase Storage upload utility.
 * Compresses images to 50% before upload, registers metadata in
 * pms.media_metadata, and writes an audit log entry.
 *
 * Client-side only: uses compressImage() which requires the Canvas API.
 * Must be called from a 'use client' component or browser context.
 */

import { createClient } from "@/lib/supabase/client";
import { compressImage, type CompressOptions } from "./compress";

const PRIVATE_BUCKETS = new Set([
  "guest-documents",
  "guest-profiles",
  "asset-registry",
  "work-order-photos",
  "housekeeping-condition",
  "lost-and-found",
  "cleaning-tasks",
  "maintenance-proof",
  "guest-messages-media",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type FeatureType =
  | "guest_id"
  | "guest_profile"
  | "room_gallery"
  | "room_condition"
  | "lost_found"
  | "cleaning_task"
  | "asset"
  | "work_order"
  | "maintenance_proof"
  | "menu_item"
  | "event_gallery"
  | "department_photo"
  | "property_branding"
  | "message_attachment"
  | "concierge_catalog"
  | "spa_media"
  | "corporate_logo";

export interface UploadMediaInput {
  /** Supabase Storage bucket name, e.g. "guest-documents" */
  bucket: string;
  /** File to upload. Images are compressed automatically before upload. */
  file: File;
  /** Property this file belongs to (required for RLS + metadata). */
  propertyId: string;
  /** Semantic category of the file (used for retention policy and search). */
  featureType: FeatureType;
  /** Optional owner (staff user who uploaded). Defaults to current auth session user. */
  ownerId?: string;
  /** Optional guest this file belongs to (for KYC documents, messages, etc.). */
  guestId?: string;
  /** Optional linked entity: room_id, asset_id, work_order_id, etc. */
  relatedEntityId?: string;
  relatedEntityType?: string;
  /** Alt text for accessibility (room gallery, menu images). */
  altText?: string;
  /** Sort order for ordered galleries. */
  sortOrder?: number;
  /** Mark as primary image (first image in room gallery, menu item hero). */
  isPrimary?: boolean;
  /**
   * ISO-8601 timestamp after which the file should be auto-deleted.
   * Leave undefined for permanent storage.
   * Retention examples:
   *   guest-documents       : +7 years
   *   room_condition        : +90 days
   *   message_attachment    : +1 year
   */
  expiresAt?: string;
  /** Override compression options. Default: quality 0.5 for JPEG/WebP. */
  compressOptions?: CompressOptions;
}

export interface UploadMediaResult {
  /** UUID of the new pms.media_metadata row. */
  metadataId: string;
  /** Full public URL or signed URL for the file. */
  url: string;
  /** Supabase Storage path used as the file key. */
  fileKey: string;
  /** The (possibly compressed) file that was actually uploaded. */
  uploadedFile: File;
  /** Original file size in bytes (before compression). */
  originalSizeBytes: number;
  /** Final file size in bytes (after compression). */
  finalSizeBytes: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Builds a deterministic storage path for a file. */
function buildFileKey(
  propertyId: string,
  featureType: FeatureType,
  fileName: string,
): string {
  const timestamp = Date.now();
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `properties/${propertyId}/${featureType}/${timestamp}_${sanitized}`;
}

export function isPrivateBucket(bucket: string) {
  return PRIVATE_BUCKETS.has(bucket);
}

export async function resolveAccessibleUrl(
  bucket: string,
  fileKey: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const supabase = createClient();

  if (isPrivateBucket(bucket)) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(fileKey, expiresInSeconds);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(fileKey);
  return data.publicUrl;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main upload function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compresses the file (if it's an image), uploads to Supabase Storage,
 * registers a pms.media_metadata row, and writes a media_audit_log entry.
 *
 * @throws {Error} if the storage upload or metadata insert fails.
 *
 * @example
 * const result = await uploadMedia({
 *   bucket: 'guest-documents',
 *   file: idFile,
 *   propertyId: 'abc-123',
 *   featureType: 'guest_id',
 *   guestId: guest.id,
 *   expiresAt: new Date(Date.now() + 7 * 365.25 * 24 * 60 * 60 * 1000).toISOString(),
 * });
 */
export async function uploadMedia(
  input: UploadMediaInput,
): Promise<UploadMediaResult> {
  const {
    bucket,
    file,
    propertyId,
    featureType,
    guestId,
    relatedEntityId,
    relatedEntityType,
    altText,
    sortOrder,
    isPrimary = false,
    expiresAt,
    compressOptions,
  } = input;

  const supabase = createClient();
  const originalSizeBytes = file.size;

  // ── 1. Compress image ──────────────────────────────────────────────────────
  const uploadFile = await compressImage(file, compressOptions ?? { quality: 0.5 });
  const fileKey = buildFileKey(propertyId, featureType, uploadFile.name);

  // ── 2. Upload to Supabase Storage ──────────────────────────────────────────
  const { error: storageError } = await supabase.storage
    .from(bucket)
    .upload(fileKey, uploadFile, {
      contentType: uploadFile.type,
      upsert: false,
    });

  if (storageError) {
    throw new Error(`Storage upload failed: ${storageError.message}`);
  }

  // ── 3. Resolve URL (signed for private buckets, public for public buckets) ─
  const url = await resolveAccessibleUrl(bucket, fileKey);

  // ── 4. Register metadata row ───────────────────────────────────────────────
  const { data: metaRow, error: metaError } = await supabase
    .from("media_metadata")
    .insert({
      property_id: propertyId,
      bucket_name: bucket,
      file_key: fileKey,
      file_name: uploadFile.name,
      mime_type: uploadFile.type,
      size_bytes: uploadFile.size,
      owner_id: input.ownerId ?? null,
      guest_id: guestId ?? null,
      feature_type: featureType,
      related_entity_id: relatedEntityId ?? null,
      related_entity_type: relatedEntityType ?? null,
      is_primary: isPrimary,
      sort_order: sortOrder ?? null,
      alt_text: altText ?? null,
      expires_at: expiresAt ?? null,
    })
    .select("id")
    .single();

  if (metaError) {
    // Best-effort: delete the uploaded file so storage isn't orphaned.
    await supabase.storage.from(bucket).remove([fileKey]);
    throw new Error(`Metadata registration failed: ${metaError.message}`);
  }

  // ── 5. Write audit log entry ───────────────────────────────────────────────
  await supabase.from("media_audit_log").insert({
    media_metadata_id: metaRow.id,
    bucket_name: bucket,
    file_key: fileKey,
    action: "upload",
    actor_id: input.ownerId ?? null,
  });

  return {
    metadataId: metaRow.id,
    url,
    fileKey,
    uploadedFile: uploadFile,
    originalSizeBytes,
    finalSizeBytes: uploadFile.size,
  };
}

/**
 * Deletes a file from Supabase Storage and soft-marks its metadata row
 * as deleted by inserting a 'delete' audit log entry.
 * Hard-deletion of the metadata row is left to the retention cron job.
 */
export async function deleteMedia(
  bucket: string,
  fileKey: string,
  metadataId: string,
  actorId?: string,
): Promise<void> {
  const supabase = createClient();

  const [{ error: storageErr }] = await Promise.all([
    supabase.storage.from(bucket).remove([fileKey]),
  ]);

  if (storageErr) {
    throw new Error(`Storage delete failed: ${storageErr.message}`);
  }

  await supabase.from("media_audit_log").insert({
    media_metadata_id: metadataId,
    bucket_name: bucket,
    file_key: fileKey,
    action: "delete",
    actor_id: actorId ?? null,
  });

  await supabase
    .from("media_metadata")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", metadataId);
}
