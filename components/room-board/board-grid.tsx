"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReservationBar } from "@/components/room-board/reservation-bar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface RoomRow {
  id: string;
  room_number: string;
  floor: number | null;
  status: string;
  room_types?: Array<{ name?: string | null }> | null;
}

interface ReservationItem {
  id: string;
  status: string;
  checkIn: string;
  checkOut: string;
  roomId: string;
  roomNumber: string | null;
  guestName: string;
}

interface BoardGridProps {
  rooms: RoomRow[];
  reservations: ReservationItem[];
}

export function BoardGrid({ rooms, reservations }: BoardGridProps) {
  const router = useRouter();
  const [activeDropRoomId, setActiveDropRoomId] = useState<string | null>(null);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const roomBoardChannel = supabase
      .channel("room-board-live")
      .on("postgres_changes", { event: "*", schema: "pms", table: "reservation_rooms" }, () => {
        router.refresh();
      })
      .on("postgres_changes", { event: "*", schema: "pms", table: "reservations" }, () => {
        router.refresh();
      })
      .on("postgres_changes", { event: "*", schema: "pms", table: "rooms" }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(roomBoardChannel);
    };
  }, [router]);

  const reservationsByRoom = useMemo(() => {
    const map = new Map<string, ReservationItem[]>();
    for (const room of rooms) {
      map.set(room.id, []);
    }

    for (const reservation of reservations) {
      const list = map.get(reservation.roomId) ?? [];
      list.push(reservation);
      map.set(reservation.roomId, list);
    }

    return map;
  }, [rooms, reservations]);

  const selected = reservations.find((item) => item.id === selectedReservationId) ?? null;

  async function handleDrop(toRoomId: string, event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setActiveDropRoomId(null);

    const reservationId = event.dataTransfer.getData("application/reservation-id");
    if (!reservationId) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/dashboard/room-board/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId, toRoomId }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to reassign room");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Card className="border-zinc-200">
        <CardHeader>
          <CardTitle className="text-base text-zinc-900">Live Room Grid</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {rooms.map((room) => {
              const roomReservations = reservationsByRoom.get(room.id) ?? [];
              const isDropTarget = activeDropRoomId === room.id;

              return (
                <div
                  key={room.id}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setActiveDropRoomId(room.id);
                  }}
                  onDragLeave={() => {
                    if (activeDropRoomId === room.id) {
                      setActiveDropRoomId(null);
                    }
                  }}
                  onDrop={(event) => {
                    void handleDrop(room.id, event);
                  }}
                  className={`rounded-xl border p-3 transition-colors ${
                    isDropTarget ? "border-orange-300 bg-orange-50/60" : "border-zinc-200 bg-white"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">Room {room.room_number}</p>
                      <p className="text-xs text-zinc-500">
                        {room.room_types?.[0]?.name ?? "Room type n/a"}
                        {room.floor !== null ? ` • Floor ${room.floor}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">{room.status.replace("_", " ")}</Badge>
                  </div>

                  {roomReservations.length === 0 ? (
                    <p className="rounded-md border border-dashed border-zinc-200 px-2 py-3 text-center text-xs text-zinc-500">
                      Drop reservation here
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {roomReservations.map((reservation) => (
                        <ReservationBar
                          key={reservation.id}
                          reservation={reservation}
                          onSelect={() => setSelectedReservationId(reservation.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {isSubmitting ? <p className="mt-3 text-xs text-zinc-500">Applying room reassignment...</p> : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedReservationId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reservation Detail</DialogTitle>
          </DialogHeader>

          {selected ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900">{selected.guestName}</p>
                <p className="text-xs text-zinc-500">Reservation {selected.id.slice(0, 8)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md border border-zinc-200 p-2">
                  <p className="text-zinc-500">Status</p>
                  <p className="font-medium capitalize text-zinc-900">{selected.status.replace("_", " ")}</p>
                </div>
                <div className="rounded-md border border-zinc-200 p-2">
                  <p className="text-zinc-500">Room</p>
                  <p className="font-medium text-zinc-900">{selected.roomNumber ?? "Unassigned"}</p>
                </div>
                <div className="rounded-md border border-zinc-200 p-2">
                  <p className="text-zinc-500">Check-in</p>
                  <p className="font-medium text-zinc-900">{new Date(selected.checkIn).toLocaleDateString()}</p>
                </div>
                <div className="rounded-md border border-zinc-200 p-2">
                  <p className="text-zinc-500">Check-out</p>
                  <p className="font-medium text-zinc-900">{new Date(selected.checkOut).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/front-desk/check-in/${selected.id}`}>Open Check-in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href={`/dashboard/front-desk/check-out/${selected.id}`}>Open Check-out</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
