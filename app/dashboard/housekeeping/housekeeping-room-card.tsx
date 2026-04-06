"use client";

import { useTransition, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { HousekeepingEvidencePanel } from "@/components/custom/housekeeping-evidence-panel";
import { upsertHousekeepingAssignment, updateHousekeepingRoomStatus } from "./actions";

type RoomStatus = "vacant" | "occupied" | "dirty" | "inspection" | "maintenance" | "out_of_order";

type Room = {
  id: string;
  room_number: string;
  floor: number | null;
  status: RoomStatus;
  room_types: { name?: string } | Array<{ name?: string }> | null;
};

type Assignment = {
  id: string;
  room_id: string;
  attendant_user_id: string | null;
  status: "pending" | "in_progress" | "completed";
  created_at: string;
};

type StaffMember = {
  id: string;
  full_name: string | null;
  email: string;
};

type Props = {
  room: Room;
  assignment: Assignment | undefined;
  staff: StaffMember[];
  propertyId: string;
  isArrivalRoom: boolean;
  isDnd: boolean;
};

const STATUS_TONE: Record<RoomStatus, string> = {
  vacant: "bg-emerald-100 text-emerald-800",
  occupied: "bg-blue-100 text-blue-800",
  dirty: "bg-amber-100 text-amber-800",
  inspection: "bg-violet-100 text-violet-800",
  maintenance: "bg-orange-100 text-orange-800",
  out_of_order: "bg-red-100 text-red-800",
};

const PRIORITY_LABEL: Record<string, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-red-100 text-red-700" },
  high: { label: "High", className: "bg-orange-100 text-orange-700" },
  medium: { label: "Medium", className: "bg-amber-100 text-amber-700" },
  low: { label: "Low", className: "bg-zinc-100 text-zinc-700" },
};

function getPriorityKey(status: RoomStatus, isArrivalRoom: boolean): string {
  if (status === "out_of_order") return "critical";
  if ((status === "dirty" && isArrivalRoom) || status === "maintenance") return "high";
  if (status === "dirty" || status === "inspection") return "medium";
  return "low";
}

function getRoomTypeName(roomTypeRaw: Room["room_types"]): string {
  const rt = Array.isArray(roomTypeRaw) ? roomTypeRaw[0] ?? null : roomTypeRaw;
  return rt?.name ?? "Unspecified type";
}

const ASSIGNMENT_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

const ROOM_STATUSES: { value: RoomStatus; label: string }[] = [
  { value: "vacant", label: "Vacant" },
  { value: "occupied", label: "Occupied" },
  { value: "dirty", label: "Dirty" },
  { value: "inspection", label: "Inspection" },
  { value: "maintenance", label: "Maintenance" },
  { value: "out_of_order", label: "Out of order" },
];

