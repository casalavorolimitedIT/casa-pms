"use client";

/**
 * GuestDocumentsSection — client island that renders in the guest detail page.
 * Shows the MediaUpload component wired to the guest-documents bucket.
 * Demonstrates the full upload flow: compress → Supabase Storage → metadata row.
 */

import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MediaUpload, type MediaFile } from "@/components/ui/media-upload";
import { uploadMedia } from "@/lib/media";
import { appToast } from "@/components/custom/toast-ui";

// 7-year retention for KYC/ID documents
function sevenYearsFromNow(): string {
  return new Date(
    Date.now() + 7 * 365.25 * 24 * 60 * 60 * 1000,
  ).toISOString();
}

const DEMO_PROPERTY_ID = process.env.NEXT_PUBLIC_DEMO_PROPERTY_ID ?? "";

export function GuestDocumentsSection({ guestId }: { guestId: string }) {
  const handleUpload = useCallback(
    async (files: MediaFile[]) => {
      if (!DEMO_PROPERTY_ID) {
        appToast.error("NEXT_PUBLIC_DEMO_PROPERTY_ID is not set");
        return;
      }

      for (const mediaFile of files) {
        const result = await uploadMedia({
          bucket: "guest-documents",
          file: mediaFile.compressed,
          propertyId: DEMO_PROPERTY_ID,
          featureType: "guest_id",
          guestId,
          relatedEntityId: guestId,
          relatedEntityType: "guest",
          expiresAt: sevenYearsFromNow(),
        });
        appToast.success(
          `Uploaded ${result.uploadedFile.name} · saved ${Math.round(((mediaFile.originalSizeBytes - result.finalSizeBytes) / mediaFile.originalSizeBytes) * 100)}%`,
        );
      }
    },
    [guestId],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Identity Documents</CardTitle>
      </CardHeader>
      <CardContent>
        <MediaUpload
          label="Upload passport, ID card or visa"
          accept="image/*,application/pdf"
          maxFiles={5}
          onUpload={handleUpload}
          showCamera
          cameraFacing="environment"
          quality={0.5}
        />
        <p className="mt-3 text-xs text-muted-foreground">
          Documents are encrypted and retained for 7 years per KYC compliance.
          Images are compressed by 50% before upload.
        </p>
      </CardContent>
    </Card>
  );
}
