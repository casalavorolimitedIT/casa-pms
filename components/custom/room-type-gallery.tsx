"use client";

import { useCallback, useState } from "react";
import { MediaUpload, type MediaFile } from "@/components/ui/media-upload";
import { MediaGallery } from "@/components/custom/media-gallery";
import { uploadMedia } from "@/lib/media";
import { appToast } from "@/components/custom/toast-ui";

interface RoomTypeGalleryProps {
  propertyId: string;
  roomTypeId: string;
  roomTypeName: string;
}

export function RoomTypeGallery({
  propertyId,
  roomTypeId,
  roomTypeName,
}: RoomTypeGalleryProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUpload = useCallback(
    async (files: MediaFile[]) => {
      let uploaded = 0;
      for (const mediaFile of files) {
        await uploadMedia({
          bucket: "room-gallery",
          file: mediaFile.compressed,
          propertyId,
          featureType: "room_gallery",
          relatedEntityId: roomTypeId,
          relatedEntityType: "room_type",
          altText: `${roomTypeName} room photo`,
          isPrimary: uploaded === 0,
          sortOrder: uploaded,
        });
        uploaded++;
      }
      setRefreshKey((k) => k + 1);
      appToast.success(
        `${files.length} photo${files.length !== 1 ? "s" : ""} added to gallery`,
      );
    },
    [propertyId, roomTypeId, roomTypeName],
  );

  return (
    <div className="space-y-4">
      <MediaGallery
        propertyId={propertyId}
        featureType="room_gallery"
        relatedEntityId={roomTypeId}
        refreshKey={refreshKey}
        allowDelete
        emptyStateText="No gallery photos yet. Add photos to help guests preview this room type."
      />
      <MediaUpload
        label="Add gallery photos"
        accept="image/*"
        maxFiles={12}
        quality={0.75}
        onUpload={handleUpload}
        showCamera
        cameraFacing="environment"
      />
    </div>
  );
}
