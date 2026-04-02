"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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

type PropertyOption = {
  id: string;
  name: string;
  isActive: boolean;
};

const STORAGE_KEY = "casa-pms-properties-v1";
const ACTIVE_PROPERTY_COOKIE = "active_property_id";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function sanitizeProperties(input: unknown): PropertyOption[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter((item): item is PropertyOption => {
      return (
        typeof item === "object" &&
        item !== null &&
        typeof (item as { id?: unknown }).id === "string" &&
        typeof (item as { name?: unknown }).name === "string" &&
        typeof (item as { isActive?: unknown }).isActive === "boolean"
      );
    })
    .map((item) => ({
      id: item.id.trim(),
      name: item.name.trim(),
      isActive: item.isActive,
    }))
    .filter((item) => item.id.length > 0 && item.name.length > 0);
}

function readCookie(name: string) {
  const encodedName = `${name}=`;
  const cookieChunk = document.cookie
    .split(";")
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(encodedName));

  if (!cookieChunk) return "";
  return decodeURIComponent(cookieChunk.slice(encodedName.length));
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

function buildPropertyId() {
  const randomPart = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return `property-${randomPart}`;
}

function loadInitialProperties() {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as unknown;
      const sanitized = sanitizeProperties(parsed);
      if (sanitized.length > 0) {
        return sanitized;
      }
    } catch {
      // Ignore malformed localStorage data and fall back to env bootstrap.
    }
  }

  const envPropertyId = (process.env.NEXT_PUBLIC_DEMO_PROPERTY_ID ?? "").trim();
  if (!envPropertyId) {
    return [] as PropertyOption[];
  }

  return [
    {
      id: envPropertyId,
      name: "Demo Property",
      isActive: true,
    },
  ];
}

export function PropertySwitcher() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [newPropertyName, setNewPropertyName] = useState("");

  const activeProperties = useMemo(
    () => properties.filter((property) => property.isActive),
    [properties],
  );

  useEffect(() => {
    const initialProperties = loadInitialProperties();
    const cookiePropertyId = readCookie(ACTIVE_PROPERTY_COOKIE);
    const selectedFromCookie = initialProperties.find(
      (property) => property.id === cookiePropertyId && property.isActive,
    )?.id;
    const firstActiveId = initialProperties.find((property) => property.isActive)?.id ?? "";

    setProperties(initialProperties);
    setSelectedId(selectedFromCookie ?? firstActiveId);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
  }, [isReady, properties]);

  useEffect(() => {
    if (!isReady) return;

    if (selectedId) {
      setCookie(ACTIVE_PROPERTY_COOKIE, selectedId);
    } else {
      clearCookie(ACTIVE_PROPERTY_COOKIE);
    }

    router.refresh();
  }, [isReady, selectedId, router]);

  function handleAddProperty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newPropertyName.trim();
    if (!name) return;

    const nextProperty: PropertyOption = {
      id: buildPropertyId(),
      name,
      isActive: true,
    };

    setProperties((current) => [...current, nextProperty]);
    setSelectedId(nextProperty.id);
    setNewPropertyName("");
  }

  function toggleProperty(id: string) {
    setProperties((current) => {
      const next = current.map((property) =>
        property.id === id
          ? { ...property, isActive: !property.isActive }
          : property,
      );

      const selectedStillActive = next.some(
        (property) => property.id === selectedId && property.isActive,
      );

      if (!selectedStillActive) {
        const replacement = next.find((property) => property.isActive)?.id ?? "";
        setSelectedId(replacement);
      }

      return next;
    });
  }

  return (
    <div className="flex w-full max-w-xl items-end gap-2">
      <div className="min-w-0 flex-1">
        <label className="mb-1 block text-xs text-muted-foreground">Active property</label>
        <select
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          disabled={!isReady || activeProperties.length === 0}
          aria-label="Select active property"
          className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {activeProperties.length === 0 ? (
            <option value="">Add a property to get started</option>
          ) : (
            activeProperties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))
          )}
        </select>
      </div>

      <Dialog>
        <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
          Manage
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage properties</DialogTitle>
            <DialogDescription>
              Add properties and mark each one active or inactive.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {properties.length === 0 ? (
              <p className="text-sm text-muted-foreground">No properties yet. Add your first property below.</p>
            ) : (
              properties.map((property) => (
                <div key={property.id} className="flex items-center justify-between rounded-md border p-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{property.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{property.id}</p>
                  </div>
                  <Button
                    type="button"
                    variant={property.isActive ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => toggleProperty(property.id)}
                  >
                    {property.isActive ? "Active" : "Inactive"}
                  </Button>
                </div>
              ))
            )}
          </div>

          <form className="space-y-2" onSubmit={handleAddProperty}>
            <Label htmlFor="new-property-name">Add property</Label>
            <div className="flex gap-2">
              <Input
                id="new-property-name"
                value={newPropertyName}
                onChange={(event) => setNewPropertyName(event.target.value)}
                placeholder="Property name"
              />
              <Button type="submit" size="sm">Add</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
