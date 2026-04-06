"use client";

import { useCallback, useState } from "react";
import { MediaUpload, type MediaFile } from "@/components/ui/media-upload";
import { MediaGallery } from "@/components/custom/media-gallery";
import { uploadMedia } from "@/lib/media";
import { appToast } from "@/components/custom/toast-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GuestProfilePhotoSectionProps {
  propertyId: string;
  guestId: string;
  guestName: string;
}

export function GuestProfilePhotoSection({
  propertyId,
  guestId,
  guestName,
}: GuestProfilePhotoSectionProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUpload = useCallback(
    async (files: MediaFile[]) => {
      await uploadMedia({
        bucket: "guest-profiles",
        file: files[0].compressed,
        propertyId,
        featureType: "guest_profile",
        guestId,
        relatedEntityId: guestId,
        relatedEntityType: "guest",
        altText: `${guestName} profile photo`,
        isPrimary: true,
      });
      setRefreshKey((k) => k + 1);
      appToast.success("Profile photo updated");
    },
    [propertyId, guestId, guestName],
  );

  return (
    <Card className="border-zinc-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Profile Photo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <MediaGallery
          propertyId={propertyId}
          featureType="guest_profile"
          relatedEntityId={guestId}
          refreshKey={refreshKey}
          allowDelete
          emptyStateText="No profile photo yet."
        />
        <MediaUpload
          label="Upload photo"
          accept="image/*"
          maxFiles={1}
          quality={0.8}
          onUpload={handleUpload}
          showCamera
          cameraFacing="user"
        />
      </CardContent>
    </Card>
  );
}
