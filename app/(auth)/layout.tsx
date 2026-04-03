import { redirectIfAuthenticated } from "@/lib/redirect/redirectIfAuthenticated";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectIfAuthenticated();
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_15%,rgba(255,105,0,0.16),transparent_35%),radial-gradient(circle_at_92%_20%,rgba(255,105,0,0.1),transparent_30%)]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden rounded-3xl border border-orange-100/80 bg-white/70 p-8 shadow-sm backdrop-blur-sm lg:block">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Casa PMS</p>
          <h1 data-display="true" className="mt-3 text-5xl font-semibold leading-[1.05] text-zinc-900">
            Hospitality operations that feel effortless.
          </h1>
          <p className="mt-4 max-w-xl text-sm text-zinc-600">
            Manage front desk, rooms, billing, and guest experience in a single unified workspace built for fast-moving hotel teams.
          </p>
        </section>

        <section className="mx-auto w-full max-w-md">
          {children}
        </section>
      </div>
    </main>
  );
}