export function HousekeepingRoomCard({ room, assignment: initialAssignment, staff, propertyId, isArrivalRoom, isDnd }: Props) {
  const [isPending, startTransition] = useTransition();
  const [roomStatus, setRoomStatus] = useState<RoomStatus>(room.status);
  const [assignment, setAssignment] = useState(initialAssignment);
  const [flash, setFlash] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  // Derived values for the assign form
  const [selectedAttendant, setSelectedAttendant] = useState(initialAssignment?.attendant_user_id ?? "");
  const [selectedAssignStatus, setSelectedAssignStatus] = useState<string>(initialAssignment?.status ?? "pending");

  // Derived values for the room status form
  const [selectedRoomStatus, setSelectedRoomStatus] = useState<RoomStatus>(room.status);
  const [statusNote, setStatusNote] = useState("");

  const showFlash = (type: "ok" | "error", text: string) => {
    setFlash({ type, text });
    setTimeout(() => setFlash(null), 3000);
  };

  const handleAssign = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("propertyId", propertyId);
      fd.set("roomId", room.id);
      fd.set("attendantUserId", selectedAttendant);
      fd.set("status", selectedAssignStatus);
      const result = await upsertHousekeepingAssignment(fd);
      if (result?.success) {
        setAssignment((prev) =>
          prev
            ? { ...prev, attendant_user_id: selectedAttendant || null, status: selectedAssignStatus as Assignment["status"] }
            : { id: "", room_id: room.id, attendant_user_id: selectedAttendant || null, status: selectedAssignStatus as Assignment["status"], created_at: new Date().toISOString() }
        );
        showFlash("ok", "Assignment saved.");
      } else {
        showFlash("error", result?.error ?? "Failed to save assignment.");
      }
    });
  };

  const handleStatusUpdate = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("roomId", room.id);
      fd.set("status", selectedRoomStatus);
      fd.set("note", statusNote);
      const result = await updateHousekeepingRoomStatus(fd);
      if (result?.success) {
        setRoomStatus(selectedRoomStatus);
        setStatusNote("");
        showFlash("ok", "Room status updated.");
      } else {
        showFlash("error", result?.error ?? "Failed to update room status.");
      }
    });
  };

  const priorityKey = getPriorityKey(roomStatus, isArrivalRoom);
  const priority = PRIORITY_LABEL[priorityKey];
  const assignee = staff.find((m) => m.id === assignment?.attendant_user_id);

  return (
    <li className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        <div>
          <p className="font-medium text-zinc-900">Room {room.room_number}</p>
          <p className="text-xs text-zinc-500">{getRoomTypeName(room.room_types)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Badge className={STATUS_TONE[roomStatus]}>{roomStatus.replaceAll("_", " ")}</Badge>
          {isDnd && <Badge className="bg-amber-100 text-amber-800">DND</Badge>}
          <Badge className={priority.className}>{priority.label}</Badge>
        </div>
      </div>

      <div className="border-t border-zinc-200 px-3 py-2 text-xs text-zinc-600">
        Assignee: {assignee?.full_name?.trim() || assignee?.email || "Unassigned"} ·{" "}
        {assignment?.status ? assignment.status.replaceAll("_", " ") : "pending"}
      </div>

      {flash && (
        <div
          className={`mx-3 mb-2 rounded-md px-3 py-1.5 text-xs ${
            flash.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {flash.text}
        </div>
      )}

      <details className="border-t border-zinc-200 px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium uppercase tracking-[0.12em] text-zinc-600">
          Minimize / Expand Forms
        </summary>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {/* Assignment form */}
          <div className="grid gap-2 rounded-lg border border-zinc-200 p-2">
            <div className="grid gap-1.5">
              <Label className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Attendant</Label>
              <select
                value={selectedAttendant}
                onChange={(e) => setSelectedAttendant(e.target.value)}
                className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                <option value="">Unassigned</option>
                {staff.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name?.trim() || m.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Assignment Status</Label>
              <select
                value={selectedAssignStatus}
                onChange={(e) => setSelectedAssignStatus(e.target.value)}
                className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                {ASSIGNMENT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="border-zinc-300"
              disabled={isPending}
              onClick={handleAssign}
            >
              {isPending ? "Saving…" : "Save Assignment"}
            </Button>
          </div>

          {/* Room status form */}
          <div className="grid gap-2 rounded-lg border border-zinc-200 p-2">
            <div className="grid gap-1.5">
              <Label className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Room Status</Label>
              <select
                value={selectedRoomStatus}
                onChange={(e) => setSelectedRoomStatus(e.target.value as RoomStatus)}
                className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                {ROOM_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <Input
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="Optional housekeeping note"
            />

            <Button
              size="sm"
              className="bg-[#ff6900] hover:bg-[#e55f00]"
              disabled={isPending}
              onClick={handleStatusUpdate}
            >
              {isPending ? "Updating…" : "Update Room"}
            </Button>
          </div>

          <div className="lg:col-span-2">
            <HousekeepingEvidencePanel
              propertyId={propertyId}
              roomId={room.id}
              roomNumber={room.room_number}
            />
          </div>
        </div>
      </details>
    </li>
  );
}
