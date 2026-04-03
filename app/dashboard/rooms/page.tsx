import { getRooms, getRoomTypes } from "./actions/room-actions";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { PageHelpDialog } from "@/components/custom/page-help-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { RoomsFilters } from "./rooms-filters";
import { RoomsSections } from "./rooms-sections";

const STATUS_TONE: Record<string, string> = {
  vacant: "bg-emerald-100 text-emerald-800",
  occupied: "bg-blue-100 text-blue-800",
  dirty: "bg-amber-100 text-amber-800",
  inspection: "bg-purple-100 text-purple-800",
  maintenance: "bg-orange-100 text-orange-800",
  out_of_order: "bg-red-100 text-red-800",
};

interface RoomsPageProps {
  searchParams?: Promise<{ q?: string; status?: string; floor?: string }>;
}

export default async function RoomsPage({ searchParams }: RoomsPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const query = (await searchParams) ?? {};
  const searchTerm = (query.q ?? "").trim().toLowerCase();
  const statusFilter = (query.status ?? "").trim();
  const floorFilter = (query.floor ?? "").trim();

  if (!activePropertyId) {
    return (
      <div className="p-6 text-muted-foreground text-sm">
        Set <code>DEMO_PROPERTY_ID</code> in .env.local or add/select an active property in the header.
      </div>
    );
  }

  const [{ rooms }, { roomTypes }] = await Promise.all([
    getRooms(activePropertyId),
    getRoomTypes(activePropertyId),
  ]);

  type RoomItem = (typeof rooms)[number];
  const filteredRooms = rooms.filter((room) => {
    const roomTypeRaw = room.room_types as { name?: string } | Array<{ name?: string }> | null;
    const roomTypeName = (Array.isArray(roomTypeRaw) ? roomTypeRaw[0]?.name : roomTypeRaw?.name) ?? "";
    const floorLabel = room.floor != null ? String(room.floor) : "";
    const matchesSearch =
      searchTerm.length === 0 ||
      room.room_number.toLowerCase().includes(searchTerm) ||
      roomTypeName.toLowerCase().includes(searchTerm) ||
      room.status.replaceAll("_", " ").toLowerCase().includes(searchTerm) ||
      floorLabel.includes(searchTerm);
    const matchesStatus = statusFilter.length === 0 || room.status === statusFilter;
    const matchesFloor =
      floorFilter.length === 0 ||
      (floorFilter === "none" ? room.floor == null : String(room.floor ?? "") === floorFilter);

    return matchesSearch && matchesStatus && matchesFloor;
  });

  const statusCounts = filteredRooms.reduce<Record<string, number>>((acc, room) => {
    acc[room.status] = (acc[room.status] ?? 0) + 1;
    return acc;
  }, {});

  const occupiedCount = statusCounts.occupied ?? 0;
  const vacantCount = statusCounts.vacant ?? 0;
  const attentionCount = (statusCounts.dirty ?? 0) + (statusCounts.maintenance ?? 0) + (statusCounts.out_of_order ?? 0);

  const floorOptions = Array.from(
    new Set(rooms.map((room) => (room.floor != null ? String(room.floor) : "none")))
  ).sort((left, right) => {
    if (left === "none") return 1;
    if (right === "none") return -1;
    return Number(left) - Number(right);
  });
  const statusOptions = Object.keys(STATUS_TONE).map((status) => ({
    value: status,
    label: status.replaceAll("_", " "),
  }));
  const floorFilterOptions = floorOptions.map((floor) => ({
    value: floor,
    label: floor === "none" ? "No floor" : `Floor ${floor}`,
  }));

  // Group rooms by floor
  const byFloor = filteredRooms.reduce<Record<string, RoomItem[]>>((acc, room) => {
    const key = room.floor != null ? `Floor ${room.floor}` : "No Floor";
    (acc[key] ??= []).push(room);
    return acc;
  }, {});
  const floorEntries = Object.entries(byFloor).sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }));
  const floorSections = floorEntries.map(([floor, floorRooms]) => ({
    floor,
    rooms: floorRooms.map((room) => {
      const roomTypeRaw = room.room_types as { name?: string } | Array<{ name?: string }> | null;
      const roomTypeName = Array.isArray(roomTypeRaw) ? roomTypeRaw[0]?.name : roomTypeRaw?.name;

      return {
        id: room.id,
        roomNumber: room.room_number,
        roomTypeName: roomTypeName ?? "—",
        floorLabel: room.floor != null ? String(room.floor) : "—",
        status: room.status,
      };
    }),
  }));
  const hasActiveFilters = Boolean(searchTerm || statusFilter || floorFilter);

  return (
    <div className="page-shell">
      <div className="page-container">
        <div className="rounded-[28px] border border-zinc-200/80 bg-[linear-gradient(135deg,#fff8f4_0%,#ffffff_42%,#fff3ea_100%)] p-6 shadow-sm ring-1 ring-black/4">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <PageHelpDialog
                className="mt-1 border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                pageName="Rooms"
                summary="This page is the operational room inventory for the active property. It shows room status, room type assignments, and floor-by-floor navigation into each room record."
                responsibilities={[
                  "Review room availability and identify rooms needing attention across the property.",
                  "Search by room number, type, status, or floor and narrow the list with filters.",
                  "Open any room record directly from the floor tables to inspect or update details.",
                  "Use the linked pages to manage room types before adding or reorganizing rooms.",
                ]}
                relatedPages={[
                  {
                    href: "/dashboard/rooms/types",
                    label: "Room Types",
                    description: "The rooms page depends on room types for classification, occupancy rules, and rate structure context.",
                  },
                  {
                    href: "/dashboard/rooms/new",
                    label: "Add Room",
                    description: "Use this page when you need to add inventory to the current property before it can appear here.",
                  },
                ]}
              />
              <div>
                <h1 className="page-title">Rooms</h1>
                <p className="max-w-2xl text-sm leading-6 text-zinc-600">
                  Track live room inventory, surface operational issues quickly, and jump into any room record from a cleaner floor-by-floor layout.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" className="border-zinc-200 bg-white/90 hover:bg-white">
                <Link href="/dashboard/rooms/types">Manage Types</Link>
              </Button>
              <Button asChild size="sm" className="bg-[#ff6900] text-white hover:bg-[#e55f00]">
                <Link href="/dashboard/rooms/new">Add Room</Link>
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Inventory</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-950">{rooms.length}</p>
              <p className="mt-1 text-sm text-zinc-600">Total room{rooms.length !== 1 ? "s" : ""} in the active property.</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Availability</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-700">{vacantCount}</p>
              <p className="mt-1 text-sm text-zinc-600">Vacant room{vacantCount !== 1 ? "s" : ""} ready for assignment.</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Occupied</p>
              <p className="mt-2 text-3xl font-semibold text-blue-700">{occupiedCount}</p>
              <p className="mt-1 text-sm text-zinc-600">Currently in-house and unavailable for new arrivals.</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Needs Attention</p>
              <p className="mt-2 text-3xl font-semibold text-amber-700">{attentionCount}</p>
              <p className="mt-1 text-sm text-zinc-600">Dirty, maintenance, or out-of-order rooms to review.</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {Object.entries(STATUS_TONE).map(([status, tone]) => (
              <Badge key={status} className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
                {status.replaceAll("_", " ")}: {statusCounts[status] ?? 0}
              </Badge>
            ))}
            <Badge variant="outline" className="rounded-full px-2.5 py-1 text-xs font-medium text-zinc-600">
              {roomTypes.length} room type{roomTypes.length !== 1 ? "s" : ""}
            </Badge>
            {hasActiveFilters ? (
              <Badge variant="outline" className="rounded-full px-2.5 py-1 text-xs font-medium text-zinc-600">
                {filteredRooms.length} matching room{filteredRooms.length !== 1 ? "s" : ""}
              </Badge>
            ) : null}
          </div>
        </div>

        <Card className="border-zinc-200/80 bg-white shadow-sm">
          <CardContent className="pt-6">
            <RoomsFilters
              initialQuery={query.q ?? ""}
              initialStatus={statusFilter}
              initialFloor={floorFilter}
              statusOptions={statusOptions}
              floorOptions={floorFilterOptions}
            />
          </CardContent>
        </Card>

        {rooms.length === 0 ? (
          <Card className="glass-panel border-zinc-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#fff8f4_100%)]">
            <CardContent className="flex flex-col items-center gap-4 py-20 text-center">
              <div className="space-y-2">
                <p className="text-lg font-semibold text-zinc-900">No rooms configured yet</p>
                <p className="max-w-md text-sm leading-6 text-zinc-600">
                  Start by adding your first room, then return here to monitor inventory and room status by floor.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild size="sm" className="bg-[#ff6900] text-white hover:bg-[#e55f00]">
                  <Link href="/dashboard/rooms/new">Add first room</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/rooms/types">Set up room types</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : filteredRooms.length === 0 ? (
          <Card className="border-zinc-200/80 bg-white shadow-sm">
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="space-y-2">
                <p className="text-lg font-semibold text-zinc-900">No rooms match the current filters</p>
                <p className="max-w-md text-sm leading-6 text-zinc-600">
                  Try a different search term, remove one of the filters, or reset the full list.
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="border-zinc-200 bg-white hover:bg-zinc-50">
                <Link href="/dashboard/rooms">Clear filters</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <RoomsSections floors={floorSections} statusTone={STATUS_TONE} />
        )}
      </div>
    </div>
  );
}
