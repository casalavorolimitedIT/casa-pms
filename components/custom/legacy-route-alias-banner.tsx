"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

type LegacyRouteAliasBannerProps = {
  aliasPath: string;
  canonicalPath: string;
  title: string;
  description: string;
  delayMs?: number;
};

export function LegacyRouteAliasBanner({
  aliasPath,
  canonicalPath,
  title,
  description,
  delayMs = 1500,
}: LegacyRouteAliasBannerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [redirecting, setRedirecting] = useState(false);

  const targetPath = useMemo(() => {
    const raw = searchParams.toString();
    return raw ? `${canonicalPath}?${raw}` : canonicalPath;
  }, [canonicalPath, searchParams]);

  useEffect(() => {
    let active = true;

    const track = async () => {
      try {
        await fetch("/api/telemetry/alias-route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aliasPath,
            canonicalPath,
            query: searchParams.toString(),
            source: "legacy-route-banner",
          }),
          keepalive: true,
        });
      } catch {
        // Do not block redirect on telemetry failures.
      }
    };

    void track();

    const id = window.setTimeout(() => {
      if (!active) return;
      setRedirecting(true);
      router.replace(targetPath);
    }, delayMs);

    return () => {
      active = false;
      window.clearTimeout(id);
    };
  }, [aliasPath, canonicalPath, delayMs, router, searchParams, targetPath]);

  return (
    <div className="page-shell">
      <div className="page-container">
        <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Workflow Alias</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-amber-950">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-amber-900">{description}</p>
          <p className="mt-2 text-xs text-amber-700">
            You will be redirected to the canonical page in a moment.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button asChild size="sm" className="bg-amber-700 text-white hover:bg-amber-800">
              <Link href={targetPath}>Open Stay View now</Link>
            </Button>
            <span className="text-xs text-amber-700">{redirecting ? "Redirecting..." : "Preparing redirect..."}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
