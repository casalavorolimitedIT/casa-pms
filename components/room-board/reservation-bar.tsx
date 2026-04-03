"use client";

interface ReservationBarProps {
  reservation: {
    id: string;
    status: string;
    checkIn: string;
    checkOut: string;
    guestName: string;
    roomNumber: string | null;
  };
  onSelect: () => void;
}

const toneByStatus: Record<string, string> = {
  tentative: "border-zinc-300 bg-zinc-100 text-zinc-800",
  confirmed: "border-blue-200 bg-blue-50 text-blue-800",
  checked_in: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

export function ReservationBar({ reservation, onSelect }: ReservationBarProps) {
  const tone = toneByStatus[reservation.status] ?? toneByStatus.tentative;

  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("application/reservation-id", reservation.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      onClick={onSelect}
      className={`w-full rounded-md border px-2 py-1.5 text-left transition-colors hover:opacity-90 ${tone}`}
      title={`${reservation.guestName} (${reservation.status.replace("_", " ")})`}
    >
      <p className="truncate text-xs font-medium">{reservation.guestName}</p>
      <p className="truncate text-[11px] opacity-80">
        {new Date(reservation.checkIn).toLocaleDateString()} - {new Date(reservation.checkOut).toLocaleDateString()}
      </p>
    </button>
  );
}
