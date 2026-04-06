import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasPermission, type PmsRole } from "../../../lib/pms/authorization.ts";

// ─── hasPermission — exhaustive role/permission coverage ─────────────────────

describe("hasPermission", () => {
  // super_admin gets everything via the "*" wildcard
  it("super_admin has every named permission", () => {
    const namedPermissions = [
      "reservations.manage",
      "rooms.manage",
      "reports.view",
      "checkin.manage",
      "folios.manage",
      "housekeeping.manage",
      "rooms.status.update",
      "maintenance.manage",
      "workorders.manage",
      "fnb.manage",
      "inventory.manage",
      "spa.manage",
      "ar.manage",
      "concierge.manage",
      "guest-messages.manage",
      "some.future.permission",
    ];
    for (const perm of namedPermissions) {
      assert.ok(
        hasPermission("super_admin", perm),
        `super_admin should have '${perm}'`,
      );
    }
  });

  // property_manager
  it("property_manager has reservations.manage, rooms.manage, reports.view", () => {
    assert.ok(hasPermission("property_manager", "reservations.manage"));
    assert.ok(hasPermission("property_manager", "rooms.manage"));
    assert.ok(hasPermission("property_manager", "reports.view"));
  });

  it("property_manager does NOT have folios.manage or checkin.manage", () => {
    assert.equal(hasPermission("property_manager", "folios.manage"), false);
    assert.equal(hasPermission("property_manager", "checkin.manage"), false);
  });

  // front_desk
  it("front_desk has reservations.manage, checkin.manage, folios.manage", () => {
    assert.ok(hasPermission("front_desk", "reservations.manage"));
    assert.ok(hasPermission("front_desk", "checkin.manage"));
    assert.ok(hasPermission("front_desk", "folios.manage"));
  });

  it("front_desk does NOT have reports.view or maintenance.manage", () => {
    assert.equal(hasPermission("front_desk", "reports.view"), false);
    assert.equal(hasPermission("front_desk", "maintenance.manage"), false);
  });

  // housekeeping
  it("housekeeping has housekeeping.manage and rooms.status.update", () => {
    assert.ok(hasPermission("housekeeping", "housekeeping.manage"));
    assert.ok(hasPermission("housekeeping", "rooms.status.update"));
  });

  it("housekeeping does NOT have reservations.manage or folios.manage", () => {
    assert.equal(hasPermission("housekeeping", "reservations.manage"), false);
    assert.equal(hasPermission("housekeeping", "folios.manage"), false);
  });

  // engineering
  it("engineering has maintenance.manage and workorders.manage", () => {
    assert.ok(hasPermission("engineering", "maintenance.manage"));
    assert.ok(hasPermission("engineering", "workorders.manage"));
  });

  it("engineering does NOT have fnb.manage or spa.manage", () => {
    assert.equal(hasPermission("engineering", "fnb.manage"), false);
    assert.equal(hasPermission("engineering", "spa.manage"), false);
  });

  // fnb_manager
  it("fnb_manager has fnb.manage and inventory.manage", () => {
    assert.ok(hasPermission("fnb_manager", "fnb.manage"));
    assert.ok(hasPermission("fnb_manager", "inventory.manage"));
  });

  it("fnb_manager does NOT have spa.manage or reservations.manage", () => {
    assert.equal(hasPermission("fnb_manager", "spa.manage"), false);
    assert.equal(hasPermission("fnb_manager", "reservations.manage"), false);
  });

  // spa_manager
  it("spa_manager has spa.manage", () => {
    assert.ok(hasPermission("spa_manager", "spa.manage"));
  });

  it("spa_manager does NOT have fnb.manage or reports.view", () => {
    assert.equal(hasPermission("spa_manager", "fnb.manage"), false);
    assert.equal(hasPermission("spa_manager", "reports.view"), false);
  });

  // accountant
  it("accountant has reports.view, folios.manage, ar.manage", () => {
    assert.ok(hasPermission("accountant", "reports.view"));
    assert.ok(hasPermission("accountant", "folios.manage"));
    assert.ok(hasPermission("accountant", "ar.manage"));
  });

  it("accountant does NOT have reservations.manage or checkin.manage", () => {
    assert.equal(hasPermission("accountant", "reservations.manage"), false);
    assert.equal(hasPermission("accountant", "checkin.manage"), false);
  });

  // concierge
  it("concierge has concierge.manage and guest-messages.manage", () => {
    assert.ok(hasPermission("concierge", "concierge.manage"));
    assert.ok(hasPermission("concierge", "guest-messages.manage"));
  });

  it("concierge does NOT have folios.manage or reports.view", () => {
    assert.equal(hasPermission("concierge", "folios.manage"), false);
    assert.equal(hasPermission("concierge", "reports.view"), false);
  });

  // edge cases
  it("returns false for an unknown permission on a legitimate role", () => {
    const roles: PmsRole[] = [
      "front_desk",
      "housekeeping",
      "engineering",
      "fnb_manager",
      "spa_manager",
      "accountant",
      "concierge",
      "property_manager",
    ];
    for (const role of roles) {
      assert.equal(
        hasPermission(role, "nonexistent.permission"),
        false,
        `${role} should not have 'nonexistent.permission'`,
      );
    }
  });
});
