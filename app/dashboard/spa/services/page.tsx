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
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Badge } from "@/components/ui/badge";
import { createSpaService, getSpaServicesContext, updateSpaService } from "../actions";

type SpaServicesPageProps = {
  searchParams?: Promise<{ ok?: string | string[]; error?: string | string[] }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatMinutes(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatPrice(minor: number) {
  return (minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });
}

export default async function SpaServicesPage({ searchParams }: SpaServicesPageProps) {
  await redirectIfNotAuthenticated();
  const propertyId = await getActivePropertyId();

  if (!propertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Select an active property to manage spa services.</div>;
  }

  const canManage = await hasPermission(propertyId, "spa.manage");
  if (!canManage) {
    redirect("/dashboard?error=You%20do%20not%20have%20access%20to%20spa%20services");
  }

  const query = (await searchParams) ?? {};
  const ok = first(query.ok);
  const error = first(query.error);

  const context = await getSpaServicesContext(propertyId);

  const createAction = async (formData: FormData) => {
    "use server";
    const result = await createSpaService(formData);
    if (result?.success) redirect("/dashboard/spa/services?ok=Service%20created");
    redirect(`/dashboard/spa/services?error=${encodeURIComponent(result?.error ?? "Unable to create service")}`);
  };

  const updateAction = async (formData: FormData) => {
    "use server";
    const result = await updateSpaService(formData);
    if (result?.success) redirect("/dashboard/spa/services?ok=Service%20updated");
    redirect(`/dashboard/spa/services?error=${encodeURIComponent(result?.error ?? "Unable to update service")}`);
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />

        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="page-title">Spa Services</h1>
            <p className="page-subtitle">Define treatments and experiences offered at the spa, including duration and pricing.</p>
          </div>
          <PageHelpDialog
            className="border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            pageName="Spa services"
            summary="This page defines the service catalog used by therapist qualification and booking workflows."
            responsibilities={[
              "Create new service records with duration and pricing.",
              "Keep descriptions and availability status current.",
              "Maintain service definitions so booking logic stays accurate.",
            ]}
            relatedPages={[
              {
                href: "/dashboard/spa/therapists",
                label: "Spa Therapists",
                description: "Qualification mapping depends on active services.",
              },
              {
                href: "/dashboard/spa/bookings",
                label: "Spa Bookings",
                description: "Bookings use service duration and pricing fields.",
              },
            ]}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Metric title="Total Services" value={context.services.length} />
          <Metric title="Active" value={context.services.filter((s) => s.is_active).length} />
          <Metric title="Inactive" value={context.services.filter((s) => !s.is_active).length} />
        </div>

        <Card className="glass-panel mt-8 border-zinc-200/80 bg-linear-to-br from-white via-zinc-50/70 to-white">
          <CardHeader>
            <CardTitle className="text-base">Create Service Workflow</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-zinc-900">Create new services in one guided side panel.</p>
              <p className="text-sm text-zinc-600">Use numbered steps to reduce form fatigue and setup mistakes.</p>
            </div>
            <WorkflowStepperSheet
              title="New Spa Service"
              description="Define service identity, timing, and price in one uninterrupted flow."
              triggerLabel="Open service workflow"
              steps={[
                { title: "Set service identity", description: "Name and describe the service." },
                { title: "Configure delivery", description: "Set duration in minutes." },
                { title: "Set commercial values", description: "Set base price and submit." },
              ]}
            >
              <form action={createAction} className="grid gap-6">
                <input type="hidden" name="propertyId" value={propertyId} />

                <section className="space-y-3 rounded-2xl border border-zinc-200 p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">1</span>
                    <h2 className="text-sm font-semibold text-zinc-900">Set service identity</h2>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="wf-name">Service Name</Label>
                    <Input id="wf-name" name="name" placeholder="e.g. Deep Tissue Massage" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="wf-description">Description (optional)</Label>
                    <Textarea id="wf-description" name="description" rows={3} placeholder="Brief description of the treatment..." />
                  </div>
                </section>

                <section className="space-y-3 rounded-2xl border border-zinc-200 p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">2</span>
                    <h2 className="text-sm font-semibold text-zinc-900">Configure delivery</h2>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="wf-durationMin">Duration (minutes)</Label>
                    <Input id="wf-durationMin" name="durationMin" type="number" min={5} max={480} placeholder="60" required />
                  </div>
                </section>

                <section className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">3</span>
                    <h2 className="text-sm font-semibold text-zinc-900">Set commercial values</h2>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="wf-priceMinor">Base Price (in cents)</Label>
                    <Input id="wf-priceMinor" name="priceMinor" type="number" min={0} placeholder="15000" required />
                  </div>
                  <FormSubmitButton idleText="Create service" pendingText="Saving..." className="w-full sm:w-auto" />
                </section>
              </form>
            </WorkflowStepperSheet>
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-6 lg:grid-cols-1">
          <div className="space-y-3">
            {context.services.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-2">No services yet. Create one to get started.</p>
            ) : (
              context.services.map((service) => (
                <Card key={service.id} className="glass-panel">
                  <CardContent className="pt-4">
                    <details>
                      <summary className="flex cursor-pointer items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{service.name}</span>
                          <Badge variant={service.is_active ? "default" : "secondary"}>
                            {service.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{formatMinutes(service.duration_minutes)}</span>
                          <span>${formatPrice(service.price_minor)}</span>
                        </div>
                      </summary>

                      <form action={updateAction} className="mt-4 grid gap-3 border-t pt-4">
                        <input type="hidden" name="propertyId" value={propertyId} />
                        <input type="hidden" name="serviceId" value={service.id} />
                        <div className="grid gap-2">
                          <Label>Service Name</Label>
                          <Input name="name" defaultValue={service.name} required />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="grid gap-2">
                            <Label>Duration (minutes)</Label>
                            <Input name="durationMin" type="number" min={5} max={480} defaultValue={service.duration_minutes} required />
                          </div>
                          <div className="grid gap-2">
                            <Label>Price (cents)</Label>
                            <Input name="priceMinor" type="number" min={0} defaultValue={service.price_minor} required />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label>Description</Label>
                          <Textarea name="description" rows={3} defaultValue={service.description ?? ""} />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`isActive-${service.id}`}
                            name="isActive"
                            value="true"
                            defaultChecked={service.is_active}
                            className="h-4 w-4 rounded border"
                          />
                          <Label htmlFor={`isActive-${service.id}`} className="cursor-pointer font-normal">
                            Active (available for booking)
                          </Label>
                        </div>
                        <FormSubmitButton idleText="Save changes" pendingText="Saving..." className="w-full sm:w-auto" />
                      </form>
                    </details>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: number | string }) {
  return (
    <Card className="glass-panel">
      <CardContent className="flex flex-col gap-1 pt-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
