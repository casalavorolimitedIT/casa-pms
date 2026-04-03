import Link from "next/link";
import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { addRateRestriction, getRatePlanDetail, updateRateRestriction } from "../actions/rate-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { PageHelpDialog } from "@/components/custom/page-help-dialog";
import { RestrictionsTable } from "./restrictions-table";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ ok?: string | string[]; error?: string | string[] }>;
}

function readSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RatePlanDetailPage({ params, searchParams }: PageProps) {
  await redirectIfNotAuthenticated();
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const ok = readSearchValue(query.ok);
  const error = readSearchValue(query.error);
  const result = await getRatePlanDetail(id);

  if ("error" in result || !result.plan) {
    return <div className="p-6 text-sm text-muted-foreground">Rate plan not found.</div>;
  }

  const { plan, roomTypes, restrictions } = result;
  const submitAddRestriction = async (formData: FormData) => {
    "use server";
    const actionResult = await addRateRestriction(formData);
    if (actionResult?.success) {
      redirect(`/dashboard/rates/${id}?ok=${encodeURIComponent("Restriction added.")}`);
    }
    redirect(`/dashboard/rates/${id}?error=${encodeURIComponent(actionResult?.error ?? "Unable to add restriction.")}`);
  };

  const submitUpdateRestriction = async (formData: FormData) => {
    "use server";
    const actionResult = await updateRateRestriction(formData);
    if (actionResult?.success) {
      redirect(`/dashboard/rates/${id}?ok=${encodeURIComponent("Restriction updated.")}`);
    }
    redirect(`/dashboard/rates/${id}?error=${encodeURIComponent(actionResult?.error ?? "Unable to update restriction.")}`);
  };

  return (
    <div className="page-shell">
      <div className="page-container">
        <FormStatusToast ok={ok} error={error} />
        <div className="flex items-center justify-between">
            
            <div>
            <h1 className="page-title">{plan.name}</h1>
            <p className="page-subtitle">Currency: {plan.currency_code}</p>
            </div>
          <div className="flex items-center gap-3">
          <Button asChild size="sm" variant="outline"><Link href="/dashboard/rates">Back</Link></Button>
          <PageHelpDialog
              className=" border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
              pageName="Rate plan restrictions"
              summary="This page manages seasonal pricing restrictions for the selected rate plan, including room-type-specific blackout dates, minimum stays, and override rates."
              responsibilities={[
                "Review the restrictions already attached to this rate plan.",
                "Add a new restriction for a specific room type and date range.",
                "Edit an existing restriction without leaving the page.",
              ]}
              relatedPages={[
                {
                  href: "/dashboard/rates",
                  label: "Rates",
                  description: "This detail page depends on the Rates page for selecting the rate plan you want to manage.",
                },
              ]}
            />
          </div>
        </div>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-base">Seasonal Restrictions</CardTitle>
          </CardHeader>
          <CardContent>
            <RestrictionsTable
              ratePlanId={plan.id}
              currencyCode={plan.currency_code}
              roomTypes={roomTypes.map((roomType) => ({ id: roomType.id, name: roomType.name }))}
              restrictions={restrictions}
              onCreate={submitAddRestriction}
              onUpdate={submitUpdateRestriction}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
