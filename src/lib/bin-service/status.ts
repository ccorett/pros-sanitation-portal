import type { BinServiceJobStatus } from "@prisma/client";
import {
  addUtcDays,
  isSameUtcDay,
  startOfUtcDay,
} from "@/lib/bin-service/schedule";

export type RotationStatusColor =
  | "green"
  | "yellow"
  | "red"
  | "grey"
  | "orange";

export type RotationStatusInput = {
  active: boolean;
  nextServiceDate: Date | null;
  openJobStatus?: BinServiceJobStatus | null;
  scheduledDate?: Date | null;
};

export type RotationStatusResult = {
  color: RotationStatusColor;
  label: string;
  isOverdue: boolean;
  isDueSoon: boolean;
  needsAttention: boolean;
};

const STATUS_STYLES: Record<
  RotationStatusColor,
  { badge: string; border: string; calendar: string }
> = {
  green: {
    badge: "border-[#6cc801]/40 bg-[#6cc801]/15 text-[#6cc801]",
    border: "border-l-[#6cc801]",
    calendar: "bg-[#6cc801]",
  },
  yellow: {
    badge: "border-[#f5c542]/40 bg-[#f5c542]/15 text-[#f5c542]",
    border: "border-l-[#f5c542]",
    calendar: "bg-[#f5c542]",
  },
  red: {
    badge: "border-[#ff4d4f]/40 bg-[#ff4d4f]/15 text-[#ff4d4f]",
    border: "border-l-[#ff4d4f]",
    calendar: "bg-[#ff4d4f]",
  },
  orange: {
    badge: "border-[#ff8c42]/40 bg-[#ff8c42]/15 text-[#ff8c42]",
    border: "border-l-[#ff8c42]",
    calendar: "bg-[#ff8c42]",
  },
  grey: {
    badge: "border-[#ebfbff]/20 bg-[#ebfbff]/10 text-[#ebfbff]/50",
    border: "border-l-[#ebfbff]/25",
    calendar: "bg-[#ebfbff]/35",
  },
};

export function getRotationStatus(
  input: RotationStatusInput,
  now = new Date(),
): RotationStatusResult {
  if (!input.active) {
    return {
      color: "grey",
      label: "Inactive",
      isOverdue: false,
      isDueSoon: false,
      needsAttention: false,
    };
  }

  const today = startOfUtcDay(now);
  const tomorrow = addUtcDays(today, 1);
  const dueDate = input.nextServiceDate ?? input.scheduledDate ?? null;

  if (
    input.openJobStatus === "CANNOT_ACCESS" ||
    input.openJobStatus === "ISSUE_REPORTED"
  ) {
    return {
      color: "orange",
      label:
        input.openJobStatus === "CANNOT_ACCESS"
          ? "Cannot Access"
          : "Issue Reported",
      isOverdue: dueDate ? startOfUtcDay(dueDate) < today : false,
      isDueSoon: false,
      needsAttention: true,
    };
  }

  if (dueDate) {
    const due = startOfUtcDay(dueDate);
    const isCompleted = input.openJobStatus === "COMPLETED";

    if (!isCompleted && due < today) {
      return {
        color: "red",
        label: "Overdue",
        isOverdue: true,
        isDueSoon: false,
        needsAttention: true,
      };
    }

    if (!isCompleted && (isSameUtcDay(due, today) || isSameUtcDay(due, tomorrow))) {
      return {
        color: "yellow",
        label: isSameUtcDay(due, today) ? "Due Today" : "Due Tomorrow",
        isOverdue: false,
        isDueSoon: true,
        needsAttention: false,
      };
    }
  }

  return {
    color: "green",
    label: "On Schedule",
    isOverdue: false,
    isDueSoon: false,
    needsAttention: false,
  };
}

export function getRotationStatusStyles(color: RotationStatusColor) {
  return STATUS_STYLES[color];
}
