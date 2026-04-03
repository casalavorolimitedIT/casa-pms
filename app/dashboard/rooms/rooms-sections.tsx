"use client";

import * as React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TablePagination } from "@/components/custom/table-pagination";

interface RoomRow {
  id: string;
  roomNumber: string;
  roomTypeName: string;
  floorLabel: string;
  status: string;
}

interface FloorSection {
  floor: string;
  rooms: RoomRow[];
}

interface RoomsSectionsProps {
  floors: FloorSection[];
  statusTone: Record<string, string>;
}

const FLOORS_PER_PAGE = 4;
const ROOMS_PER_PAGE = 5;

export function RoomsSections({ floors, statusTone }: RoomsSectionsProps) {
  const [floorPage, setFloorPage] = React.useState(0);
  const [roomPages, setRoomPages] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    setFloorPage(0);
    setRoomPages({});
  }, [floors]);

  const floorTotalPages = Math.max(1, Math.ceil(floors.length / FLOORS_PER_PAGE));
  const paginatedFloors = floors.length > FLOORS_PER_PAGE
    ? floors.slice(floorPage * FLOORS_PER_PAGE, floorPage * FLOORS_PER_PAGE + FLOORS_PER_PAGE)
    : floors;

  function updateRoomPage(floor: string, nextPage: number) {
    setRoomPages((current) => ({ ...current, [floor]: nextPage }));
  }

  return (
    <div className="space-y-5">
      {paginatedFloors.map((floorSection) => {
        const floorStatusCounts = floorSection.rooms.reduce<Record<string, number>>((acc, room) => {
          acc[room.status] = (acc[room.status] ?? 0) + 1;
          return acc;
        }, {});
        const roomPage = roomPages[floorSection.floor] ?? 0;
        const roomTotalPages = Math.max(1, Math.ceil(floorSection.rooms.length / ROOMS_PER_PAGE));
        const visibleRooms = floorSection.rooms.length > ROOMS_PER_PAGE
          ? floorSection.rooms.slice(roomPage * ROOMS_PER_PAGE, roomPage * ROOMS_PER_PAGE + ROOMS_PER_PAGE)
          : floorSection.rooms;

        return (
          <Collapsible key={floorSection.floor} defaultOpen className="group/collapsible">
            <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-sm ring-1 ring-black/4">
              <CardHeader className="border-b border-zinc-100 bg-[linear-gradient(180deg,#fffdfa_0%,#fff7f1_100%)] pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CollapsibleTrigger className="flex w-full items-start gap-3 text-left">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm">
                        <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4 transition-transform duration-200 group-data-open/collapsible:rotate-90" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base font-semibold text-zinc-900">{floorSection.floor}</CardTitle>
                        <p className="mt-1 text-sm text-zinc-600">
                          {floorSection.rooms.length} room{floorSection.rooms.length !== 1 ? "s" : ""} on this level.
                        </p>
                      </div>
                    </CollapsibleTrigger>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(floorStatusCounts).map(([status, count]) => (
                      <Badge key={status} className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[status] ?? "bg-muted text-muted-foreground"}`}>
                        {status.replaceAll("_", " ")}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardHeader>

              <CollapsibleContent>
                <CardContent className="px-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-180 text-sm">
                      <thead className="bg-zinc-50/80 text-zinc-600">
                        <tr>
                          <th className="px-6 py-3 text-left font-medium">Room</th>
                          <th className="px-6 py-3 text-left font-medium">Type</th>
                          <th className="px-6 py-3 text-left font-medium">Floor</th>
                          <th className="px-6 py-3 text-left font-medium">Status</th>
                          <th className="px-6 py-3 text-right font-medium">Open</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {visibleRooms.map((room) => (
                          <tr key={room.id} className="transition-colors hover:bg-[#fffaf6]">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-zinc-900">{room.roomNumber}</div>
                            </td>
                            <td className="px-6 py-4 text-zinc-700">{room.roomTypeName}</td>
                            <td className="px-6 py-4 text-zinc-600">{room.floorLabel}</td>
                            <td className="px-6 py-4">
                              <Badge className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[room.status] ?? "bg-muted text-muted-foreground"}`}>
                                {room.status.replaceAll("_", " ")}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button asChild variant="outline" size="sm" className="border-zinc-200 bg-white hover:bg-zinc-50">
                                <Link href={`/dashboard/rooms/${room.id}`}>View room</Link>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {floorSection.rooms.length > ROOMS_PER_PAGE ? (
                    <div className="border-t border-zinc-100 px-6 py-4">
                      <TablePagination
                        page={roomPage}
                        totalPages={roomTotalPages}
                        totalItems={floorSection.rooms.length}
                        pageSize={ROOMS_PER_PAGE}
                        onPageChange={(nextPage) => updateRoomPage(floorSection.floor, nextPage)}
                      />
                    </div>
                  ) : null}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      {floors.length > FLOORS_PER_PAGE ? (
        <Card className="border-zinc-200/80 bg-white shadow-sm">
          <CardContent className="pt-6">
            <TablePagination
              page={floorPage}
              totalPages={floorTotalPages}
              totalItems={floors.length}
              pageSize={FLOORS_PER_PAGE}
              onPageChange={setFloorPage}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}