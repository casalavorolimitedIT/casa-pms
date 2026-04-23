import { LegacyRouteAliasBanner } from "@/components/custom/legacy-route-alias-banner";

export default function RoomBoardPage() {
  return (
    <LegacyRouteAliasBanner
      aliasPath="/dashboard/room-board"
      canonicalPath="/dashboard/stay-view"
      title="Room Board moved to Stay View"
      description="Room Board is now merged into Stay View. Use the unified workspace for room reassignment and live stay operations."
    />
  );
}
