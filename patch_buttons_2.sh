cat << 'INNER_EOF' > app/dashboard/assets/[id]/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { createClient } from "@/lib/supabase/server";
import { AssetPhotosGallery } from "@/components/custom/asset-photos-gallery";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { updateAsset } from "../actions";
import { formatIsoDate } from "@/lib/pms/formatting";

interface AssetDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ ok?: string | string[]; error?: string | string[] }>;
}

function readSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AssetDetailPage({ params, searchParams }: AssetDetailPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const query = (await searchParams) ?? {};
  const ok = readSearchValue(query.ok);
  const error = readSearchValue(query.error);

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.</div>;
  }

  const { id } = await params;
  const updateAction = async (formData: FormData) => {
    "use server";
    const result = await updateAsset(formData);
    if (result?.success) {
      redirect(`/dashboard/assets/${id}?ok=${encodeURIComponent("Asset updated.")}`);
    }
    redirect(`/dashboard/assets/${id}?error=${encodeURIComponent(result?.error ?? "Unable to update asset.")}`);
  };

  const supabase = await createClient();
  const { data: asset } = await supabase
    .from("assets")
    .select("id, name, category, purchase_date, warranty_until, created_at")
    .eq("id", id)
    .eq("property_id", activePropertyId)
    .maybeSingle();

  if (!asset) {
    notFound();
  }

  const isWarrantyExpired = asset.warranty_until && new Date(asset.warranty_until) < new Date();

  return (
    <div className="page-shell min-h-screen bg-zinc-50/50">
      <div className="page-container max-w-6xl py-8 animate-in fade-in-50 zoom-in-[0.99] duration-700">
        <FormStatusToast ok={ok} error={error} />

        {/* Top Navigation */}
        <div className="mb-10">
          <Button asChild variant="ghost" size="sm" className="pl-0 text-zinc-500 hover:text-zinc-900 hover:bg-transparent tracking-wider text-xs uppercase group font-semibold">
            <Link href="/dashboard/assets">
              <span className="mr-2 inline-block transition-transform group-hover:-translate-x-1 font-normal opacity-50">←</span> 
              Registry
            </Link>
          </Button>
        </div>

        {/* Premium Header Profile */}
        <div className="relative mb-14 rounded-[2rem] bg-white p-8 md:p-14 shadow-[0_8px_40px_rgb(0,0,0,0.03)] border border-zinc-100 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-zinc-200 via-zinc-300 to-zinc-100"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-8">
            <div className="space-y-5 max-w-2xl">
              {asset.category ? (
                <Badge variant="outline" className="rounded-full px-3 py-1 font-semibold text-[10px] uppercase tracking-[0.2em] text-zinc-500 border-zinc-200/80 bg-zinc-50/50">
                  {asset.category}
                </Badge>
              ) : null}
              <h1 className="text-4xl md:text-5xl font-light tracking-tight text-zinc-900 leading-tight">
                {asset.name}
              </h1>
              <p className="text-sm text-zinc-500 tracking-wide font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
                Registered {formatIsoDate(asset.created_at)}
              </p>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
               {/* Decorative icons or status */}
               <div className={`px-4 py-2.5 rounded-2xl text-[11px] font-semibold uppercase tracking-widest flex items-center gap-2.5 shadow-sm ${isWarrantyExpired ? 'bg-red-50 text-red-600 border border-red-100/50' : 'bg-emerald-50 text-emerald-600 border border-emerald-100/50'}`}>
                 <div className={`w-2 h-2 rounded-full shadow-inner ${isWarrantyExpired ? 'bg-red-500 shadow-red-500/50' : 'bg-emerald-500 shadow-emerald-500/50'}`}></div>
                 {isWarrantyExpired ? 'Warranty Expired' : 'Active Warranty'}
               </div>
            </div>
          </div>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:items-start">
          
          {/* Details / Edit Form */}
          <div className="space-y-6">
            <div className="flex items-center gap-4 border-b border-zinc-200/60 pb-4">
              <h2 className="text-lg font-medium tracking-tight text-zinc-900">Equipment Details</h2>
            </div>
            
            <form action={updateAction} className="grid gap-6">
              <input type="hidden" name="assetId" value={asset.id} />
              <input type="hidden" name="propertyId" value={activePropertyId} />

             <div className="p-1">
                <div className="grid gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="name" className="text-[11px] uppercase tracking-widest font-semibold text-zinc-500">Asset Name</Label>
                    <Input id="name" name="name" defaultValue={asset.name} required className="h-12 bg-white rounded-xl shadow-sm border-zinc-200/60 focus-visible:ring-primary text-[15px]" />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="category" className="text-[11px] uppercase tracking-widest font-semibold text-zinc-500">Category Tag</Label>
                    <Input id="category" name="category" defaultValue={asset.category ?? ""} className="h-12 bg-white rounded-xl shadow-sm border-zinc-200/60 focus-visible:ring-primary text-[15px]" />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2 pt-2">
                    <div className="grid gap-2">
                      <Label htmlFor="purchaseDate" className="text-[11px] uppercase tracking-widest font-semibold text-zinc-500">Date Acquired</Label>
                      <Input id="purchaseDate" name="purchaseDate" type="date" defaultValue={asset.purchase_date ?? ""} className="h-12 bg-white rounded-xl shadow-sm border-zinc-200/60 appearance-none text-zinc-700 font-medium" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="warrantyUntil" className="text-[11px] uppercase tracking-widest font-semibold text-zinc-500">Warranty Coverage</Label>
                      <Input id="warrantyUntil" name="warrantyUntil" type="date" defaultValue={asset.warranty_until ?? ""} className="h-12 bg-white rounded-xl shadow-sm border-zinc-200/60 appearance-none text-zinc-700 font-medium" />
                    </div>
                  </div>

                  <div className="pt-6">
                    <FormSubmitButton idleText="Update Record" pendingText="Saving changes..." className="w-full h-12 rounded-xl text-[15px] font-medium transition-all shadow-[0_4px_14px_0_rgba(255,105,0,0.2)] hover:shadow-[0_6px_20px_rgba(255,105,0,0.3)] hover:-translate-y-0.5" />
                  </div>
                </div>
             </div>
            </form>
          </div>

          {/* Photo Gallery Area */}
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 border-b border-zinc-200/60 pb-4">
              <h2 className="text-lg font-medium tracking-tight text-zinc-900">Visual Documentation</h2>
              <span className="bg-zinc-100 text-zinc-500 text-[10px] px-2.5 py-1 rounded-full uppercase tracking-widest font-bold shadow-inner">Reference</span>
            </div>
            <div className="">
              <AssetPhotosGallery
                assetId={asset.id}
                propertyId={activePropertyId}
                assetName={asset.name}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
INNER_EOF
