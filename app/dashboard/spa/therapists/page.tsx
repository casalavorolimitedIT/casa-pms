import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { hasPermission } from "@/lib/staff/server-permissions";
import { PageHelpDialog } from "@/components/custom/page-help-dialog";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { WorkflowStepperSheet } from "@/components/custom/workflow-stepper-sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { addTherapistQualification, createSpaTherapist, getSpaTherapistsContext, updateTherapistSchedule } from "../actions";

type SpaTherapistsPageProps = {
  searchParams?: Promise<{ ok?: string | string[]; error?: string | string[] }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SpaTherapistsPage({ searchParams }: SpaTherapistsPageProps) {
  await redirectIfNotAuthenticated();
  const propertyId = await getActivePropertyId();

  if (!propertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Select an active property to manage therapists.</div>;
  }

  const canManage = await hasPermission(propertyId, "spa.manage");
  if (!canManage) {
    redirect("/dashboard?error=You%20do%20not%20have%20access%20to%20spa%20therapists");
  }

  const query = (await searchParams) ?? {};
  const ok = first(query.ok);
  const error = first(query.error);

  const context = await getSpaTherapistsContext(propertyId);

  const therapistOptions = context.therapists.map((therapist) => ({
    value: therapist.id,
    label: therapist.display_name,
  }));

  const createTherapistAction = async (formData: FormData) => {
    "use server";
    const result = await createSpaTherapist(formData);
    if (result?.success) redirect("/dashboard/spa/therapists?ok=Therapist%20created");
    redirect(`/dashboard/spa/therapists?error=${encodeURIComponent(result?.error ?? "Unable to create therapist")}`);
  };

  const addQualificationAction = async (formData: FormData) => {
    "use server";
    const result = await addTherapistQualification(formData);
    if (result?.success) redirect("/dashboard/spa/therapists?ok=Qualification%20saved");
    redirect(`/dashboard/spa/therapists?error=${encodeURIComponent(result?.error ?? "Unable to save qualification")}`);
  };

  const shiftAction = async (formData: FormData) => {
    "use server";
    const result = await updateTherapistSchedule(formData);
    if (result?.success) redirect("/dashboard/spa/therapists?ok=Shift%20saved");
    redirect(`/dashboard/spa/therapists?error=${encodeURIComponent(result?.error ?? "Unable to save shift")}`);
  };

  const serviceOptions = context.services.map((service) => ({
    value: service.id,
    label: service.name,
  }));

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="page-title">Spa Therapists</h1>
            <p className="page-subtitle">Manage therapist profiles, service qualifications, and shift availability windows.</p>
          </div>
          <PageHelpDialog
            className="border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            pageName="Spa therapists"
            summary="This page controls who can perform services and when they are available for booking."
            responsibilities={[
              "Add therapist profiles for scheduling and reporting.",
              "Map each therapist to the services they are qualified to deliver.",
              "Define working windows and availability states for booking validation.",
            ]}
            relatedPages={[
              {
                href: "/dashboard/spa/services",
                label: "Spa Services",
                description: "Services determine qualification options.",
              },
              {
                href: "/dashboard/spa/bookings",
                label: "Spa Bookings",
                description: "Bookings rely on therapist qualifications and shift coverage.",
              },
            ]}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Metric title="Therapists" value={context.therapists.length} />
          <Metric title="Qualifications" value={context.qualifications.length} />
          <Metric title="Shifts" value={context.shifts.length} />
        </div>

        <Card className="glass-panel mt-8 border-zinc-200/80 bg-linear-to-br from-white via-zinc-50/70 to-white">
          <CardHeader><CardTitle className="text-base">Therapist Workflow</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-zinc-900">Set up therapist operations in one side flow.</p>
              <p className="text-sm text-zinc-600">Create profile, map qualifications, and publish shifts without switching between cards.</p>
            </div>
            <WorkflowStepperSheet
              title="Therapist Setup"
              description="Use the guided sequence to fully onboard and schedule therapists."
              triggerLabel="Open therapist workflow"
              steps={[
                { title: "Create therapist", description: "Add a therapist profile for the property." },
                { title: "Assign qualification", description: "Map therapist to service skills." },
                { title: "Add shift", description: "Publish availability windows for bookings." },
              ]}
            >
              <div className="grid gap-6">
                <section className="space-y-3 rounded-2xl border border-zinc-200 p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">1</span>
                    <h2 className="text-sm font-semibold text-zinc-900">Create therapist</h2>
                  </div>
                  <form action={createTherapistAction} className="grid gap-3">
                    <input type="hidden" name="propertyId" value={propertyId} />
                    <div className="grid gap-2">
                      <Label htmlFor="wf-displayName">Display Name</Label>
                      <Input id="wf-displayName" name="displayName" placeholder="Therapist name" required />
                    </div>
                    <FormSubmitButton idleText="Create therapist" pendingText="Saving..." className="w-full sm:w-auto" />
                  </form>
                </section>

                <section className="space-y-3 rounded-2xl border border-zinc-200 p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">2</span>
                    <h2 className="text-sm font-semibold text-zinc-900">Assign qualification</h2>
                  </div>
                  <form action={addQualificationAction} className="grid gap-3">
                    <input type="hidden" name="propertyId" value={propertyId} />
                    <div className="grid gap-2">
                      <Label htmlFor="wf-therapistId">Therapist</Label>
                      <FormSelectField name="therapistId" options={therapistOptions} placeholder="Select therapist" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wf-serviceId">Service</Label>
                      <FormSelectField name="serviceId" options={serviceOptions} placeholder="Select service" />
                    </div>
                    <FormSubmitButton idleText="Save qualification" pendingText="Saving..." className="w-full sm:w-auto" />
                  </form>
                </section>

                <section className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">3</span>
                    <h2 className="text-sm font-semibold text-zinc-900">Add shift</h2>
                  </div>
                  <form action={shiftAction} className="grid gap-3">
                    <input type="hidden" name="propertyId" value={propertyId} />
                    <div className="grid gap-2">
                      <Label htmlFor="wf-shiftTherapist">Therapist</Label>
                      <FormSelectField name="therapistId" options={therapistOptions} placeholder="Select therapist" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wf-startsAt">Starts</Label>
                      <Input id="wf-startsAt" name="startsAt" type="datetime-local" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wf-endsAt">Ends</Label>
                      <Input id="wf-endsAt" name="endsAt" type="datetime-local" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wf-status">Status</Label>
                      <FormSelectField
                        name="status"
                        defaultValue="available"
                        options={[
                          { value: "available", label: "Available" },
                          { value: "blocked", label: "Blocked" },
                          { value: "off", label: "Off" },
                        ]}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wf-notes">Notes</Label>
                      <Textarea id="wf-notes" name="notes" rows={2} />
                    </div>
                    <FormSubmitButton idleText="Save shift" pendingText="Saving..." className="w-full sm:w-auto" />
                  </form>
                </section>
              </div>
            </WorkflowStepperSheet>
          </CardContent>
        </Card>

        <Card className="glass-panel mt-6">
          <CardHeader><CardTitle className="text-base">Therapist Schedule Board</CardTitle></CardHeader>
          <CardContent>
            {context.therapists.length === 0 ? (
              <p className="text-sm text-zinc-500">No therapists added yet.</p>
            ) : (
              <ul className="space-y-3">
                {context.therapists.map((therapist) => {
                  const shifts = context.shifts.filter((shift) => shift.therapist_id === therapist.id);
                  const qualifications = context.qualifications.filter((qualification) => qualification.therapist_id === therapist.id);
                  return (
                    <li key={therapist.id} className="rounded-xl border border-zinc-200 p-3">
                      <p className="font-semibold text-zinc-900">{therapist.display_name}</p>
                      <p className="mt-1 text-xs text-zinc-500">{qualifications.length} qualification(s) · {shifts.length} shift(s)</p>
                      <div className="mt-2 space-y-2">
                        {shifts.slice(0, 4).map((shift) => (
                          <div key={shift.id} className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-600">
                            {new Date(shift.starts_at).toLocaleString("en-GB")} to {new Date(shift.ends_at).toLocaleTimeString("en-GB")} · {shift.status}
                          </div>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <Card className="border-zinc-200">
      <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-600">{title}</CardTitle></CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight text-zinc-900">{value}</p>
      </CardContent>
    </Card>
  );
}
