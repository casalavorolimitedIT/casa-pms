import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-6 py-24">
      {/* Background decoration */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-32 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[#ff6900]/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-[#ff6900]/8 blur-3xl" />
        <div className="absolute left-0 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-[#fff1e6] blur-2xl" />
      </div>

      <div className="mx-auto flex max-w-md flex-col items-center gap-6 text-center">
        {/* Icon */}
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-[#ff6900]/20 bg-[#fff1e6] shadow-lg shadow-[#ff6900]/10">
          <span className="text-5xl" role="img" aria-label="Empty pot">
            🍳
          </span>
        </div>

        {/* Error code */}
        <div className="relative">
          <span className="select-none text-[9rem] font-black leading-none tracking-tighter text-[#ff6900]/10">
            404
          </span>
          <p className="absolute inset-0 flex items-center justify-center text-4xl font-bold tracking-tight text-foreground">
            404
          </p>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dish not found
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Looks like this page flew off the menu. It may have been moved,
            renamed, or perhaps it was never on the recipe card to begin with.
          </p>
        </div>

        {/* Divider with food icon */}
        <div className="flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-lg text-muted-foreground/50">✦</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#ff6900] px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#e55f00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900] focus-visible:ring-offset-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Back to Dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-5 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Go Home
          </Link>
        </div>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground/60">
          If you believe this is a mistake, please contact your administrator.
        </p>
      </div>
    </main>
  );
}
