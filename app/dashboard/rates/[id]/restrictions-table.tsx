"use client";

import { useMemo, useState } from "react";
import { RestrictionForm } from "@/components/rates/restriction-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrencyMinor } from "@/lib/pms/formatting";

type RoomTypeOption = { id: string; name: string };

type RestrictionRow = {
  id: string;
  room_type_id: string;
  date_from: string;
  date_to: string;
  rate_minor: number;
  min_stay: number | null;
  max_stay: number | null;
  closed_to_arrival: boolean;
  closed_to_departure: boolean;
};

type RestrictionsTableProps = {
  ratePlanId: string;
  currencyCode: string;
  roomTypes: RoomTypeOption[];
  restrictions: RestrictionRow[];
  onCreate: (formData: FormData) => void | Promise<void>;
  onUpdate: (formData: FormData) => void | Promise<void>;
};

export function RestrictionsTable({
  ratePlanId,
  currencyCode,
  roomTypes,
  restrictions,
  onCreate,
  onUpdate,
}: RestrictionsTableProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const roomTypeMap = useMemo(() => {
    return new Map(roomTypes.map((roomType) => [roomType.id, roomType.name]));
  }, [roomTypes]);

  const editingRestriction = restrictions.find((row) => row.id === editingId) ?? null;

  return (
    <>
      <div className="flex items-center justify-between pb-5">
        <p className="text-sm text-zinc-500">
          {restrictions.length} restriction{restrictions.length !== 1 ? "s" : ""}
        </p>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          Add Restriction
        </Button>
      </div>

      {restrictions.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 p-6 text-center text-sm text-zinc-500">
          No restrictions added yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-zinc-600">Room Type</th>
                <th className="px-3 py-2 text-left font-medium text-zinc-600">Rate</th>
                <th className="px-3 py-2 text-left font-medium text-zinc-600">From</th>
                <th className="px-3 py-2 text-left font-medium text-zinc-600">To</th>
                <th className="px-3 py-2 text-left font-medium text-zinc-600">Min Stay</th>
                <th className="px-3 py-2 text-left font-medium text-zinc-600">Max Stay</th>
                <th className="px-3 py-2 text-left font-medium text-zinc-600">CTA</th>
                <th className="px-3 py-2 text-left font-medium text-zinc-600">CTD</th>
                <th className="px-3 py-2 text-right font-medium text-zinc-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white">
              {restrictions.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2">{roomTypeMap.get(row.room_type_id) ?? "Room Type"}</td>
                  <td className="px-3 py-2 font-medium text-zinc-900">{formatCurrencyMinor(row.rate_minor, currencyCode)}</td>
                  <td className="px-3 py-2">{new Date(row.date_from).toLocaleDateString()}</td>
                  <td className="px-3 py-2">{new Date(row.date_to).toLocaleDateString()}</td>
                  <td className="px-3 py-2">{row.min_stay ?? "-"}</td>
                  <td className="px-3 py-2">{row.max_stay ?? "-"}</td>
                  <td className="px-3 py-2">{row.closed_to_arrival ? "Yes" : "No"}</td>
                  <td className="px-3 py-2">{row.closed_to_departure ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 text-right">
                    <Button type="button" size="sm" variant="outline" onClick={() => setEditingId(row.id)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={createOpen}  onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl!">
          <DialogHeader>
            <DialogTitle>Add Restriction</DialogTitle>
            <DialogDescription>
              Create a seasonal override for a room type in this rate plan.
            </DialogDescription>
          </DialogHeader>
          <RestrictionForm
            ratePlanId={ratePlanId}
            roomTypes={roomTypes}
            action={onCreate}
            idleText="Add Restriction"
            pendingText="Saving..."
            submitSize="lg"
            submitClassName="w-full text-center"
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingRestriction)}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
      >
        <DialogContent  className="max-w-xl!">
          <DialogHeader>
            <DialogTitle>Edit Restriction</DialogTitle>
            <DialogDescription>
              Update dates, rate, stay rules, and arrival/departure controls.
            </DialogDescription>
          </DialogHeader>

          {editingRestriction ? (
            <RestrictionForm
              ratePlanId={ratePlanId}
              restrictionId={editingRestriction.id}
              roomTypes={roomTypes}
              action={onUpdate}
              initialValues={{
                roomTypeId: editingRestriction.room_type_id,
                dateFrom: editingRestriction.date_from,
                dateTo: editingRestriction.date_to,
                rateMinor: editingRestriction.rate_minor,
                minStay: editingRestriction.min_stay,
                maxStay: editingRestriction.max_stay,
                closedToArrival: editingRestriction.closed_to_arrival,
                closedToDeparture: editingRestriction.closed_to_departure,
              }}
              idleText="Save changes"
              pendingText="Saving..."
              submitSize="sm"
              submitClassName="w-full text-center"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
