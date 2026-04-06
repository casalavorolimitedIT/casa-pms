"use client";

import { useCallback, useState } from "react";
import { MediaUpload, type MediaFile } from "@/components/ui/media-upload";
import { MediaGallery } from "@/components/custom/media-gallery";
import { uploadMedia } from "@/lib/media";
import { appToast } from "@/components/custom/toast-ui";

interface FnbMenuItemMediaProps {
  propertyId: string;
  menuItemId: string;
  menuItemName: string;
}

export function FnbMenuItemMedia({
  propertyId,
  menuItemId,
  menuItemName,
}: FnbMenuItemMediaProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUpload = useCallback(
    async (files: MediaFile[]) => {
      for (const mediaFile of files) {
        await uploadMedia({
          bucket: "fnb-menu-media",
          file: mediaFile.compressed,
          propertyId,
          featureType: "menu_item",
          relatedEntityId: menuItemId,
          relatedEntityType: "menu_item",
          altText: `${menuItemName} photo`,
          isPrimary: true,
        });
      }
      setRefreshKey((k) => k + 1);
      appToast.success("Menu item photo uploaded");
    },
    [propertyId, menuItemId, menuItemName],
  );

  return (
    <div className="mt-3 space-y-3">
      <MediaGallery
        propertyId={propertyId}
        featureType="menu_item"
        relatedEntityId={menuItemId}
        refreshKey={refreshKey}
        allowDelete
        emptyStateText="No photo yet."
      />
      <MediaUpload
        label="Add photo"
        accept="image/*"
        maxFiles={1}
        quality={0.7}
        onUpload={handleUpload}
        showCamera
        cameraFacing="environment"
      />
    </div>
  );
}
