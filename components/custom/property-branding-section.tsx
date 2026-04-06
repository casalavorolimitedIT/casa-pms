"use client";

import { useCallback, useState } from "react";
import { MediaUpload, type MediaFile } from "@/components/ui/media-upload";
import { MediaGallery } from "@/components/custom/media-gallery";
import { uploadMedia } from "@/lib/media";
import { appToast } from "@/components/custom/toast-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PropertyBrandingSectionProps {
  propertyId: string;
  propertyName: string;
}

export function PropertyBrandingSection({
  propertyId,
  propertyName,
}: PropertyBrandingSectionProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUpload = useCallback(
    async (files: MediaFile[]) => {
      for (const mediaFile of files) {
        await uploadMedia({
          bucket: "property-branding",
          file: mediaFile.compressed,
          propertyId,
          featureType: "property_branding",
          relatedEntityId: propertyId,
          relatedEntityType: "property",
          altText: `${propertyName} branding image`,
          isPrimary: true,
        });
      }
      setRefreshKey((k) => k + 1);
      appToast.success("Branding image uploaded");
    },
    [propertyId, propertyName],
  );

  return (
    <Card className="border-zinc-200/80">
      <CardHeader>
        <CardTitle className="text-base">Property Images</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <MediaGallery
          propertyId={propertyId}
          featureType="property_branding"
          relatedEntityId={propertyId}
          refreshKey={refreshKey}
          allowDelete
          emptyStateText="No property images yet. Upload a hero or branding image."
        />
        <MediaUpload
          label="Upload property image"
          accept="image/*"
          maxFiles={3}
          quality={0.8}
          onUpload={handleUpload}
          showCamera
          cameraFacing="environment"
        />
      </CardContent>
    </Card>
  );
}
