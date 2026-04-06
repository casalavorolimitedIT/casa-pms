import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHelpDialog } from "@/components/custom/page-help-dialog";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { WorkflowStepperSheet } from "@/components/custom/workflow-stepper-sheet";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { getMessagingContext, markAsRead, replyToThread, sendMessage, sendTemplate } from "./actions";

type MessagingPageProps = {
  searchParams?: Promise<{
    thread?: string | string[];
    ok?: string | string[];
    error?: string | string[];
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

function withStatus(base: string, key: "ok" | "error", value: string) {
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}${key}=${encodeURIComponent(value)}`;
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
  const ok = readSearchValue(params.ok);
  const error = readSearchValue(params.error);
  const context = await getMessagingContext(activePropertyId, selectedThreadId);
  const activeThread = context.threads.find((thread) => thread.id === context.selectedThreadId) ?? null;
  const activeGuest = getGuest(activeThread?.guests);
  const unreadThreads = context.threads.filter((thread) => thread.unread_count > 0).length;
  const waitingOnStaff = context.threads.filter((thread) => thread.status === "waiting_on_staff").length;

  const sendMessageAction = async (formData: FormData) => {
    "use server";
    try {
      await sendMessage(formData);
      redirect(`/dashboard/messaging?ok=${encodeURIComponent("Message sent successfully.")}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to send message.";
      redirect(`/dashboard/messaging?error=${encodeURIComponent(message)}`);
    }
  };

  const sendTemplateAction = async (formData: FormData) => {
    "use server";
    const threadId = String(formData.get("threadId") ?? "");
    const base = threadId ? `/dashboard/messaging?thread=${encodeURIComponent(threadId)}` : "/dashboard/messaging";

    try {
      await sendTemplate(formData);
      redirect(withStatus(base, "ok", "Template sent successfully."));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to send template.";
      redirect(withStatus(base, "error", message));
    }
  };

  const markAsReadAction = async (formData: FormData) => {
    "use server";
    const threadId = String(formData.get("threadId") ?? "");
    const base = threadId ? `/dashboard/messaging?thread=${encodeURIComponent(threadId)}` : "/dashboard/messaging";

    try {
      await markAsRead(formData);
      redirect(withStatus(base, "ok", "Thread marked as read."));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to mark thread as read.";
      redirect(withStatus(base, "error", message));
    }
  };

  const replyAction = async (formData: FormData) => {
    "use server";
    const threadId = String(formData.get("threadId") ?? "");
    const base = threadId ? `/dashboard/messaging?thread=${encodeURIComponent(threadId)}` : "/dashboard/messaging";

    try {
      await replyToThread(formData);
      redirect(withStatus(base, "ok", "Reply sent successfully."));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to send reply.";
      redirect(withStatus(base, "error", message));
    }
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="page-title text-balance tracking-tight">Guest Messaging</h1>
            <p className="page-subtitle">Run a unified guest inbox across outbound reminders, concierge follow-up, and inbound replies without losing reservation context.</p>
          </div>
          <PageHelpDialog
            className="border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            pageName="Guest messaging"
            summary="This page centralizes outbound and inbound guest communication in a single thread model."
            responsibilities={[
              "Start new conversations tied to reservation context.",
              "Use templates to speed up common guest responses.",
              "Reply in-thread and keep handover continuity for staff.",
            ]}
            relatedPages={[
              {
                href: "/dashboard/reservations",
                label: "Reservations",
                description: "Messaging targets guests from active reservation records.",
              },
            ]}
          />
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
            <Card className="border-zinc-200 bg-linear-to-br from-white via-zinc-50/70 to-white">
              <CardHeader>
                <CardTitle className="text-base">Messaging Workflow</CardTitle>
              </CardHeader>
              <CardContent>
                <WorkflowStepperSheet
                  title="Guest Messaging Flow"
                  description="Compose, template, and reply from one guided side panel."
                  triggerLabel="Open messaging workflow"
                  memoryKey="messaging-workflow"
                  steps={[
                    { title: "Compose message", description: "Start a new outbound conversation." },
                    { title: "Send template", description: "Use quick templates on selected thread." },
                    { title: "Reply in thread", description: "Continue conversation seamlessly." },
                  ]}
                >
                  <div className="grid gap-6">
                    <section data-workflow-step="1" className="space-y-3 rounded-2xl border border-zinc-200 p-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex size-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">1</span>
                        <h2 className="text-sm font-semibold text-zinc-900">Compose message</h2>
                      </div>
                      <form action={sendMessageAction} className="grid gap-4">
                        <input type="hidden" name="propertyId" value={activePropertyId} />

                        <div className="grid gap-2">
                          <Label htmlFor="wf-reservationId">Reservation</Label>
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
                            <Label htmlFor="wf-channel">Channel</Label>
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
                            <Label htmlFor="wf-externalAddress">Override Destination</Label>
                            <Input id="wf-externalAddress" name="externalAddress" placeholder="Optional phone or email override" />
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="wf-body">Message</Label>
                          <Textarea id="wf-body" name="body" required placeholder="Hello, your room is ready. Reply here if you need airport pickup or dining arrangements before arrival." />
                        </div>

                        <FormSubmitButton idleText="Send Message" pendingText="Sending message..." />
                      </form>
                    </section>

                    <section data-workflow-step="2" className="space-y-3 rounded-2xl border border-zinc-200 p-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex size-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">2</span>
                        <h2 className="text-sm font-semibold text-zinc-900">Send template</h2>
                      </div>
                      {!activeThread ? (
                        <p className="text-sm text-zinc-500">Select a thread in the inbox to send templates.</p>
                      ) : (
                        <div className="grid gap-2">
                          {context.templates.map((template) => (
                            <form key={template.key} action={sendTemplateAction}>
                              <input type="hidden" name="threadId" value={activeThread.id} />
                              <input type="hidden" name="templateKey" value={template.key} />
                              <FormSubmitButton
                                idleText={template.label}
                                pendingText="Sending template..."
                                variant="outline"
                                className="w-full justify-start border-zinc-200 bg-white text-left text-sm text-zinc-700"
                              />
                            </form>
                          ))}
                        </div>
                      )}
                    </section>

                    <section data-workflow-step="3" className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex size-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">3</span>
                        <h2 className="text-sm font-semibold text-zinc-900">Reply in thread</h2>
                      </div>
                      {!activeThread ? (
                        <p className="text-sm text-zinc-500">Open a thread to send a direct reply.</p>
                      ) : (
                        <form action={replyAction} className="grid gap-3">
                          <input type="hidden" name="threadId" value={activeThread.id} />
                          <div className="space-y-1">
                            <Label htmlFor="wf-reply-body">Reply</Label>
                            <p className="text-xs text-zinc-500">Use the existing delivery address to keep the same thread active.</p>
                          </div>
                          <Textarea id="wf-reply-body" name="body" required placeholder="Thanks for the update. We have coordinated with housekeeping and will message again when the room is ready." />
                          <FormSubmitButton idleText="Send Reply" pendingText="Sending reply..." />
                        </form>
                      )}
                    </section>
                  </div>
                </WorkflowStepperSheet>
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
                              <span>{new Date(thread.last_message_at).toLocaleString("en-GB")}</span>
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
                      <form action={markAsReadAction}>
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
                      <p className="mt-3 text-xs text-zinc-500">Last activity {new Date(activeThread.last_message_at).toLocaleString("en-GB")}</p>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Quick Templates</p>
                      <div className="mt-3 grid gap-2">
                        {context.templates.map((template) => (
                          <form key={template.key} action={sendTemplateAction}>
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
                                <span>{new Date(message.created_at).toLocaleString("en-GB")}</span>
                              </div>
                              <p className="mt-2 text-sm leading-6 text-zinc-900">{message.body}</p>
                              {message.template_key ? <p className="mt-2 text-xs text-zinc-500">Template: {message.template_key}</p> : null}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form action={replyAction} className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4">
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