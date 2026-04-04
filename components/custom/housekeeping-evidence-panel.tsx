"use client";

import { useCallback, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MediaUpload, type MediaFile } from "@/components/ui/media-upload";
import { MediaGallery } from "@/components/custom/media-gallery";
import { uploadMedia } from "@/lib/media";
import { appToast } from "@/components/custom/toast-ui";

interface HousekeepingEvidencePanelProps {
  propertyId: string;
  roomId: string;
  roomNumber: string;
}

function ninetyDaysFromNow() {
  return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
}

export function HousekeepingEvidencePanel({
  propertyId,
  roomId,
  roomNumber,
}: HousekeepingEvidencePanelProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUpload = useCallback(
    async (files: MediaFile[]) => {
      for (const mediaFile of files) {
        await uploadMedia({
          bucket: "housekeeping-condition",
          file: mediaFile.compressed,
          propertyId,
          featureType: "room_condition",
          relatedEntityId: roomId,
          relatedEntityType: "room",
          altText: `Room ${roomNumber} condition photo`,
          expiresAt: ninetyDaysFromNow(),
        });
      }

      setRefreshKey((current) => current + 1);
      appToast.success(`Uploaded ${files.length} condition photo(s)`);
    },
    [propertyId, roomId, roomNumber],
  );

  return (
    <div className="space-y-3">
      <Card className="border-zinc-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Condition Evidence</CardTitle>
        </CardHeader>
        <CardContent>
          <MediaUpload
            accept="image/*"
            maxFiles={6}
            onUpload={handleUpload}
            quality={0.65}
            showCamera
            cameraFacing="environment"
          />
        </CardContent>
      </Card>

      <MediaGallery
        propertyId={propertyId}
        featureType="room_condition"
        relatedEntityId={roomId}
        title={`Room ${roomNumber} Evidence`}
        emptyStateText="No housekeeping evidence uploaded yet."
        refreshKey={refreshKey}
        allowDelete
      />
    </div>
  );
}
