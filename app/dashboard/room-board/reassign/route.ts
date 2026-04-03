import { NextResponse } from "next/server";
import { reassignReservationRoom } from "../actions";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body || typeof body.reservationId !== "string" || typeof body.toRoomId !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await reassignReservationRoom({
    reservationId: body.reservationId,
    toRoomId: body.toRoomId,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
