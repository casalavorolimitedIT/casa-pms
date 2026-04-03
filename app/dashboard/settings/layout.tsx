import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-7xl">
        {/* Page header */}
        <div className="mb-8 space-y-1">
          <div className="inline-flex items-center rounded-full border border-[#ff6900]/20 bg-[#ff6900]/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#c75200]">
            Configuration
          </div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your organization, properties, and team preferences.</p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
          {/* Settings sidebar nav */}
          <aside className="w-full shrink-0 lg:w-56 xl:w-64">
            <div className="sticky top-24 rounded-2xl border border-zinc-200/80 bg-white/80 p-3 shadow-sm backdrop-blur-sm">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Settings
              </p>
              <SettingsNav />
            </div>
          </aside>

          {/* Settings content */}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
