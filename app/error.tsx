"use client";

import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-6 py-24">
      {/* Background decoration */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-32 left-1/2 h-150 w-225 -translate-x-1/2 rounded-full bg-destructive/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-[#ff6900]/8 blur-3xl" />
        <div className="absolute left-0 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-[#fff1e6] blur-2xl" />
      </div>

      <div className="mx-auto flex max-w-md flex-col items-center gap-6 text-center">
        {/* Icon */}
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-destructive/20 bg-destructive/5 shadow-lg shadow-destructive/10">
          <span
            className="text-5xl"
            role="img"
            aria-label="Something went wrong"
          >
            🔥
          </span>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Something burned
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            An unexpected error occurred in the kitchen. Our chefs are already
            looking into it — try again in a moment.
          </p>
        </div>

        {/* Error details */}
        {error.message && (
          <div className="w-full rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-left">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-destructive/70">
              Error details
            </p>
            <p className="break-all font-mono text-xs text-destructive">
              {error.message}
            </p>
            {error.digest && (
              <p className="mt-1 text-xs text-muted-foreground">
                Digest: <span className="font-mono">{error.digest}</span>
              </p>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-lg text-muted-foreground/50">✦</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={reset}
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
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
            Try Again
          </button>
          <a
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-5 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
            Go to Dashboard
          </a>
        </div>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground/60">
          If this problem persists, please contact your administrator.
        </p>
      </div>
    </main>
  );
}
