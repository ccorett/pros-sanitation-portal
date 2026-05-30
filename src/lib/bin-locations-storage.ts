import seedLocations from "@/lib/bin-locations-seed.json";
import {
  isDueOrOverdue,
  type BinLocationRecord,
  type BinLocationState,
  type BinWorkflowStatus,
} from "@/lib/bin-locations-status";

const STATE_PREFIX = "pros-bin-locations-state:";

export type BinLocationView = BinLocationRecord & {
  workflowStatus: BinWorkflowStatus;
  cannotAccessReason?: string;
  issueType?: string;
  issueNotes?: string;
};

function getStateMap(): Record<string, BinLocationState> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(STATE_PREFIX);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, BinLocationState>;
  } catch {
    return {};
  }
}

function saveStateMap(state: Record<string, BinLocationState>) {
  localStorage.setItem(STATE_PREFIX, JSON.stringify(state));
}

export function getSeedLocations(): BinLocationRecord[] {
  return seedLocations as BinLocationRecord[];
}

export function mergeLocation(
  record: BinLocationRecord,
  state?: BinLocationState,
): BinLocationView {
  return {
    ...record,
    lastServiceDate: state?.lastServiceDate ?? record.lastServiceDate,
    active: state?.active ?? record.active,
    workflowStatus: state?.workflowStatus ?? "idle",
    cannotAccessReason: state?.cannotAccessReason,
    issueType: state?.issueType,
    issueNotes: state?.issueNotes,
  };
}

export function getBinLocations(): BinLocationView[] {
  const stateMap = getStateMap();
  return getSeedLocations().map((record) =>
    mergeLocation(record, stateMap[record.id]),
  );
}

export function getBinLocationById(id: string): BinLocationView | undefined {
  return getBinLocations().find((location) => location.id === id);
}

export function updateBinLocationState(id: string, patch: BinLocationState) {
  const stateMap = getStateMap();
  stateMap[id] = { ...stateMap[id], ...patch };
  saveStateMap(stateMap);
  return getBinLocations();
}

export function startBinJob(id: string) {
  return updateBinLocationState(id, { workflowStatus: "in_progress" });
}

export function completeBinService(id: string) {
  const today = new Date().toISOString().slice(0, 10);
  return updateBinLocationState(id, {
    lastServiceDate: today,
    workflowStatus: "idle",
    cannotAccessReason: undefined,
    issueType: undefined,
    issueNotes: undefined,
  });
}

export function markBinCannotAccess(id: string, reason: string) {
  return updateBinLocationState(id, {
    workflowStatus: "cannot_access",
    cannotAccessReason: reason,
  });
}

export function reportBinIssue(id: string, issueType: string, issueNotes?: string) {
  return updateBinLocationState(id, {
    workflowStatus: "issue_reported",
    issueType,
    issueNotes,
  });
}

export function getDueAndOverdueLocations(): BinLocationView[] {
  return getBinLocations().filter((location) => isDueOrOverdue(location));
}
