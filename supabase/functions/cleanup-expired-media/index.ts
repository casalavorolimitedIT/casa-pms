/**
 * supabase/functions/cleanup-expired-media/index.ts
 * 
 * Nightly retention cleanup job that deletes expired media files.
 * Triggered by a Supabase scheduled function (cron).
 * 
 * Deletes files where expires_at < now() from:
 * - Supabase Storage buckets
 * - media_metadata table
 * - Writes audit log entries for tracking
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

interface CleanupStats {
  filesDeleted: number;
  metadataRowsDeleted: number;
  auditEntriesCreated: number;
  errors: string[];
}

async function handler(_req: Request): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase environment variables" }),
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const stats: CleanupStats = {
    filesDeleted: 0,
    metadataRowsDeleted: 0,
    auditEntriesCreated: 0,
    errors: [],
  };

  try {
    // 1. Fetch all expired media entries
    const { data: expiredMedia, error: queryError } = await supabase
      .schema("pms")
      .from("media_metadata")
      .select("id, bucket_name, file_key, expires_at")
      .lt("expires_at", new Date().toISOString())
      .is("deleted_at", null);

    if (queryError) {
      stats.errors.push(`Query failed: ${queryError.message}`);
      return new Response(JSON.stringify({ stats }), { status: 500 });
    }

    if (!expiredMedia || expiredMedia.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No expired media to clean up",
          stats,
        }),
        { status: 200 },
      );
    }

    // 2. Delete files from storage and metadata rows
    for (const media of expiredMedia) {
      try {
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from(media.bucket_name)
          .remove([media.file_key]);

        if (storageError) {
          stats.errors.push(
            `Failed to delete ${media.file_key}: ${storageError.message}`,
          );
          continue;
        }

        stats.filesDeleted++;

        // Write audit log entry for deletion
        const { error: auditError } = await supabase
          .schema("pms")
          .from("media_audit_log")
          .insert({
            media_metadata_id: media.id,
            bucket_name: media.bucket_name,
            file_key: media.file_key,
            action: "expire",
            reason: `Auto-deleted by retention policy (expired: ${media.expires_at})`,
          });

        if (!auditError) {
          stats.auditEntriesCreated++;
        } else {
          stats.errors.push(`Failed to log deletion for ${media.file_key}`);
        }

        // Preserve an audit trail by soft-deleting the metadata row.
        const { error: deleteError } = await supabase
          .schema("pms")
          .from("media_metadata")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", media.id);

        if (!deleteError) {
          stats.metadataRowsDeleted++;
        } else {
          stats.errors.push(`Failed to delete metadata row ${media.id}`);
        }
      } catch (err) {
        stats.errors.push(
          `Unexpected error processing ${media.file_key}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    return new Response(
      JSON.stringify({
        message: `Cleanup completed: ${stats.filesDeleted} files deleted`,
        stats,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
        stats,
      }),
      { status: 500 },
    );
  }
}

Deno.serve(handler);
