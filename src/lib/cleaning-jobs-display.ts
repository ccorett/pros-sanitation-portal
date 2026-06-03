import type { CleaningJobStatus, JobActionType, JobPriority } from "@prisma/client";

export function formatCleaningJobDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00.000Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function cleaningJobStatusLabel(status: CleaningJobStatus): string {
  return status.replaceAll("_", " ");
}

export function cleaningJobPriorityLabel(priority: JobPriority): string {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

export function cleaningJobStatusBadgeClass(status: CleaningJobStatus): string {
  switch (status) {
    case "COMPLETED":
      return "border-[#6cc801]/35 bg-[#6cc801]/15 text-[#6cc801]";
    case "IN_PROGRESS":
      return "border-[#00c6ff]/35 bg-[#00c6ff]/15 text-[#00c6ff]";
    case "CANCELLED":
      return "border-[#ff4d4f]/35 bg-[#ff4d4f]/15 text-[#ff4d4f]";
    case "ASSIGNED":
      return "border-[#259f00]/35 bg-[#259f00]/15 text-[#6cc801]";
    case "ISSUE_REPORTED":
      return "border-[#ff9f0a]/35 bg-[#ff9f0a]/15 text-[#ff9f0a]";
    default:
      return "border-[#ebfbff]/25 bg-[#ebfbff]/10 text-[#ebfbff]/70";
  }
}

export function jobActionTypeLabel(actionType: JobActionType): string {
  return actionType.replaceAll("_", " ");
}

export function formatJobServiceLogTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function cleaningJobPriorityBadgeClass(priority: JobPriority): string {
  switch (priority) {
    case "URGENT":
      return "border-[#ff4d4f]/35 bg-[#ff4d4f]/15 text-[#ff4d4f]";
    case "HIGH":
      return "border-[#ff9f0a]/35 bg-[#ff9f0a]/15 text-[#ff9f0a]";
    case "LOW":
      return "border-[#ebfbff]/25 bg-[#ebfbff]/10 text-[#ebfbff]/60";
    default:
      return "border-[#00c6ff]/35 bg-[#00c6ff]/15 text-[#00c6ff]";
  }
}
