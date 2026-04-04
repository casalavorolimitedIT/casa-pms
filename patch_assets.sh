cat << 'INNER_EOF' > app/dashboard/assets/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { createAsset } from "./actions";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AssetsPageProps = {
  searchParams?: Promise<{ ok?: string | string[]; error?: string | string[]; q?: string | string[]; category?: string | string[] }>;
};

function readSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AssetsPage({ searchParams }: AssetsPageProps) {
  await redirectIfNotAuthenticated();
  const activePropertyId = await getActivePropertyId();
  const params = (await searchParams) ?? {};
  const ok = readSearchValue(params.ok);
  const error = readSearchValue(params.error);
  const query = readSearchValue(params.q)?.trim() ?? "";
  const category = readSearchValue(params.category)?.trim() ?? "all";

  if (!activePropertyId) {
    return <div className="p-6 text-sm text-muted-foreground">Set DEMO_PROPERTY_ID in .env.local or select an active property from the header.</div>;
  }

  const createAction = async (formData: FormData) => {
    "use server";
    const result = await createAsset(formData);
    if (result?.success) {
      redirect(`/dashboard/assets?ok=${encodeURIComponent("Asset created.")}`);
    }
    redirect(`/dashboard/assets?error=${encodeURIComponent(result?.error ?? "Unable to create asset.")}`);
  };

  const supabase = await createClient();
  let assetsQuery = supabase
    .from("assets")
    .select("id, name, category, purchase_date, warranty_until, created_at")
    .eq("property_id", activePropertyId);

  if (query) {
    assetsQuery = assetsQuery.or(`name.ilike.%${query}%,category.ilike.%${query}%`);
  }

  if (category && category !== "all") {
    assetsQuery = assetsQuery.eq("category", category);
  }

  const { data: assets } = await assetsQuery.order("created_at", { ascending: false });
  const categories = Array.from(new Set((assets ?? []).map((asset) => asset.category).filter(Boolean))) as string[];

  return (
    <div className="page-shell space-y-8 animate-in fade-in-50 duration-500">
      <div className="page-container max-w-7xl">
        <FormStatusToast ok={ok} error={error} />

        {/* Premium Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-10">
          <div className="space-y-2">
            <h1 className="text-4xl font-light tracking-tight text-zinc-900 leading-tight">Equipment & Assets</h1>
            <p className="text-sm tracking-wide bg-gradient-to-r from-zinc-500 to-zinc-400 bg-clip-text text-transparent max-w-xl">
              Registry and photographic documentation of property engineering and maintenance components.
            </p>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button className="shrink-0 shadow-xl shadow-zinc-200/50 hover:shadow-zinc-300/50 transition-all active:scale-[0.98] bg-zinc-900 hover:bg-zinc-800 text-white rounded-full px-6 text-sm font-medium h-11">
                <span className="mr-2 opacity-70">+</span> Register New Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-light">Register Asset</DialogTitle>
                <p className="text-sm text-zinc-500 mt-1">Enter equipment details for the maintenance registry.</p>
              </DialogHeader>
              <form action={createAction} className="grid pt-4 gap-6">
                <input type="hidden" name="propertyId" value={activePropertyId} />

                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">Equipment Name</Label>
                  <Input id="name" name="name" placeholder="e.g. Minibar Fridge, AC Compressor" required className="h-12 rounded-xl bg-zinc-50 border-zinc-200/60 focus-visible:ring-zinc-900" />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="assetCategory" className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">Category Tag <span className="opacity-50">(Optional)</span></Label>
                  <Input id="assetCategory" name="category" placeholder="e.g. HVAC, Kitchen, In-Room" className="h-12 rounded-xl bg-zinc-50 border-zinc-200/60 focus-visible:ring-zinc-900" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="purchaseDate" className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">Date Acquired</Label>
                    <Input id="purchaseDate" name="purchaseDate" type="date" className="h-12 rounded-xl bg-zinc-50 border-zinc-200/60 text-zinc-700 block appearance-none" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="warrantyUntil" className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">Warranty Coverage</Label>
                    <Input id="warrantyUntil" name="warrantyUntil" type="date" className="h-12 rounded-xl bg-zinc-50 border-zinc-200/60 text-zinc-700 block appearance-none" />
                  </div>
                </div>

                <FormSubmitButton idleText="Register Equipment" pendingText="Saving..." className="w-full mt-4 rounded-xl h-12 bg-zinc-900 text-zinc-50 font-medium hover:bg-zinc-800" />
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Premium Filter Bar */}
        <div className="backdrop-blur-2xl bg-white/50 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-4 sticky top-6 z-20 mb-8">
          <form className="flex flex-col sm:flex-row sm:items-center gap-3" method="get">
            <div className="flex-1 relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-600 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
              </span>
              <Input id="q" name="q" defaultValue={query} placeholder="Search equipment by name or type..." className="h-12 w-full pl-11 rounded-xl bg-white border-zinc-200/50 shadow-sm transition-all focus-visible:ring-zinc-900 focus:bg-white" />
            </div>
            <div className="sm:w-64">
              <select id="filterCategory" name="category" title="Filter by category" aria-label="Filter assets by category" defaultValue={category} className="h-12 w-full appearance-none rounded-xl border border-zinc-200/50 bg-white px-4 text-sm tracking-wide shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent">
                <option value="all">All Categories</option>
                {categories.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button type="submit" variant="secondary" className="h-12 px-6 rounded-xl font-medium tracking-wide bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-0">Find Asset</Button>
              {query || (category && category !== 'all') ? (
                <Button asChild type="button" variant="ghost" className="h-12 px-4 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100">
                  <Link href="/dashboard/assets">Clear</Link>
                </Button>
              ) : null}
            </div>
          </form>
        </div>

        {/* Assets Grid */}
        {!assets || assets.length === 0 ? (
          <div className="py-32 text-center flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
            <div className="h-20 w-20 mb-6 rounded-3xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-300 shadow-inner">
             <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><polyline points="14 2 14 8 20 8"/><path d="m3 15 4-4 4 4"/><path d="M7 11v11"/></svg>
            </div>
            <h3 className="text-xl font-light tracking-tight text-zinc-900">Registry Empty</h3>
            <p className="mt-2 text-sm text-zinc-500 max-w-sm mx-auto leading-relaxed">No equipment found matching these filters. Add your first asset to the maintenance registry to begin tracking.</p>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {assets.map((asset, i) => (
              <Link 
                key={asset.id} 
                href={`/dashboard/assets/${asset.id}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-white border border-zinc-100 p-6 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] hover:border-zinc-200/60 transition-all duration-500 hover:-translate-y-1.5 will-change-transform"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {/* Decorative blob */}
                <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br from-zinc-50 to-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl"></div>

                <div className="relative z-10 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-zinc-50/80 border border-zinc-100/80 flex items-center justify-center text-zinc-400 shrink-0 group-hover:scale-105 group-hover:bg-zinc-900 group-hover:text-white transition-all duration-500 ease-out shadow-sm">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                    </div>
                    {asset.category ? (
                      <Badge variant="secondary" className="px-2.5 py-1 shadow-none border-transparent bg-zinc-50 text-zinc-500 group-hover:bg-zinc-100 group-hover:text-zinc-700 font-medium uppercase tracking-[0.15em] text-[9px] transition-colors rounded-full">
                        {asset.category}
                      </Badge>
                    ) : null}
                  </div>
                  <div>
                    <h3 className="font-medium text-[17px] leading-snug text-zinc-900 group-hover:text-zinc-900 transition-colors line-clamp-2">
                      {asset.name}
                    </h3>
                  </div>
                </div>

                <div className="relative z-10 mt-10 pt-5 border-t border-zinc-100 flex flex-col gap-2.5 text-xs text-zinc-500">
                  <div className="flex items-center justify-between">
                    <span className="uppercase tracking-widest font-medium opacity-60 text-[10px]">Purchased</span>
                    <span className="font-medium text-zinc-700">{asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'}) : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="uppercase tracking-widest font-medium opacity-60 text-[10px]">Warranty</span>
                    <span className={asset.warranty_until && new Date(asset.warranty_until) < new Date() ? "font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full" : "font-medium text-zinc-700"}>
                      {asset.warranty_until ? new Date(asset.warranty_until).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'}) : "—"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
INNER_EOF

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
                Registered {new Date(asset.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric'})}
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
                    <Input id="name" name="name" defaultValue={asset.name} required className="h-12 bg-white rounded-xl shadow-sm border-zinc-200/60 focus-visible:ring-zinc-900 text-[15px]" />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="category" className="text-[11px] uppercase tracking-widest font-semibold text-zinc-500">Category Tag</Label>
                    <Input id="category" name="category" defaultValue={asset.category ?? ""} className="h-12 bg-white rounded-xl shadow-sm border-zinc-200/60 focus-visible:ring-zinc-900 text-[15px]" />
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
                    <FormSubmitButton idleText="Update Record" pendingText="Saving changes..." className="w-full h-12 rounded-xl bg-zinc-900 text-white text-[15px] font-medium hover:bg-zinc-800 transition-all shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:-translate-y-0.5" />
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
