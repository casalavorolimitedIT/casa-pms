"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { MediaUpload, type MediaFile } from "@/components/ui/media-upload";
import { deleteMedia, uploadMedia } from "@/lib/media";
import { resolveAccessibleUrl } from "@/lib/media/upload";
import { appToast } from "@/components/custom/toast-ui";
import { createClient } from "@/lib/supabase/client";
import { formatIsoDate } from "@/lib/pms/formatting";
import SmartImage from "./smart-images";

interface AssetPhoto {
  id: string;
  bucket_name: string;
  file_key: string;
  file_name: string;
  mime_type?: string | null;
  alt_text?: string | null;
  sort_order?: number | null;
  is_primary?: boolean | null;
  created_at: string;
  view_url?: string;
}

interface AssetPhotosGalleryProps {
  assetId: string;
  propertyId: string;
  assetName?: string;
}

function threeYearsFromNow(): string {
  return new Date(Date.now() + 3 * 365.25 * 24 * 60 * 60 * 1000).toISOString();
}

function isImage(photo: AssetPhoto) {
  return photo.mime_type?.startsWith("image/") ?? /\.(png|jpe?g|webp|gif|avif)$/i.test(photo.file_name);
}

function AssetPhotoCard({
  photo,
  onSetPrimary,
  onRemove,
}: {
  photo: AssetPhoto;
  onSetPrimary: (id: string) => Promise<void>;
  onRemove: (photo: AssetPhoto) => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id: photo.id });

  return (
    <li
      ref={setNodeRef}
      className={`group relative flex items-center gap-5 overflow-hidden rounded-[20px] border border-black/5 bg-white/40 p-4 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.02)] backdrop-blur-xl transition-all duration-300 hover:border-black/10 hover:bg-white/60 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.04)] sm:gap-6 ${
        isDragging ? "z-10 scale-[1.02] shadow-[0_12px_40px_-4px_rgba(0,0,0,0.08)] opacity-95" : "z-0 scale-100 opacity-100"
      }`}
    >
      <button
        type="button"
        className="flex h-full min-h-[5rem] w-8 items-center justify-center rounded-xl bg-black/5 text-black/40 transition-opacity opacity-100 hover:bg-black/10 sm:w-10 cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
           <path d="M5.5 4.625C6.12132 4.625 6.625 4.12132 6.625 3.5C6.625 2.87868 6.12132 2.375 5.5 2.375C4.87868 2.375 4.375 2.87868 4.375 3.5C4.375 4.12132 4.87868 4.625 5.5 4.625ZM9.5 4.625C10.1213 4.625 10.625 4.12132 10.625 3.5C10.625 2.87868 10.1213 2.375 9.5 2.375C8.87868 2.375 8.375 2.87868 8.375 3.5C8.375 4.12132 8.87868 4.625 9.5 4.625ZM10.625 7.5C10.625 8.12132 10.1213 8.625 9.5 8.625C8.87868 8.625 8.375 8.12132 8.375 7.5C8.375 6.87868 8.87868 6.375 9.5 6.375C10.1213 6.375 10.625 6.87868 10.625 7.5ZM5.5 8.625C6.12132 8.625 6.625 8.12132 6.625 7.5C6.625 6.87868 6.12132 6.375 5.5 6.375C4.87868 6.375 4.375 6.87868 4.375 7.5C4.375 8.12132 4.87868 8.625 5.5 8.625ZM10.625 11.5C10.625 12.1213 10.1213 12.625 9.5 12.625C8.87868 12.625 8.375 12.1213 8.375 11.5C8.375 10.8787 8.87868 10.375 9.5 10.375C10.1213 10.375 10.625 10.8787 10.625 11.5ZM5.5 12.625C6.12132 12.625 6.625 12.1213 6.625 11.5C6.625 10.8787 6.12132 10.375 5.5 10.375C4.87868 10.375 4.375 10.8787 4.375 11.5C4.375 12.1213 4.87868 12.625 5.5 12.625Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
        </svg>
      </button>

      <a
        href={photo.view_url ?? "#"}
        target="_blank"
        rel="noreferrer"
        className="relative block h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-black/5 bg-black/5 sm:h-24 sm:w-24"
      >
        {photo.view_url && isImage(photo) ? (
          <SmartImage
            src={photo.view_url}
            alt={photo.alt_text || photo.file_name}
            width={96}
            height={96}
            className="h-full w-full object-cover aspect-square transition-transform duration-500 scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-widest text-black/40">
            File
          </div>
        )}
      </a>

      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <p className="max-w-[150px] truncate text-sm font-semibold tracking-tight text-foreground sm:max-w-[200px]">{photo.file_name}</p>
          {photo.is_primary && (
            <Badge variant="default" className="h-5 px-1.5 text-[10px] uppercase tracking-wider backdrop-blur-md transition-all border-none bg-zinc-900 text-white">
              Primary
            </Badge>
          )}
          <Badge variant="outline" className="h-5 border-black/10 bg-transparent px-1.5 text-[10px] text-muted-foreground">
            #{(photo.sort_order ?? 0) + 1}
          </Badge>
        </div>
        <p className="mt-2 text-[13px] text-muted-foreground/80">
          Uploaded {formatIsoDate(photo.created_at)}
        </p>
      </div>

      <div className="flex shrink-0 -translate-x-2 flex-col items-end justify-center gap-2 transition-all duration-300 translate-x-0 opacity-100 sm:flex-row sm:items-center">
        {!photo.is_primary && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 rounded-lg px-3 text-xs font-medium hover:bg-black/5"
            onClick={() => void onSetPrimary(photo.id)}
          >
            Make Primary
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 rounded-lg border-red-200 bg-red-50 px-3 text-xs font-medium text-red-600 hover:bg-red-100 hover:text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20"
          onClick={() => void onRemove(photo)}
        >
          Remove
        </Button>
      </div>
    </li>
  );
}

