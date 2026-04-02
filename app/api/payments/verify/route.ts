import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPayment } from "@/lib/payments/provider";

const verifySchema = z.object({
  currency: z.string().min(3).max(3),
  reference: z.string().min(3),
});

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const parsed = verifySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payment verification payload" },
      { status: 400 },
    );
  }

  const result = await verifyPayment(parsed.data);
  return NextResponse.json(result, { status: 200 });
}
