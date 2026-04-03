import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormDateTimeField } from "@/components/ui/form-date-time-field";
import { createTask, getTaskBoardContext, updateTaskStatus } from "./actions";

type TasksPageProps = {
  searchParams?: Promise<{ ok?: string | string[]; error?: string | string[] }>;
};

function readSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getGuestName(guestRaw: unknown) {
  const guest = Array.isArray(guestRaw)
    ? (guestRaw[0] as { first_name?: string; last_name?: string } | undefined)
    : (guestRaw as { first_name?: string; last_name?: string } | null);
  return `${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "Unknown guest";
}

const PRIORITY_TONE: Record<string, string> = {
  low: "bg-zinc-100 text-zinc-700",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-800",
  urgent: "bg-red-100 text-red-700",
};

const COLUMNS = [
  { key: "todo", title: "To Do" },
  { key: "in_progress", title: "In Progress" },
  { key: "done", title: "Done" },
] as const;

export default async function TasksPage({ searchParams }: TasksPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const params = (await searchParams) ?? {};
  const ok = readSearchValue(params.ok);
  const error = readSearchValue(params.error);

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.</div>;
  }

  const context = await getTaskBoardContext(activePropertyId);

  const createTaskAction = async (formData: FormData) => {
    "use server";
    const result = await createTask(formData);
    if (result?.success) {
      redirect(`/dashboard/tasks?ok=${encodeURIComponent("Task created.")}`);
    }
    redirect(`/dashboard/tasks?error=${encodeURIComponent(result?.error ?? "Unable to create task.")}`);
  };

  const updateStatusAction = async (formData: FormData) => {
    "use server";
    const result = await updateTaskStatus(formData);
    if (result?.success) {
      redirect(`/dashboard/tasks?ok=${encodeURIComponent("Task updated.")}`);
    }
    redirect(`/dashboard/tasks?error=${encodeURIComponent(result?.error ?? "Unable to update task.")}`);
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="space-y-1">
          <h1 className="page-title">Task Board</h1>
          <p className="page-subtitle">Manage operational tasks linked to rooms and reservations.</p>
        </div>

        <div className="max-w-4xl mt-8 mb-8">
          <form action={createTaskAction} className="flex flex-col gap-8">
            <input type="hidden" name="propertyId" value={activePropertyId} />

            <div className="grid gap-6 md:grid-cols-12 relative">
              <div className="md:col-span-4 space-y-1.5 pt-1">
                <h3 className="text-sm font-medium text-foreground">Task Summary</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Define the operational task and add clear execution notes.</p>
              </div>

              <div className="md:col-span-8 grid gap-4 bg-card border border-border shadow-sm rounded-xl p-5">
                <div className="grid gap-2">
                  <Label className="text-zinc-700 font-medium">Title</Label>
                  <Input name="title" placeholder="Room 204 deep clean" required className="bg-white shadow-sm" />
                </div>

                <div className="grid gap-2">
                  <Label className="text-zinc-700 font-medium">Description</Label>
                  <Textarea name="description" rows={3} placeholder="Optional task details" className="bg-white resize-none shadow-sm" />
                </div>
              </div>
            </div>

            <div className="w-full h-px bg-border/60" />

            <div className="grid gap-6 md:grid-cols-12 relative">
              <div className="md:col-span-4 space-y-1.5 pt-1">
                <h3 className="text-sm font-medium text-foreground">Assignment</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Attach task context, owner, urgency, and expected completion time.</p>
              </div>

              <div className="md:col-span-8 grid gap-5 bg-card border border-border shadow-sm rounded-xl p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label className="text-zinc-700 font-medium">Room</Label>
                    <FormSelectField
                      name="roomId"
                      placeholder="Optional"
                      options={context.rooms.map((room) => ({ value: room.id, label: room.room_number }))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-zinc-700 font-medium">Reservation</Label>
                    <FormSelectField
                      name="reservationId"
                      placeholder="Optional"
                      options={context.reservations.map((reservation) => ({
                        value: reservation.id,
                        label: `${getGuestName(reservation.guests)} · ${reservation.check_in}`,
                      }))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-zinc-700 font-medium">Assign To</Label>
                    <FormSelectField
                      name="assignedTo"
                      placeholder="Optional"
                      options={context.staff.map((staff) => ({
                        value: staff.id,
                        label: staff.full_name?.trim() || staff.email,
                      }))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-zinc-700 font-medium">Priority</Label>
                    <FormSelectField
                      name="priority"
                      defaultValue="normal"
                      options={[
                        { value: "low", label: "Low" },
                        { value: "normal", label: "Normal" },
                        { value: "high", label: "High" },
                        { value: "urgent", label: "Urgent" },
                      ]}
                    />
                  </div>

                  <div className="grid gap-2 sm:col-span-2">
                    <Label className="text-zinc-700 font-medium">Due Date</Label>
                    <FormDateTimeField name="dueAt" placeholder="Select due date and time" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <FormSubmitButton idleText="Create Task" pendingText="Creating..." className="w-full sm:w-auto px-8 shadow-sm" />
            </div>
          </form>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {COLUMNS.map((column) => {
            const tasks = context.tasks.filter((task) => task.status === column.key);

            return (
              <Card key={column.key} className="border-zinc-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{column.title}</span>
                    <Badge variant="outline">{tasks.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tasks.length === 0 ? (
                    <p className="text-sm text-zinc-500">No tasks.</p>
                  ) : (
                    <ul className="space-y-3">
                      {tasks.map((task) => {
                        const roomRaw = task.rooms as { room_number?: string } | Array<{ room_number?: string }> | null;
                        const room = Array.isArray(roomRaw) ? roomRaw[0] : roomRaw;
                        const reservationRaw = task.reservations as
                          | { check_in?: string; guests?: unknown }
                          | Array<{ check_in?: string; guests?: unknown }>
                          | null;
                        const reservation = Array.isArray(reservationRaw) ? reservationRaw[0] : reservationRaw;
                        const assigneeRaw = task.profiles as { full_name?: string; email?: string } | Array<{ full_name?: string; email?: string }> | null;
                        const assignee = Array.isArray(assigneeRaw) ? assigneeRaw[0] : assigneeRaw;

                        return (
                          <li key={task.id} className="rounded-xl border border-zinc-200 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-zinc-900">{task.title}</p>
                              <Badge className={PRIORITY_TONE[task.priority] ?? PRIORITY_TONE.normal}>{task.priority}</Badge>
                            </div>
                            {task.description ? <p className="mt-1 text-xs text-zinc-600">{task.description}</p> : null}
                            <p className="mt-2 text-xs text-zinc-500">
                              {room?.room_number ? `Room ${room.room_number}` : "No room"}
                              {reservation ? ` · ${getGuestName(reservation.guests)} (${reservation.check_in})` : ""}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">Assignee: {assignee?.full_name || assignee?.email || "Unassigned"}</p>

                            <form action={updateStatusAction} className="mt-3 flex items-center gap-2">
                              <input type="hidden" name="taskId" value={task.id} />
                              <div className="flex-1">
                                <FormSelectField
                                  name="status"
                                  defaultValue={task.status}
                                  options={[
                                    { value: "todo", label: "To Do" },
                                    { value: "in_progress", label: "In Progress" },
                                    { value: "done", label: "Done" },
                                  ]}
                                />
                              </div>
                              <FormSubmitButton idleText="Save" pendingText="..." size="sm" variant="outline" />
                            </form>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
