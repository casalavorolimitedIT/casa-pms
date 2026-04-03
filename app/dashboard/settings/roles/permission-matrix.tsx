"use client";

import { useTransition, useState } from "react";
import { toggleRolePermission } from "@/app/dashboard/settings/actions/settings-actions";
import {
  ALL_STAFF_ROLES,
  ROLE_COLORS,
  ROLE_DESCRIPTIONS,
  STAFF_ROLE_LABELS,
  type StaffRole,
} from "@/lib/staff/roles";
import type { PermissionEntry } from "@/app/dashboard/settings/actions/settings-actions";

// All known permission keys, grouped by module.
// This is the exhaustive master catalogue - any key can be assigned to any role.
export const PERMISSION_CATALOGUE: Record<string, string[]> = {
  Reservations: [
    "reservations.view",
    "reservations.create",
    "reservations.update",
    "reservations.cancel",
  ],
  "Check-in / Out": [
    "checkin.perform",
    "checkin.override",
    "checkout.perform",
  ],
  Guests: ["guests.view", "guests.create", "guests.update"],
  Rooms: ["rooms.view", "rooms.update_status", "rooms.manage"],
  Folios: [
    "folios.view",
    "folios.post_charge",
    "folios.process_payment",
    "folios.adjust",
  ],
  Housekeeping: [
    "housekeeping.view",
    "housekeeping.manage",
    "housekeeping.assign",
  ],
  "Night Audit": ["night_audit.run"],
  "Cash Shift": ["cash_shift.manage"],
  Keys: ["keys.manage"],
  Concierge: ["concierge.view", "concierge.manage"],
  Messaging: ["messaging.view", "messaging.send"],
  "Work Orders": ["work_orders.view", "work_orders.create", "work_orders.manage"],
  Tasks: ["tasks.view", "tasks.manage"],
  Minibar: ["minibar.manage"],
  Linen: ["linen.manage"],
  "Lost & Found": ["lost_found.view", "lost_found.manage"],
  Feedback: ["feedback.view"],
  "Pre-arrival": ["pre_arrival.view", "pre_arrival.manage"],
  DND: ["dnd.manage"],
  Rates: ["rates.view", "rates.manage"],
  Reports: ["reports.view", "reports.financial"],
  Staff: ["staff.view", "staff.manage", "staff.invite"],
  Settings: ["settings.view", "settings.manage"],
};

function friendlyPermission(key: string): string {
  const [, ...rest] = key.split(".");
  return rest
    .join(" ")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface PermissionMatrixProps {
  permissions: PermissionEntry[];
  canEdit: boolean;
}

export function PermissionMatrix({ permissions, canEdit }: PermissionMatrixProps) {
  const [activeRole, setActiveRole] = useState<StaffRole>(ALL_STAFF_ROLES[0]);
  // Local optimistic state: track toggled cells client-side while awaiting server
  const [localOverrides, setLocalOverrides] = useState<Map<string, boolean>>(new Map());
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Build a Set of "role:permissionKey" for fast lookup
  const enabledSet = new Set(permissions.map((p) => `${p.role}:${p.permissionKey}`));

  function isEnabled(role: StaffRole, permissionKey: string): boolean {
    const key = `${role}:${permissionKey}`;
    if (localOverrides.has(key)) return localOverrides.get(key)!;
    return enabledSet.has(key);
  }

  function toggle(role: StaffRole, permissionKey: string) {
    if (!canEdit || isPending) return;

    const currentlyEnabled = isEnabled(role, permissionKey);
    const nextState = !currentlyEnabled;
    const key = `${role}:${permissionKey}`;

    // Optimistic update
    setLocalOverrides((prev) => new Map(prev).set(key, nextState));
    setFeedback(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("role", role);
      formData.set("permissionKey", permissionKey);
      formData.set("enable", nextState ? "true" : "false");

      const result = await toggleRolePermission(formData);

      if (result?.error) {
        // Revert on error
        setLocalOverrides((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
        setFeedback({ type: "error", message: result.error });
      }
    });
  }

  const activePermCount = ALL_STAFF_ROLES.reduce((acc, role) => {
    const count = Object.values(PERMISSION_CATALOGUE)
      .flat()
      .filter((key) => isEnabled(role, key)).length;
    return { ...acc, [role]: count };
  }, {} as Record<StaffRole, number>);

  return (
    <div className="space-y-5">
      {/* Feedback banner */}
      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {!canEdit ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Read-only view. Only owners and general managers can edit role permissions.
        </div>
      ) : null}

      {/* Role selector tabs */}
      <div className="flex flex-wrap gap-2">
        {ALL_STAFF_ROLES.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => setActiveRole(role)}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
              activeRole === role
                ? `${ROLE_COLORS[role]} shadow-sm ring-1 ring-inset ring-current/20`
                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
            }`}
          >
            {STAFF_ROLE_LABELS[role]}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                activeRole === role ? "bg-black/10" : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {activePermCount[role]}
            </span>
          </button>
        ))}
      </div>

      {/* Active role detail */}
      {ALL_STAFF_ROLES.filter((r) => r === activeRole).map((role) => (
        <div key={role} className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          {/* Role header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[role]}`}>
                {STAFF_ROLE_LABELS[role]}
              </span>
              <span className="text-xs text-zinc-400">{activePermCount[role]} permissions</span>
              {isPending ? <span className="text-xs text-zinc-400">Saving…</span> : null}
            </div>
            <p className="text-xs text-zinc-500">{ROLE_DESCRIPTIONS[role]}</p>
          </div>

          {/* Permission groups — compact 3-column masonry */}
          <div className="columns-1 gap-0 sm:columns-2 xl:columns-3 divide-zinc-100 p-1">
            {Object.entries(PERMISSION_CATALOGUE).map(([group, keys]) => (
              <div key={group} className="break-inside-avoid p-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                  {group}
                </p>
                <div className="space-y-0.5">
                  {keys.map((permKey) => {
                    const enabled = isEnabled(role, permKey);
                    return (
                      <button
                        key={permKey}
                        type="button"
                        onClick={() => toggle(role, permKey)}
                        disabled={!canEdit || isPending}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors ${
                          enabled ? "text-emerald-700" : "text-zinc-400"
                        } ${canEdit && !isPending ? "cursor-pointer hover:bg-zinc-50" : "cursor-default"}`}
                        title={canEdit ? (enabled ? "Click to revoke" : "Click to grant") : undefined}
                      >
                        {/* Tiny toggle dot */}
                        <span
                          className={`inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                            enabled ? "bg-emerald-500" : "bg-zinc-200"
                          }`}
                        >
                          <span
                            className={`ml-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${
                              enabled ? "translate-x-3" : "translate-x-0"
                            }`}
                          />
                        </span>
                        <span className="font-medium">{friendlyPermission(permKey)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
