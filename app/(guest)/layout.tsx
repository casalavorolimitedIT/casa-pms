export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#faf9f7]">
      <div className="mx-auto max-w-xl px-4 py-10 sm:py-16">
        <div className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Casa PMS</p>
          <p className="mt-1 text-sm text-zinc-400">Powered by your hospitality team</p>
        </div>
        {children}
      </div>
    </main>
  );
}
