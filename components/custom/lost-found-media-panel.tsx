"use client";

import { useCallback, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MediaUpload, type MediaFile } from "@/components/ui/media-upload";
import { MediaGallery } from "@/components/custom/media-gallery";
import { uploadMedia } from "@/lib/media";
import { appToast } from "@/components/custom/toast-ui";

interface LostFoundMediaPanelProps {
  propertyId: string;
  itemId: string;
  itemName: string;
}

function twoYearsFromNow() {
  return new Date(Date.now() + 2 * 365.25 * 24 * 60 * 60 * 1000).toISOString();
}

export function LostFoundMediaPanel({
  propertyId,
  itemId,
  itemName,
}: LostFoundMediaPanelProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUpload = useCallback(
    async (files: MediaFile[]) => {
      for (const mediaFile of files) {
        await uploadMedia({
          bucket: "lost-and-found",
          file: mediaFile.compressed,
          propertyId,
          featureType: "lost_found",
          relatedEntityId: itemId,
          relatedEntityType: "lost_found_item",
          altText: `${itemName} evidence photo`,
          expiresAt: twoYearsFromNow(),
        });
      }

      setRefreshKey((current) => current + 1);
      appToast.success(`Uploaded ${files.length} evidence photo(s)`);
    },
    [itemId, itemName, propertyId],
  );

  return (
    <div className="mt-4 space-y-3">
      <Card className="border-zinc-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Evidence Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <MediaUpload
            accept="image/*"
            maxFiles={5}
            onUpload={handleUpload}
            quality={0.65}
            showCamera
            cameraFacing="environment"
          />
        </CardContent>
      </Card>

      <MediaGallery
        propertyId={propertyId}
        featureType="lost_found"
        relatedEntityId={itemId}
        title="Evidence Preview"
        emptyStateText="No image evidence uploaded yet."
        refreshKey={refreshKey}
        allowDelete
      />
    </div>
  );
}
