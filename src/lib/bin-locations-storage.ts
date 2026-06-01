import seedLocations from "@/lib/bin-locations-seed.json";
import {
  clampBinCount,
  computeNextServiceDate,
  isDueOrOverdue,
  needsAdminAttention,
  type BinLocationRecord,
  type BinLocationState,
  type BinTechnicianServiceStatus,
  type BinWorkflowStatus,
} from "@/lib/bin-locations-status";

const STATE_PREFIX = "pros-bin-locations-state:";

export type BinLocationView = BinLocationRecord & {
  workflowStatus: BinWorkflowStatus;
  serviceStatus?: BinTechnicianServiceStatus;
  cannotAccessReason?: string;
  issueType?: string;
  issueNotes?: string;
  serviceNotes?: string;
  regularBinsServiced?: number;
  newBinsServiced?: number;
  linersUsed?: number;
  clientSignatureName?: string;
  completedAt?: string;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
  displayNotes: string;
};

export type TechnicianServiceUpdateInput = {
  lastServiceDate: string;
  regularBinsServiced: number;
  newBinsServiced: number;
  linersUsed: number;
  serviceStatus: BinTechnicianServiceStatus;
  notes: string;
  issueNotes?: string;
  cannotAccessReason?: string;
  clientSignatureName?: string;
  updatedBy: string;
};

export type BinAttentionItem = {
  id: string;
  locationName: string;
  serviceStatus: BinTechnicianServiceStatus;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
  notes: string;
  issueOrAccessReason: string;
  lastServiceDate: string;
  nextServiceDate: string;
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
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pros-bin-locations-updated"));
  }
}

export function getSeedLocations(): BinLocationRecord[] {
  return seedLocations as BinLocationRecord[];
}

export function mergeLocation(
  record: BinLocationRecord,
  state?: BinLocationState,
): BinLocationView {
  const serviceNotes = state?.serviceNotes;
  return {
    ...record,
    lastServiceDate: state?.lastServiceDate ?? record.lastServiceDate,
    active: state?.active ?? record.active,
    workflowStatus: state?.workflowStatus ?? "idle",
    serviceStatus: state?.serviceStatus,
    cannotAccessReason: state?.cannotAccessReason,
    issueType: state?.issueType,
    issueNotes: state?.issueNotes,
    serviceNotes,
    regularBinsServiced: state?.regularBinsServiced,
    newBinsServiced: state?.newBinsServiced,
    linersUsed: state?.linersUsed,
    clientSignatureName: state?.clientSignatureName,
    completedAt: state?.completedAt,
    lastUpdatedBy: state?.lastUpdatedBy,
    lastUpdatedAt: state?.lastUpdatedAt,
    displayNotes: serviceNotes ?? record.notes,
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

export function applyTechnicianServiceUpdate(
  id: string,
  input: TechnicianServiceUpdateInput,
) {
  const location = getBinLocationById(id);
  if (!location) {
    throw new Error("Location not found.");
  }

  const regularBinsServiced = clampBinCount(
    input.regularBinsServiced,
    location.regularBins,
  );
  const newBinsServiced = clampBinCount(input.newBinsServiced, location.newBins);
  const maxLiners = location.regularBins + location.newBins;
  const linersUsed = clampBinCount(input.linersUsed, maxLiners);

  if (
    input.regularBinsServiced > location.regularBins ||
    input.newBinsServiced > location.newBins
  ) {
    throw new Error(
      `Bins serviced cannot exceed expected counts (max ${location.regularBins} regular, ${location.newBins} new).`,
    );
  }

  if (input.linersUsed > maxLiners) {
    throw new Error(`Liners used cannot exceed ${maxLiners} for this location.`);
  }

  const timestamp = new Date().toISOString();
  const base: BinLocationState = {
    serviceNotes: input.notes.trim(),
    regularBinsServiced,
    newBinsServiced,
    linersUsed,
    clientSignatureName: input.clientSignatureName?.trim() || undefined,
    lastUpdatedBy: input.updatedBy,
    lastUpdatedAt: timestamp,
    serviceStatus: input.serviceStatus,
  };

  if (input.serviceStatus === "completed") {
    return updateBinLocationState(id, {
      ...base,
      lastServiceDate: input.lastServiceDate,
      workflowStatus: "idle",
      serviceStatus: "completed",
      completedAt: timestamp,
      cannotAccessReason: undefined,
      issueType: undefined,
      issueNotes: undefined,
    });
  }

  if (input.serviceStatus === "cannot_access") {
    return updateBinLocationState(id, {
      ...base,
      workflowStatus: "cannot_access",
      serviceStatus: "cannot_access",
      cannotAccessReason: input.cannotAccessReason?.trim(),
      issueNotes: undefined,
      issueType: undefined,
      completedAt: undefined,
    });
  }

  return updateBinLocationState(id, {
    ...base,
    workflowStatus: "issue_reported",
    serviceStatus: "issue_reported",
    issueNotes: input.issueNotes?.trim(),
    issueType: "Technician Report",
    cannotAccessReason: undefined,
    completedAt: undefined,
  });
}

export function startBinJob(id: string) {
  return updateBinLocationState(id, { workflowStatus: "in_progress" });
}

export function completeBinService(id: string) {
  const today = new Date().toISOString().slice(0, 10);
  return updateBinLocationState(id, {
    lastServiceDate: today,
    workflowStatus: "idle",
    serviceStatus: "completed",
    cannotAccessReason: undefined,
    issueType: undefined,
    issueNotes: undefined,
    completedAt: new Date().toISOString(),
  });
}

export function markBinCannotAccess(id: string, reason: string) {
  return updateBinLocationState(id, {
    workflowStatus: "cannot_access",
    serviceStatus: "cannot_access",
    cannotAccessReason: reason,
  });
}

export function reportBinIssue(id: string, issueType: string, issueNotes?: string) {
  return updateBinLocationState(id, {
    workflowStatus: "issue_reported",
    serviceStatus: "issue_reported",
    issueType,
    issueNotes,
  });
}

export function getDueAndOverdueLocations(): BinLocationView[] {
  return getBinLocations().filter((location) => isDueOrOverdue(location));
}

export function getAttentionLocations(): BinLocationView[] {
  return getBinLocations().filter((location) => needsAdminAttention(location));
}

export function getBinAttentionItems(): BinAttentionItem[] {
  return getAttentionLocations().map((location) => ({
    id: location.id,
    locationName: location.location,
    serviceStatus:
      location.serviceStatus ??
      (location.workflowStatus === "cannot_access"
        ? "cannot_access"
        : "issue_reported"),
    lastUpdatedBy: location.lastUpdatedBy,
    lastUpdatedAt: location.lastUpdatedAt,
    notes: location.displayNotes,
    issueOrAccessReason:
      location.cannotAccessReason ??
      location.issueNotes ??
      "Needs admin review",
    lastServiceDate: location.lastServiceDate,
    nextServiceDate: computeNextServiceDate(location.lastServiceDate),
  }));
}