export function AssetPhotosGallery({ assetId, propertyId, assetName = "Asset" }: AssetPhotosGalleryProps) {
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<AssetPhoto[]>([]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const orderedIds = useMemo(() => photos.map((photo) => photo.id), [photos]);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("media_metadata")
      .select("id, bucket_name, file_key, file_name, mime_type, alt_text, sort_order, is_primary, created_at")
      .eq("property_id", propertyId)
      .eq("feature_type", "asset")
      .eq("related_entity_id", assetId)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (error) {
      appToast.error(`Failed to load photos: ${error.message}`);
      setLoading(false);
      return;
    }

    const withUrls = await Promise.all(
      (data ?? []).map(async (item) => ({
        ...item,
        view_url: await resolveAccessibleUrl(item.bucket_name, item.file_key),
      })),
    );

    setPhotos(withUrls);
    setLoading(false);
  }, [assetId, propertyId]);

  useEffect(() => {
    void loadPhotos();
  }, [loadPhotos]);

  const persistSortOrder = useCallback(async (nextPhotos: AssetPhoto[]) => {
    const supabase = createClient();
    const results = await Promise.all(
      nextPhotos.map((photo, index) =>
        supabase.from("media_metadata").update({ sort_order: index }).eq("id", photo.id),
      ),
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) {
      throw new Error(failed.error.message);
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = photos.findIndex((photo) => photo.id === active.id);
    const newIndex = photos.findIndex((photo) => photo.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(photos, oldIndex, newIndex).map((photo, index) => ({
      ...photo,
      sort_order: index,
    }));

    setPhotos(reordered);

    try {
      await persistSortOrder(reordered);
      appToast.success("Photo order updated");
    } catch (error) {
      appToast.error(error instanceof Error ? error.message : "Failed to save order");
      void loadPhotos();
    }
  }, [loadPhotos, persistSortOrder, photos]);

  const handleSetPrimary = useCallback(async (photoId: string) => {
    const supabase = createClient();
    const results = await Promise.all(
      photos.map((photo) =>
        supabase.from("media_metadata").update({ is_primary: photo.id === photoId }).eq("id", photo.id),
      ),
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) {
      appToast.error(failed.error.message);
      return;
    }

    setPhotos((current) => current.map((photo) => ({ ...photo, is_primary: photo.id === photoId })));
    appToast.success("Primary photo updated");
  }, [photos]);

  const handleRemove = useCallback(async (photo: AssetPhoto) => {
    try {
      await deleteMedia(photo.bucket_name, photo.file_key, photo.id);
      setPhotos((current) => current.filter((entry) => entry.id !== photo.id));
      appToast.success("Photo removed");
    } catch (error) {
      appToast.error(error instanceof Error ? error.message : "Failed to remove photo");
    }
  }, []);

  const handleUpload = useCallback(async (files: MediaFile[]) => {
    setUploading(true);

    try {
      for (const [index, mediaFile] of files.entries()) {
        await uploadMedia({
          bucket: "asset-registry",
          file: mediaFile.compressed,
          propertyId,
          featureType: "asset",
          relatedEntityId: assetId,
          relatedEntityType: "asset",
          altText: `${assetName} photo`,
          expiresAt: threeYearsFromNow(),
          sortOrder: photos.length + index,
          isPrimary: photos.length === 0 && index === 0,
        });
      }

      await loadPhotos();
      appToast.success(`Uploaded ${files.length} photo(s)`);
    } catch (error) {
      appToast.error(error instanceof Error ? error.message : "Failed to upload");
    } finally {
      setUploading(false);
    }
  }, [assetId, assetName, loadPhotos, photos.length, propertyId]);

  return (
    <div className="flex flex-col gap-10">
      <section className="relative overflow-hidden rounded-[24px] border border-black/5 bg-gradient-to-b from-white/60 to-white/30 p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] backdrop-blur-2xl sm:p-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Upload Photos</h2>
            <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-muted-foreground/80">
              Drag to reorder, set the primary image, and build a visual history. Records are kept for 3 years to ensure compliance.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-dashed border-black/10 bg-white/40 p-1.5 transition-colors hover:border-black/20 hover:bg-white/60">
          <MediaUpload
            accept="image/*"
            maxFiles={10}
            onUpload={handleUpload}
            disabled={uploading}
            quality={0.8}
          />
        </div>
      </section>

      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Photo Library <span className="ml-2 rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{photos.length}</span>
          </h2>
        </div>
        
        {loading ? (
          <div className="flex h-32 items-center justify-center rounded-[24px] border border-black/5 bg-white/30">
            <span className="text-sm font-medium text-muted-foreground animate-pulse">Loading gallery...</span>
          </div>
        ) : photos.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-[24px] border border-black/5 bg-white/30">
            <p className="text-sm font-medium text-muted-foreground">No photos uploaded yet</p>
            <p className="text-xs text-muted-foreground/60">Upload some photos to see them here.</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-3">
                {photos.map((photo) => (
                  <AssetPhotoCard key={photo.id} photo={photo} onSetPrimary={handleSetPrimary} onRemove={handleRemove} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </section>
    </div>
  );
}
