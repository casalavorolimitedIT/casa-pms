export interface FolioBalanceInput {
  chargeTotalMinor: number;
  paymentTotalMinor: number;
}

export function calculateFolioBalance(input: FolioBalanceInput): number {
  return input.chargeTotalMinor - input.paymentTotalMinor;
}
