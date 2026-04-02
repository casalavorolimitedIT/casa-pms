import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { initializePayment } from "@/lib/payments/provider";

const initializeSchema = z.object({
  amountMinor: z.number().int().positive(),
  currency: z.string().min(3).max(3),
  email: z.string().email(),
  callbackUrl: z.string().url(),
  reference: z.string().min(8),
});

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const parsed = initializeSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payment initialization payload" },
      { status: 400 },
    );
  }

  const result = await initializePayment(parsed.data);
  return NextResponse.json(result, { status: 200 });
}
