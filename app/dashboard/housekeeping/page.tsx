import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import {
  getHousekeepingBoardContext,
  upsertHousekeepingAssignment,
  updateHousekeepingRoomStatus,
} from "./actions";

type HousekeepingPageProps = {
  searchParams?: Promise<{ ok?: string | string[]; error?: string | string[] }>;
};

type BoardRoom = {
  id: string;
  room_number: string;
  floor: number | null;
  status: "vacant" | "occupied" | "dirty" | "inspection" | "maintenance" | "out_of_order";
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

function readSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getRoomTypeName(roomTypeRaw: BoardRoom["room_types"]) {
  const roomType = Array.isArray(roomTypeRaw) ? roomTypeRaw[0] ?? null : roomTypeRaw;
  return roomType?.name ?? "Unspecified type";
}

function getPriority(room: BoardRoom, arrivalRoomIds: Set<string>) {
  if (room.status === "out_of_order") return { label: "Critical", className: "bg-red-100 text-red-700", score: 100 };
  if (room.status === "dirty" && arrivalRoomIds.has(room.id)) return { label: "High", className: "bg-orange-100 text-orange-700", score: 80 };
  if (room.status === "maintenance") return { label: "High", className: "bg-orange-100 text-orange-700", score: 75 };
  if (room.status === "dirty" || room.status === "inspection") return { label: "Medium", className: "bg-amber-100 text-amber-700", score: 50 };
  return { label: "Low", className: "bg-zinc-100 text-zinc-700", score: 10 };
}

const STATUS_TONE: Record<BoardRoom["status"], string> = {
  vacant: "bg-emerald-100 text-emerald-800",
  occupied: "bg-blue-100 text-blue-800",
  dirty: "bg-amber-100 text-amber-800",
  inspection: "bg-violet-100 text-violet-800",
  maintenance: "bg-orange-100 text-orange-800",
  out_of_order: "bg-red-100 text-red-800",
};

function byFloorThenNumber(a: BoardRoom, b: BoardRoom) {
  const fa = a.floor ?? -1;
  const fb = b.floor ?? -1;
  if (fa !== fb) return fa - fb;
  return a.room_number.localeCompare(b.room_number, undefined, { numeric: true, sensitivity: "base" });
}

export default async function HousekeepingPage({ searchParams }: HousekeepingPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const params = (await searchParams) ?? {};
  const ok = readSearchValue(params.ok);
  const error = readSearchValue(params.error);

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.</div>;
  }

  const context = await getHousekeepingBoardContext(activePropertyId);
  const rooms = (context.rooms as BoardRoom[]).slice().sort(byFloorThenNumber);
  const assignmentsByRoom = context.latestAssignmentsByRoom as Record<string, Assignment>;
  const staff = context.staff as StaffMember[];
  const arrivalRoomIds = new Set(context.arrivalRoomIds);
  const activeDndRoomIds = new Set(context.activeDndRoomIds);

  const assignAction = async (formData: FormData) => {
    "use server";
    const result = await upsertHousekeepingAssignment(formData);
    if (result?.success) {
      redirect(`/dashboard/housekeeping?ok=${encodeURIComponent("Assignment updated.")}`);
    }
    const message = result?.error ?? "Unable to update assignment.";
    redirect(`/dashboard/housekeeping?error=${encodeURIComponent(message)}`);
  };

  const updateStatusAction = async (formData: FormData) => {
    "use server";
    const result = await updateHousekeepingRoomStatus(formData);
    if (result?.success) {
      redirect(`/dashboard/housekeeping?ok=${encodeURIComponent("Room status updated.")}`);
    }
    const message = result?.error ?? "Unable to update room status.";
    redirect(`/dashboard/housekeeping?error=${encodeURIComponent(message)}`);
  };

  const priorityQueue = rooms
    .map((room) => ({
      room,
      assignment: assignmentsByRoom[room.id],
      priority: getPriority(room, arrivalRoomIds),
      isDnd: activeDndRoomIds.has(room.id),
    }))
    .filter((row) => row.priority.score >= 50 || row.isDnd)
    .sort((a, b) => {
      if (b.priority.score !== a.priority.score) return b.priority.score - a.priority.score;
      return byFloorThenNumber(a.room, b.room);
    });

  const staffLoad = staff.map((member) => {
    const assignments = Object.values(assignmentsByRoom).filter((a) => a.attendant_user_id === member.id);
    const inProgress = assignments.filter((a) => a.status === "in_progress").length;
    const pending = assignments.filter((a) => a.status === "pending").length;
    return {
      member,
      total: assignments.length,
      inProgress,
      pending,
    };
  });

  const floors = Array.from(new Set(rooms.map((room) => room.floor ?? -1))).sort((a, b) => b - a);

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Operations Desk</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">Housekeeping Board</h1>
          <p className="mt-1 text-sm text-zinc-600">Action-first view by urgency, staff load, and floor-level room readiness.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard title="Rooms" value={rooms.length} tone="zinc" />
          <MetricCard title="Dirty" value={rooms.filter((room) => room.status === "dirty").length} tone="amber" />
          <MetricCard title="Inspection" value={rooms.filter((room) => room.status === "inspection").length} tone="violet" />
          <MetricCard title="Critical" value={rooms.filter((room) => room.status === "out_of_order").length} tone="red" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.05fr_1.95fr]">
          <div className="space-y-4">
            <Card className="border-zinc-200 bg-white">
              <CardHeader>
                <CardTitle className="text-base">Priority Queue</CardTitle>
              </CardHeader>
              <CardContent>
                {priorityQueue.length === 0 ? (
                  <p className="text-sm text-zinc-500">No urgent rooms in queue.</p>
                ) : (
                  <ul className="space-y-2">
                    {priorityQueue.slice(0, 12).map(({ room, assignment, priority, isDnd }) => (
                      <li key={room.id} className="rounded-lg border border-zinc-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-zinc-900">Room {room.room_number}</p>
                          <div className="flex gap-1">
                            {isDnd ? <Badge className="bg-amber-100 text-amber-800">DND</Badge> : null}
                            <Badge className={priority.className}>{priority.label}</Badge>
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-zinc-600">{getRoomTypeName(room.room_types)}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {assignment?.status ? assignment.status.replaceAll("_", " ") : "pending"} · {assignment?.attendant_user_id ? "Assigned" : "Unassigned"}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border-zinc-200 bg-white">
              <CardHeader>
                <CardTitle className="text-base">Staff Load</CardTitle>
              </CardHeader>
              <CardContent>
                {staffLoad.length === 0 ? (
                  <p className="text-sm text-zinc-500">No team profile available.</p>
                ) : (
                  <ul className="space-y-2">
                    {staffLoad.map((load) => (
                      <li key={load.member.id} className="rounded-lg border border-zinc-200 p-3">
                        <p className="font-medium text-zinc-900">{load.member.full_name?.trim() || load.member.email}</p>
                        <p className="mt-1 text-xs text-zinc-600">{load.total} assignment(s) · {load.inProgress} in progress · {load.pending} pending</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border-zinc-200 bg-white">
              <CardHeader>
                <CardTitle className="text-base">Operational Alerts</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                  <p className="font-medium text-amber-900">Active DND</p>
                  <p className="text-amber-800/90">{context.activeDndRoomIds.length} room(s) on do-not-disturb.</p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3">
                  <p className="font-medium text-blue-900">Wake-ups Due (30m)</p>
                  <p className="text-blue-800/90">{context.dueWakeups.length} call(s) due soon.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-zinc-200 bg-white">
            <CardHeader>
              <CardTitle className="text-base">Floor Matrix</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {floors.map((floor) => {
                const floorRooms = rooms.filter((room) => (room.floor ?? -1) === floor);
                return (
                  <section key={`floor-${floor}`} className="space-y-2">
                    <div className="sticky top-0 z-10 rounded-md bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600">
                      {floor === -1 ? "No Floor" : `Floor ${floor}`}
                    </div>
                    <ul className="space-y-2">
                      {floorRooms.map((room) => {
                        const assignment = assignmentsByRoom[room.id];
                        const assignee = staff.find((member) => member.id === assignment?.attendant_user_id);
                        const priority = getPriority(room, arrivalRoomIds);

                        return (
                          <li key={room.id} className="rounded-lg border border-zinc-200 bg-white">
                            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                              <div>
                                <p className="font-medium text-zinc-900">Room {room.room_number}</p>
                                <p className="text-xs text-zinc-500">{getRoomTypeName(room.room_types)}</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-1">
                                <Badge className={STATUS_TONE[room.status]}>{room.status.replaceAll("_", " ")}</Badge>
                                {activeDndRoomIds.has(room.id) ? <Badge className="bg-amber-100 text-amber-800">DND</Badge> : null}
                                <Badge className={priority.className}>{priority.label}</Badge>
                              </div>
                            </div>

                            <div className="border-t border-zinc-200 px-3 py-2 text-xs text-zinc-600">
                              Assignee: {assignee?.full_name?.trim() || assignee?.email || "Unassigned"} · {assignment?.status ? assignment.status.replaceAll("_", " ") : "pending"}
                            </div>

                            <details className="border-t border-zinc-200 px-3 py-2">
                              <summary className="cursor-pointer text-xs font-medium uppercase tracking-[0.12em] text-zinc-600">Minimize / Expand Forms</summary>
                              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                <form action={assignAction} className="grid gap-2 rounded-lg border border-zinc-200 p-2">
                                  <input type="hidden" name="propertyId" value={activePropertyId} />
                                  <input type="hidden" name="roomId" value={room.id} />

                                  <div className="grid gap-1.5">
                                    <Label className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Attendant</Label>
                                    <FormSelectField
                                      name="attendantUserId"
                                      defaultValue={assignment?.attendant_user_id ?? ""}
                                      placeholder="Assign attendant"
                                      options={staff.map((member) => ({
                                        value: member.id,
                                        label: member.full_name?.trim() || member.email,
                                      }))}
                                      emptyStateText="No available attendants."
                                    />
                                  </div>

                                  <div className="grid gap-1.5">
                                    <Label className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Assignment Status</Label>
                                    <FormSelectField
                                      name="status"
                                      defaultValue={assignment?.status ?? "pending"}
                                      options={[
                                        { value: "pending", label: "Pending" },
                                        { value: "in_progress", label: "In progress" },
                                        { value: "completed", label: "Completed" },
                                      ]}
                                    />
                                  </div>

                                  <FormSubmitButton idleText="Save Assignment" pendingText="Saving..." size="sm" variant="outline" className="border-zinc-300" />
                                </form>

                                <form action={updateStatusAction} className="grid gap-2 rounded-lg border border-zinc-200 p-2">
                                  <input type="hidden" name="roomId" value={room.id} />

                                  <div className="grid gap-1.5">
                                    <Label className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Room Status</Label>
                                    <FormSelectField
                                      name="status"
                                      defaultValue={room.status}
                                      options={[
                                        { value: "vacant", label: "Vacant" },
                                        { value: "occupied", label: "Occupied" },
                                        { value: "dirty", label: "Dirty" },
                                        { value: "inspection", label: "Inspection" },
                                        { value: "maintenance", label: "Maintenance" },
                                        { value: "out_of_order", label: "Out of order" },
                                      ]}
                                    />
                                  </div>

                                  <Input name="note" placeholder="Optional housekeeping note" />
                                  <FormSubmitButton idleText="Update Room" pendingText="Updating..." size="sm" className="bg-[#ff6900] hover:bg-[#e55f00]" />
                                </form>
                              </div>
                            </details>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, tone }: { title: string; value: number; tone: "zinc" | "amber" | "violet" | "red" }) {
  const tones: Record<"zinc" | "amber" | "violet" | "red", string> = {
    zinc: "bg-zinc-50 text-zinc-900 border-zinc-200",
    amber: "bg-amber-50 text-amber-900 border-amber-200",
    violet: "bg-violet-50 text-violet-900 border-violet-200",
    red: "bg-red-50 text-red-900 border-red-200",
  };

  return (
    <Card className={tones[tone]}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm opacity-80">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
