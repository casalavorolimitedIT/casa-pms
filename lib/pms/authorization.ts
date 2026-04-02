export type PmsRole =
  | "super_admin"
  | "property_manager"
  | "front_desk"
  | "housekeeping"
  | "engineering"
  | "fnb_manager"
  | "spa_manager"
  | "accountant"
  | "concierge";

const rolePermissions: Record<PmsRole, string[]> = {
  super_admin: ["*"],
  property_manager: ["reservations.manage", "rooms.manage", "reports.view"],
  front_desk: ["reservations.manage", "checkin.manage", "folios.manage"],
  housekeeping: ["housekeeping.manage", "rooms.status.update"],
  engineering: ["maintenance.manage", "workorders.manage"],
  fnb_manager: ["fnb.manage", "inventory.manage"],
  spa_manager: ["spa.manage"],
  accountant: ["reports.view", "folios.manage", "ar.manage"],
  concierge: ["concierge.manage", "guest-messages.manage"],
};

export function hasPermission(role: PmsRole, permission: string): boolean {
  const permissions = rolePermissions[role] ?? [];
  return permissions.includes("*") || permissions.includes(permission);
}
