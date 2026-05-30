export type BinServiceStatusColor = "green" | "yellow" | "red" | "grey";

export type BinWorkflowStatus =
  | "idle"
  | "in_progress"
  | "cannot_access"
  | "issue_reported";

export type BinLocationRecord = {
  id: string;
  slug: string;
  location: string;
  newBins: number;
  regularBins: number;
  notes: string;
  lastServiceDate: string;
  active: boolean;
};

export type BinLocationState = {
  lastServiceDate?: string;
  active?: boolean;
  workflowStatus?: BinWorkflowStatus;
  cannotAccessReason?: string;
  issueType?: string;
  issueNotes?: string;
};

export const SERVICE_CYCLE_DAYS = 14;

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T12:00:00.000Z`).getTime();
  const to = new Date(`${toIso}T12:00:00.000Z`).getTime();
  return Math.floor((to - from) / 86_400_000);
}

export function computeNextServiceDate(lastServiceDate: string): string {
  return addDays(lastServiceDate, SERVICE_CYCLE_DAYS);
}

export function computeDaysSinceLastService(
  lastServiceDate: string,
  referenceDate = new Date(),
): number {
  const today = referenceDate.toISOString().slice(0, 10);
  return daysBetween(lastServiceDate, today);
}

export function getBinServiceStatus(
  location: Pick<BinLocationRecord, "active" | "lastServiceDate">,
  referenceDate = new Date(),
): { color: BinServiceStatusColor; label: string } {
  if (!location.active) {
    return { color: "grey", label: "Inactive" };
  }

  const days = computeDaysSinceLastService(location.lastServiceDate, referenceDate);

  if (days >= 18) {
    return { color: "red", label: "Overdue" };
  }
  if (days >= 14) {
    return { color: "yellow", label: "Due" };
  }
  return { color: "green", label: "On Schedule" };
}

export function statusColorClass(color: BinServiceStatusColor): string {
  if (color === "green") {
    return "border-[#6cc801]/35 bg-[#6cc801]/15 text-[#6cc801]";
  }
  if (color === "yellow") {
    return "border-[#f5c542]/35 bg-[#f5c542]/15 text-[#f5c542]";
  }
  if (color === "red") {
    return "border-[#ff4d4f]/35 bg-[#ff4d4f]/15 text-[#ff4d4f]";
  }
  return "border-[#ebfbff]/20 bg-[#ebfbff]/10 text-[#ebfbff]/50";
}

export function statusBorderClass(color: BinServiceStatusColor): string {
  if (color === "green") return "border-l-[#6cc801]";
  if (color === "yellow") return "border-l-[#f5c542]";
  if (color === "red") return "border-l-[#ff4d4f]";
  return "border-l-[#ebfbff]/25";
}

export function formatBinDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00.000Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function isDueOrOverdue(
  location: Pick<BinLocationRecord, "active" | "lastServiceDate">,
  referenceDate = new Date(),
): boolean {
  const { color } = getBinServiceStatus(location, referenceDate);
  return color === "yellow" || color === "red";
}
