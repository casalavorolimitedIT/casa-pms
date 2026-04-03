import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { getRoomBoardSnapshot } from "./actions";
import { BoardGrid } from "@/components/room-board/board-grid";
import { BoardLegend } from "@/components/room-board/board-legend";

export default async function RoomBoardPage() {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.</div>;
  }

  const snapshot = await getRoomBoardSnapshot(activePropertyId);

  return (
    <div className="page-shell">
      <div className="page-container">
      <div className="space-y-1">
        <h1 className="page-title text-balance tracking-tight">Room Board</h1>
        <p className="page-subtitle">Drag reservation bars between room lanes for instant reassignment.</p>
      </div>

      <BoardLegend />
      <BoardGrid rooms={snapshot.rooms} reservations={snapshot.reservations} />
      </div>
    </div>
  );
}
