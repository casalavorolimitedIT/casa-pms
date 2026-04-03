import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { getMessagingContext, markAsRead, replyToThread, sendMessage, sendTemplate } from "./actions";

type MessagingPageProps = {
  searchParams?: Promise<{
    thread?: string | string[];
  }>;
};

const CHANNEL_TONE: Record<string, string> = {
  sms: "bg-sky-100 text-sky-700",
  whatsapp: "bg-emerald-100 text-emerald-700",
  email: "bg-violet-100 text-violet-700",
};

const STATUS_TONE: Record<string, string> = {
  open: "bg-zinc-100 text-zinc-700",
  waiting_on_guest: "bg-orange-100 text-orange-700",
  waiting_on_staff: "bg-blue-100 text-blue-700",
  closed: "bg-emerald-100 text-emerald-700",
};

function readSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getGuest(guestRaw: unknown) {
  if (!guestRaw) return null;
  if (Array.isArray(guestRaw)) {
    return (guestRaw[0] as {
      id?: string;
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string;
    } | undefined) ?? null;
  }

  return guestRaw as {
    id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
}

function getGuestName(guestRaw: unknown) {
  const guest = getGuest(guestRaw);
  return `${guest?.first_name ?? ""} ${guest?.last_name ?? ""}`.trim() || "Unknown guest";
}

export default async function MessagingPage({ searchParams }: MessagingPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.</div>;
  }

  const params = (await searchParams) ?? {};
  const selectedThreadId = readSearchValue(params.thread);
  const context = await getMessagingContext(activePropertyId, selectedThreadId);
  const activeThread = context.threads.find((thread) => thread.id === context.selectedThreadId) ?? null;
  const activeGuest = getGuest(activeThread?.guests);
  const unreadThreads = context.threads.filter((thread) => thread.unread_count > 0).length;
  const waitingOnStaff = context.threads.filter((thread) => thread.status === "waiting_on_staff").length;

  return (
    <div className="page-shell">
      <div className="page-container">
        <div className="space-y-1">
          <h1 className="page-title text-balance tracking-tight">Guest Messaging</h1>
          <p className="page-subtitle">Run a unified guest inbox across outbound reminders, concierge follow-up, and inbound replies without losing reservation context.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card className="border-zinc-200">
            <CardContent className="space-y-1 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Active Threads</p>
              <p className="text-3xl font-semibold text-zinc-900">{context.threads.length}</p>
              <p className="text-sm text-zinc-500">Guest conversations with full thread continuity.</p>
            </CardContent>
          </Card>
          <Card className="border-zinc-200">
            <CardContent className="space-y-1 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Unread</p>
              <p className="text-3xl font-semibold text-zinc-900">{unreadThreads}</p>
              <p className="text-sm text-zinc-500">Threads that still need a staff read or reply.</p>
            </CardContent>
          </Card>
          <Card className="border-zinc-200">
            <CardContent className="space-y-1 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Waiting on Staff</p>
              <p className="text-3xl font-semibold text-zinc-900">{waitingOnStaff}</p>
              <p className="text-sm text-zinc-500">Inbound guest replies that should be triaged next.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.35fr]">
          <div className="space-y-4">
            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle className="text-base">Start a Conversation</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={sendMessage} className="grid gap-4">
                  <input type="hidden" name="propertyId" value={activePropertyId} />

                  <div className="grid gap-2">
                    <Label htmlFor="reservationId">Reservation</Label>
                    <FormSelectField
                      name="reservationId"
                      placeholder="Select reservation"
                      options={context.reservations.map((reservation) => ({
                        value: reservation.id,
                        label: `${getGuestName(reservation.guests)} (${reservation.status})`,
                      }))}
                      emptyStateText="No active reservation available for messaging."
                      emptyStateLinkHref="/dashboard/reservations"
                      emptyStateLinkLabel="Open reservations"
                    />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="channel">Channel</Label>
                      <FormSelectField
                        name="channel"
                        defaultValue="sms"
                        options={[
                          { value: "sms", label: "SMS" },
                          { value: "whatsapp", label: "WhatsApp" },
                          { value: "email", label: "Email" },
                        ]}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="externalAddress">Override Destination</Label>
                      <Input id="externalAddress" name="externalAddress" placeholder="Optional phone or email override" />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="body">Message</Label>
                    <Textarea id="body" name="body" required placeholder="Hello, your room is ready. Reply here if you need airport pickup or dining arrangements before arrival." />
                  </div>

                  <FormSubmitButton idleText="Send Message" pendingText="Sending message..." />
                </form>
              </CardContent>
            </Card>

            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle className="text-base">Inbox</CardTitle>
              </CardHeader>
              <CardContent>
                {context.threads.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-6 text-sm text-zinc-500">
                    No guest threads yet. Start with an arrival-day welcome or concierge follow-up.
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {context.threads.map((thread) => {
                      const isActive = thread.id === context.selectedThreadId;
                      return (
                        <li key={thread.id}>
                          <Link
                            href={`/dashboard/messaging?thread=${thread.id}`}
                            className={[
                              "block rounded-2xl border p-3 transition-colors",
                              isActive ? "border-orange-200 bg-[#fff6ef]" : "border-zinc-200 bg-white hover:bg-zinc-50",
                            ].join(" ")}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <p className="font-medium text-zinc-900">{getGuestName(thread.guests)}</p>
                                <p className="text-xs text-zinc-500">{thread.external_address || "No destination assigned"}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge className={CHANNEL_TONE[thread.channel] ?? "bg-zinc-100 text-zinc-700"}>{thread.channel}</Badge>
                                <Badge className={STATUS_TONE[thread.status] ?? "bg-zinc-100 text-zinc-700"}>{thread.status.replaceAll("_", " ")}</Badge>
                              </div>
                            </div>
                            <p className="mt-3 text-sm text-zinc-700">{thread.last_message_preview || "No message preview yet"}</p>
                            <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                              <span>{new Date(thread.last_message_at).toLocaleString()}</span>
                              <span>{thread.unread_count > 0 ? `${thread.unread_count} unread` : "Seen"}</span>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-zinc-200">
            <CardHeader className="gap-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle className="text-base">Conversation Detail</CardTitle>
                  <p className="mt-1 text-sm text-zinc-500">
                    {activeThread ? `${getGuestName(activeThread.guests)} • ${activeThread.external_address || "No destination"}` : "Select a thread to review inbound and outbound guest communication."}
                  </p>
                </div>

                {activeThread ? (
                  <div className="flex flex-wrap gap-2">
                    <Badge className={CHANNEL_TONE[activeThread.channel] ?? "bg-zinc-100 text-zinc-700"}>{activeThread.channel}</Badge>
                    <Badge className={STATUS_TONE[activeThread.status] ?? "bg-zinc-100 text-zinc-700"}>{activeThread.status.replaceAll("_", " ")}</Badge>
                    {activeThread.unread_count > 0 ? (
                      <form action={markAsRead}>
                        <input type="hidden" name="threadId" value={activeThread.id} />
                        <FormSubmitButton idleText="Mark as Read" pendingText="Saving..." size="sm" variant="outline" />
                      </form>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {!activeThread ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-sm text-zinc-500">
                  No thread selected yet. Choose a conversation from the inbox or start a new one from the compose panel.
                </div>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 text-sm text-zinc-600">
                      <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Guest Context</p>
                      <p className="mt-2 font-medium text-zinc-900">{getGuestName(activeThread.guests)}</p>
                      <p className="mt-1">Email: {activeGuest?.email || "Not on file"}</p>
                      <p className="mt-1">Phone: {activeGuest?.phone || "Not on file"}</p>
                      <p className="mt-3 text-xs text-zinc-500">Last activity {new Date(activeThread.last_message_at).toLocaleString()}</p>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Quick Templates</p>
                      <div className="mt-3 grid gap-2">
                        {context.templates.map((template) => (
                          <form key={template.key} action={sendTemplate}>
                            <input type="hidden" name="threadId" value={activeThread.id} />
                            <input type="hidden" name="templateKey" value={template.key} />
                            <FormSubmitButton idleText={template.label} pendingText="Sending template..." variant="outline" className="w-full justify-start border-zinc-200 bg-white text-left text-sm text-zinc-700" />
                          </form>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {context.messages.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-6 text-sm text-zinc-500">
                        No messages have been recorded on this thread yet.
                      </div>
                    ) : (
                      context.messages.map((message) => {
                        const outbound = message.direction === "outbound";
                        return (
                          <div key={message.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-xl rounded-2xl border px-4 py-3 ${outbound ? "border-orange-200 bg-[#fff3ea]" : "border-zinc-200 bg-white"}`}>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                                <span>{message.direction}</span>
                                <span>{message.status}</span>
                                <span>{new Date(message.created_at).toLocaleString()}</span>
                              </div>
                              <p className="mt-2 text-sm leading-6 text-zinc-900">{message.body}</p>
                              {message.template_key ? <p className="mt-2 text-xs text-zinc-500">Template: {message.template_key}</p> : null}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form action={replyToThread} className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4">
                    <input type="hidden" name="threadId" value={activeThread.id} />
                    <div className="space-y-1">
                      <Label htmlFor="reply-body">Reply</Label>
                      <p className="text-xs text-zinc-500">Use the existing delivery address to keep the same thread active.</p>
                    </div>
                    <Textarea id="reply-body" name="body" required placeholder="Thanks for the update. We have coordinated with housekeeping and will message again when the room is ready." />
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-zinc-500">Replies are appended to the current thread and update the inbox preview automatically.</p>
                      <FormSubmitButton idleText="Send Reply" pendingText="Sending reply..." />
                    </div>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}