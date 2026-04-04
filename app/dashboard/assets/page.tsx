import Link from "next/link";
import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getActivePropertyId } from "@/lib/pms/property-context";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDateTimeField } from "@/components/ui/form-date-time-field";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { FormStatusToast } from "@/components/custom/form-status-toast";
import { createAsset } from "./actions";
import { formatIsoDate } from "@/lib/pms/formatting";
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
            <h1 className="page-title">Equipment & Assets</h1>
            <p className="text-sm tracking-wide bg-gradient-to-r from-zinc-500 to-zinc-400 bg-clip-text text-transparent max-w-xl">
              Registry and photographic documentation of property engineering and maintenance components.
            </p>
          </div>
          
          <Dialog>
            <DialogTrigger render={<Button className="shrink-0 shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98] rounded-full px-6 text-sm font-medium h-11" />}>
              <span className="mr-2 opacity-70">+</span> Register New Asset
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle className="text-2xl">Register Asset</DialogTitle>
                <p className="text-sm text-zinc-500 mt-1">Enter equipment details for the maintenance registry.</p>
              </DialogHeader>
              <form action={createAction} className="grid pt-4 gap-6">
                <input type="hidden" name="propertyId" value={activePropertyId} />

                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">Equipment Name</Label>
                  <Input id="name" name="name" placeholder="e.g. Minibar Fridge, AC Compressor" required className="h-12 rounded-xl bg-zinc-50 border-zinc-200/60" />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="assetCategory" className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">Category Tag <span className="opacity-50">(Optional)</span></Label>
                  <Input id="assetCategory" name="category" placeholder="e.g. HVAC, Kitchen, In-Room" className="h-12 rounded-xl bg-zinc-50 border-zinc-200/60" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="purchaseDate" className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">Date Acquired</Label>
                    <FormDateTimeField name="purchaseDate" className="bg-zinc-50" includeTime={false} placeholder="Select date" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="warrantyUntil" className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">Warranty Coverage</Label>
                    <FormDateTimeField name="warrantyUntil" className="bg-zinc-50" includeTime={false} placeholder="Select date" />
                  </div>
                </div>

                <FormSubmitButton idleText="Register Equipment" pendingText="Saving..." className="w-full mt-4 rounded-xl h-12 font-medium" />
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
              <Input id="q" name="q" defaultValue={query} placeholder="Search equipment by name or type..." className="h-12 w-full pl-11 rounded-xl bg-white border-zinc-200/50 shadow-sm transition-all focus:bg-white" />
            </div>
            <div className="sm:w-64">
              <select id="filterCategory" name="category" title="Filter by category" aria-label="Filter assets by category" defaultValue={category} className="h-12 w-full appearance-none rounded-xl border border-zinc-200/50 bg-white px-4 text-sm tracking-wide shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
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
                    <div className="h-12 w-12 rounded-2xl bg-zinc-50/80 border border-zinc-100/80 flex items-center justify-center text-zinc-400 shrink-0 group-hover:scale-105 group-hover:bg-primary group-hover:text-white transition-all duration-500 ease-out shadow-sm">
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
                    <span className="font-medium text-zinc-700">{asset.purchase_date ? formatIsoDate(asset.purchase_date) : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="uppercase tracking-widest font-medium opacity-60 text-[10px]">Warranty</span>
                    <span className={asset.warranty_until && new Date(asset.warranty_until) < new Date() ? "font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full" : "font-medium text-zinc-700"}>
                      {asset.warranty_until ? formatIsoDate(asset.warranty_until) : "—"}
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
