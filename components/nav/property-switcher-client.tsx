"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { appToast } from "@/components/custom/toast-ui";
import {
  ACTIVE_PROPERTY_COOKIE,
  type PropertySwitcherItem,
  createPropertyAction,
  updatePropertyAction,
} from "@/app/dashboard/actions/property-actions";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function setActivePropertyCookie(value: string) {
  document.cookie = `${ACTIVE_PROPERTY_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

interface PropertySwitcherClientProps {
  initialProperties: PropertySwitcherItem[];
  initialSelectedId: string;
}

export function PropertySwitcherClient({
  initialProperties,
  initialSelectedId,
}: PropertySwitcherClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [properties, setProperties] = useState<PropertySwitcherItem[]>(initialProperties);
  const [selectedId, setSelectedId] = useState(initialSelectedId);

  const [newName, setNewName] = useState("");
  const [newCurrencyCode, setNewCurrencyCode] = useState("USD");
  const [newTimezone, setNewTimezone] = useState("UTC");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCurrencyCode, setEditCurrencyCode] = useState("USD");
  const [editTimezone, setEditTimezone] = useState("UTC");

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === selectedId),
    [properties, selectedId],
  );

  const canManage = properties.length > 0 || !isPending;

  function handleSelectChange(nextId: string) {
    setSelectedId(nextId);
    setActivePropertyCookie(nextId);
    router.refresh();
  }

  function handleCreateProperty(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = newName.trim();
    if (!trimmedName) {
      appToast.error("Property name is required.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", trimmedName);
      formData.set("currencyCode", newCurrencyCode.trim().toUpperCase() || "USD");
      formData.set("timezone", newTimezone.trim() || "UTC");

      const result = await createPropertyAction(formData);
      if (result.error || !result.property) {
        appToast.error(result.error ?? "Unable to create property.");
        return;
      }

      setProperties((current) => [...current, result.property]);
      setSelectedId(result.property.id);
      setActivePropertyCookie(result.property.id);
      setNewName("");
      setNewCurrencyCode("USD");
      setNewTimezone("UTC");
      appToast.success("Property created.");
      router.refresh();
    });
  }

  function startEdit(property: PropertySwitcherItem) {
    setEditingId(property.id);
    setEditName(property.name);
    setEditCurrencyCode(property.currencyCode);
    setEditTimezone(property.timezone);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditCurrencyCode("USD");
    setEditTimezone("UTC");
  }

  function handleEditProperty(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;

    const trimmedName = editName.trim();
    if (!trimmedName) {
      appToast.error("Property name is required.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", editingId);
      formData.set("name", trimmedName);
      formData.set("currencyCode", editCurrencyCode.trim().toUpperCase() || "USD");
      formData.set("timezone", editTimezone.trim() || "UTC");

      const result = await updatePropertyAction(formData);
      if (result.error || !result.property) {
        appToast.error(result.error ?? "Unable to update property.");
        return;
      }

      setProperties((current) =>
        current.map((property) =>
          property.id === result.property!.id ? result.property! : property,
        ),
      );
      appToast.success("Property updated.");
      cancelEdit();
      router.refresh();
    });
  }

  return (
    <div className="flex w-full max-w-xl items-end gap-2">
      <div className="min-w-0 flex-1">
        <label className="mb-1 block text-xs text-muted-foreground">Active property</label>
        <Select value={selectedId} onValueChange={handleSelectChange}>
          <SelectTrigger disabled={properties.length === 0} className="h-9 w-full">
            <span className={selectedProperty ? "truncate text-sm" : "truncate text-sm text-muted-foreground"}>
              {selectedProperty?.name ?? "Add a property to get started"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <Dialog>
        <DialogTrigger render={<Button type="button" variant="outline" size="sm" disabled={!canManage} />}>
          Manage
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage properties</DialogTitle>
            <DialogDescription>
              Properties come from the database. You can create and edit properties here.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {properties.length === 0 ? (
              <p className="text-sm text-muted-foreground">No properties yet. Add your first property below.</p>
            ) : (
              properties.map((property) => (
                <div key={property.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{property.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {property.currencyCode} · {property.timezone}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(property)}
                    >
                      Edit
                    </Button>
                  </div>

                  {editingId === property.id && (
                    <form className="mt-3 grid gap-2" onSubmit={handleEditProperty}>
                      <Input
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        placeholder="Property name"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={editCurrencyCode}
                          onChange={(event) => setEditCurrencyCode(event.target.value)}
                          placeholder="Currency"
                          maxLength={3}
                        />
                        <Input
                          value={editTimezone}
                          onChange={(event) => setEditTimezone(event.target.value)}
                          placeholder="Timezone"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={isPending}>Save</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button>
                      </div>
                    </form>
                  )}
                </div>
              ))
            )}
          </div>

          <form className="space-y-2" onSubmit={handleCreateProperty}>
            <Label htmlFor="new-property-name">Add property</Label>
            <Input
              id="new-property-name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Property name"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={newCurrencyCode}
                onChange={(event) => setNewCurrencyCode(event.target.value)}
                placeholder="Currency"
                maxLength={3}
              />
              <Input
                value={newTimezone}
                onChange={(event) => setNewTimezone(event.target.value)}
                placeholder="Timezone"
              />
            </div>
            <Button type="submit" size="sm" disabled={isPending}>Add</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
