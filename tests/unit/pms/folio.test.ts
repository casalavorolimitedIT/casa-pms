import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateFolioBalance, type FolioBalanceInput } from "../../../lib/pms/folio.ts";

// ─── calculateFolioBalance ────────────────────────────────────────────────────

describe("calculateFolioBalance", () => {
  it("returns 0 when charges and payments are both zero", () => {
    const input: FolioBalanceInput = { chargeTotalMinor: 0, paymentTotalMinor: 0 };
    assert.equal(calculateFolioBalance(input), 0);
  });

  it("returns the full charge amount when there are no payments", () => {
    const input: FolioBalanceInput = { chargeTotalMinor: 15000, paymentTotalMinor: 0 };
    assert.equal(calculateFolioBalance(input), 15000);
  });

  it("returns 0 when payments exactly cover charges (fully settled folio)", () => {
    const input: FolioBalanceInput = { chargeTotalMinor: 15000, paymentTotalMinor: 15000 };
    assert.equal(calculateFolioBalance(input), 0);
  });

  it("returns a positive balance when partially paid", () => {
    const input: FolioBalanceInput = { chargeTotalMinor: 20000, paymentTotalMinor: 8000 };
    assert.equal(calculateFolioBalance(input), 12000);
  });

  it("returns a negative balance (credit) when overpaid", () => {
    // Over-payment scenario: guest pre-paid more than total charges.
    const input: FolioBalanceInput = { chargeTotalMinor: 10000, paymentTotalMinor: 12000 };
    assert.equal(calculateFolioBalance(input), -2000);
  });

  it("handles large amounts correctly (no floating-point accumulation)", () => {
    // 10 nights at $599.99/night → 5999900 minor units; payment exact
    const input: FolioBalanceInput = { chargeTotalMinor: 5999900, paymentTotalMinor: 5999900 };
    assert.equal(calculateFolioBalance(input), 0);
  });

  it("is associative with successive partial payments", () => {
    // Three partial payments totalling 30000
    const totalCharges = 30000;
    const p1 = 10000;
    const p2 = 15000;
    const p3 = 5000;
    const totalPayments = p1 + p2 + p3;
    const input: FolioBalanceInput = { chargeTotalMinor: totalCharges, paymentTotalMinor: totalPayments };
    assert.equal(calculateFolioBalance(input), 0);
  });
});
