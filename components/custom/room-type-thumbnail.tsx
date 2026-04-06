"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SmartImage from "@/components/custom/smart-images";

interface RoomTypeThumbnailProps {
  propertyId: string;
  roomTypeId: string;
  roomTypeName: string;
}

export function RoomTypeThumbnail({
  propertyId,
  roomTypeId,
  roomTypeName,
}: RoomTypeThumbnailProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("media_metadata")
      .select("file_key, bucket_name")
      .eq("property_id", propertyId)
      .eq("feature_type", "room_gallery")
      .eq("related_entity_id", roomTypeId)
      .eq("is_primary", true)
      .is("deleted_at", null)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const { data: urlData } = supabase.storage
            .from(data.bucket_name)
            .getPublicUrl(data.file_key);
          setPhotoUrl(urlData.publicUrl);
        }
      });
  }, [propertyId, roomTypeId]);

  if (!photoUrl) {
    return (
      <div className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-t-xl bg-zinc-100">
        <span className="text-sm font-semibold tracking-wide text-zinc-400">
          {roomTypeName.slice(0, 2).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <SmartImage
      src={photoUrl}
      alt={roomTypeName}
      label={roomTypeName}
      fallbackVariant="initials"
      fill
      unoptimized={!!photoUrl}
      wrapperClassName="relative h-36 w-full overflow-hidden rounded-t-xl"
    />
  );
}
