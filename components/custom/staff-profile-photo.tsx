"use client";

import { useCallback, useState } from "react";
import { MediaUpload, type MediaFile } from "@/components/ui/media-upload";
import { MediaGallery } from "@/components/custom/media-gallery";
import { uploadMedia } from "@/lib/media";
import { appToast } from "@/components/custom/toast-ui";

interface StaffProfilePhotoProps {
  propertyId: string;
  userId: string;
  fullName: string;
  canEdit: boolean;
}

export function StaffProfilePhoto({
  propertyId,
  userId,
  fullName,
  canEdit,
}: StaffProfilePhotoProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUpload = useCallback(
    async (files: MediaFile[]) => {
      await uploadMedia({
        bucket: "guest-profiles",
        file: files[0].compressed,
        propertyId,
        featureType: "department_photo",
        relatedEntityId: userId,
        relatedEntityType: "staff",
        altText: `${fullName} profile photo`,
        isPrimary: true,
      });
      setRefreshKey((k) => k + 1);
      appToast.success("Profile photo updated");
    },
    [propertyId, userId, fullName],
  );

  return (
    <div className="space-y-3">
      <MediaGallery
        propertyId={propertyId}
        featureType="department_photo"
        relatedEntityId={userId}
        refreshKey={refreshKey}
        allowDelete={canEdit}
        emptyStateText="No profile photo yet."
      />
      {canEdit ? (
        <MediaUpload
          label="Upload photo"
          accept="image/*"
          maxFiles={1}
          quality={0.8}
          onUpload={handleUpload}
          showCamera
          cameraFacing="user"
        />
      ) : null}
    </div>
  );
}
