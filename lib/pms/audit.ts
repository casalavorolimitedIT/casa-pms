export interface NightAuditSummary {
  postedRoomChargesMinor: number;
  discrepanciesCount: number;
}

// M00 scaffold: implement real close-of-day logic in M03.
export async function runNightAudit(): Promise<NightAuditSummary> {
  return {
    postedRoomChargesMinor: 0,
    discrepanciesCount: 0,
  };
}
