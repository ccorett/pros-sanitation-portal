export type PlatformEditSection =
  | "Requests for Approval"
  | "Stock Management"
  | "Purchasing List"
  | "Bin Services"
  | "Human Resources";

export type EditHistoryEntry = {
  id: string;
  recordId: string;
  section: PlatformEditSection;
  recordName: string;
  actionType: string;
  previousValue: string;
  newValue: string;
  editedBy: string;
  editedAt: string;
  notes?: string;
};

const HISTORY_PREFIX = "pros-platform-edit-history:";

export const seedEditHistory: EditHistoryEntry[] = [
  {
    id: "hist-001",
    recordId: "inv-001",
    section: "Stock Management",
    recordName: "Nitrile Gloves (box)",
    actionType: "Quantity Update",
    previousValue: "12",
    newValue: "8",
    editedBy: "Admin User",
    editedAt: "2026-05-19T14:30:00.000Z",
    notes: "Adjusted after night shift count",
  },
  {
    id: "hist-002",
    recordId: "apr-001",
    section: "Requests for Approval",
    recordName: "Stock Request — Nitrile Gloves",
    actionType: "Status Change",
    previousValue: "Pending",
    newValue: "Approved",
    editedBy: "Admin User",
    editedAt: "2026-05-20T09:15:00.000Z",
  },
  {
    id: "hist-003",
    recordId: "bin-014",
    section: "Bin Services",
    recordName: "Roxborough Works",
    actionType: "Service Update",
    previousValue: "Due",
    newValue: "Completed",
    editedBy: "Jordan Mitchell",
    editedAt: "2026-05-18T16:45:00.000Z",
  },
  {
    id: "hist-004",
    recordId: "hr-vac-002",
    section: "Human Resources",
    recordName: "Alex Rivera — Vacation",
    actionType: "Status Change",
    previousValue: "Pending",
    newValue: "Approved",
    editedBy: "Admin User",
    editedAt: "2026-05-17T11:00:00.000Z",
  },
];

function readHistory(): EditHistoryEntry[] {
  if (typeof window === "undefined") return seedEditHistory;
  const raw = localStorage.getItem(HISTORY_PREFIX);
  if (!raw) return seedEditHistory;
  try {
    const parsed = JSON.parse(raw) as EditHistoryEntry[];
    return Array.isArray(parsed) ? parsed : seedEditHistory;
  } catch {
    return seedEditHistory;
  }
}

function saveHistory(entries: EditHistoryEntry[]) {
  localStorage.setItem(HISTORY_PREFIX, JSON.stringify(entries));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pros-platform-data-updated"));
  }
}

export function getEditHistory(): EditHistoryEntry[] {
  return readHistory();
}

export function getEditHistoryForRecord(recordId: string): EditHistoryEntry[] {
  return readHistory()
    .filter((entry) => entry.recordId === recordId)
    .sort((a, b) => b.editedAt.localeCompare(a.editedAt));
}

export function getEditHistoryForSection(
  section: PlatformEditSection,
): EditHistoryEntry[] {
  return readHistory()
    .filter((entry) => entry.section === section)
    .sort((a, b) => b.editedAt.localeCompare(a.editedAt));
}

export function appendEditHistory(
  entry: Omit<EditHistoryEntry, "id" | "editedAt"> & { editedAt?: string },
) {
  const created: EditHistoryEntry = {
    ...entry,
    id: `hist-${Date.now()}`,
    editedAt: entry.editedAt ?? new Date().toISOString(),
  };
  saveHistory([created, ...readHistory()]);
  return created;
}

export function formatEditTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
