"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserAdd01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGuestQuick } from "@/app/dashboard/guests/actions/guest-actions";

interface QuickAddGuestDialogProps {
  organizationId: string;
  onGuestCreated: (guest: { id: string; label: string }) => void;
}

export function QuickAddGuestDialog({ organizationId, onGuestCreated }: QuickAddGuestDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set("organizationId", organizationId);

    startTransition(async () => {
      const result = await createGuestQuick(formData);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      const label = `${result.firstName} ${result.lastName}${result.email ? ` · ${result.email}` : ""}`;
      onGuestCreated({ id: result.id, label });
      setOpen(false);
      setError(null);
      // Reset the form on next tick so the dialog closes cleanly
      (event.target as HTMLFormElement).reset();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-1.5 text-xs font-medium text-[#ff6900] hover:bg-orange-50 hover:text-[#e55f00]"
          >
            <HugeiconsIcon icon={UserAdd01Icon} strokeWidth={2} className="size-3.5" />
            New guest
          </Button>
        }
      />

      <DialogContent className="max-w-sm rounded-xl border border-zinc-200 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-base">New walk-in guest</DialogTitle>
          <DialogDescription className="text-sm text-zinc-500">
            Add the guest&apos;s details. You can fill in the full profile later from the Guests page.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 pt-1">
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="qag-firstName" className="text-xs font-medium">
                First name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="qag-firstName"
                name="firstName"
                autoFocus
                required
                placeholder="Jane"
                className="h-10"
                disabled={isPending}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="qag-lastName" className="text-xs font-medium">
                Last name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="qag-lastName"
                name="lastName"
                required
                placeholder="Smith"
                className="h-10"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="qag-email" className="text-xs font-medium text-zinc-700">
              Email <span className="text-zinc-400 font-normal">(optional)</span>
            </Label>
            <Input
              id="qag-email"
              name="email"
              type="email"
              placeholder="jane@example.com"
              className="h-10"
              disabled={isPending}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="qag-phone" className="text-xs font-medium text-zinc-700">
              Phone <span className="text-zinc-400 font-normal">(optional)</span>
            </Label>
            <Input
              id="qag-phone"
              name="phone"
              type="tel"
              placeholder="+1 555 000 0000"
              className="h-10"
              disabled={isPending}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-zinc-200"
              disabled={isPending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-[#ff6900] text-white hover:bg-[#e55f00]"
              disabled={isPending}
            >
              {isPending ? "Adding…" : "Add & Select"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
