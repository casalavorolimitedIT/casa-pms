"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { appToast } from "@/components/custom/toast-ui";
import { resolveAccessibleUrl } from "@/lib/media/upload";
import { deleteMedia } from "@/lib/media";
import SmartImage from "./smart-images";

interface MediaMetadata {
  id: string;
  property_id: string;
  bucket_name: string;
  file_key: string;
  file_name: string;
  size_bytes: number;
  mime_type?: string | null;
  alt_text?: string | null;
  is_primary?: boolean;
  expires_at?: string;
  created_at: string;
  view_url?: string;
}

interface MediaGalleryProps {
  propertyId: string;
  featureType:
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
    | "spa_media";
  relatedEntityId?: string;
  title?: string;
  emptyStateText?: string;
  refreshKey?: number;
  allowDelete?: boolean;
}

export function MediaGallery({
  propertyId,
  featureType,
  relatedEntityId,
  title,
  emptyStateText = "No media files yet.",
  refreshKey = 0,
  allowDelete = false,
}: MediaGalleryProps) {
  const [media, setMedia] = useState<MediaMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMedia() {
      const supabase = createClient();
      let query = supabase
        .from("media_metadata")
        .select("*")
        .eq("property_id", propertyId)
        .eq("feature_type", featureType)
        .is("deleted_at", null);

      if (relatedEntityId) {
        query = query.eq("related_entity_id", relatedEntityId);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) {
        appToast.error(`Failed to load media: ${error.message}`);
      } else {
        const mediaWithUrls = await Promise.all(
          (data ?? []).map(async (item) => {
            try {
              const viewUrl = await resolveAccessibleUrl(
                item.bucket_name,
                item.file_key,
              );

              return {
                ...item,
                view_url: viewUrl,
              };
            } catch {
              return item;
            }
          }),
        );

        setMedia(mediaWithUrls);
      }

      setLoading(false);
    }

    loadMedia();
  }, [propertyId, featureType, relatedEntityId, refreshKey]);

  function isImage(item: MediaMetadata) {
    return item.mime_type?.startsWith("image/") ?? /\.(png|jpe?g|webp|gif|avif)$/i.test(item.file_name);
  }

  function isPdf(item: MediaMetadata) {
    return item.mime_type === "application/pdf" || /\.pdf$/i.test(item.file_name);
  }

  async function handleDelete(item: MediaMetadata) {
    try {
      await deleteMedia(item.bucket_name, item.file_key, item.id);
      setMedia((current) => current.filter((entry) => entry.id !== item.id));
      appToast.success("Media removed");
    } catch (error) {
      appToast.error(error instanceof Error ? error.message : "Failed to remove media");
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-zinc-400">Loading media...</p>
        </CardContent>
      </Card>
    );
  }

  if (media.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-zinc-400">{emptyStateText}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-4 p-6">
        {media.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-100 bg-zinc-50/70 p-3"
          >
            <a
              href={item.view_url ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="relative block h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-white"
            >
              {item.view_url && isImage(item) ? (
                <SmartImage
                  src={item.view_url}
                  alt={item.alt_text || item.file_name}
                  width={80}
                  height={80}
                  className="object-cover aspect-square"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  {isPdf(item) ? "PDF" : "FILE"}
                </div>
              )}
            </a>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-900">
                {item.file_name}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-xs">
                  {Math.round(item.size_bytes / 1024)} KB
                </Badge>
                {item.is_primary && (
                  <Badge variant="default" className="text-xs">
                    Primary
                  </Badge>
                )}
                {item.expires_at && (
                  <Badge variant="outline" className="text-xs">
                    Expires {new Date(item.expires_at).toLocaleDateString()}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Uploaded {new Date(item.created_at).toLocaleDateString()}
              </p>
            </div>
            <a
              href={item.view_url ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="shrink-0"
            >
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Open
              </Button>
            </a>
            {allowDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-red-600 hover:text-red-700"
                onClick={() => void handleDelete(item)}
              >
                Remove
              </Button>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
