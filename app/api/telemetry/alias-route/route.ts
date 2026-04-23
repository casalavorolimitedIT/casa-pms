import { NextResponse } from "next/server";

type AliasTelemetryPayload = {
  aliasPath?: string;
  canonicalPath?: string;
  query?: string;
  source?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AliasTelemetryPayload;

    console.info("[alias-route-hit]", {
      aliasPath: body.aliasPath ?? "unknown",
      canonicalPath: body.canonicalPath ?? "unknown",
      query: body.query ?? "",
      source: body.source ?? "unknown",
      at: new Date().toISOString(),
    });
  } catch {
    // Swallow parse/log errors to avoid impacting UX.
  }

  return NextResponse.json({ ok: true });
}
