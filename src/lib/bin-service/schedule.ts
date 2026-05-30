import type { BinWeekPattern, ServiceDayOfWeek } from "@prisma/client";

const MS_PER_DAY = 86_400_000;
const REFERENCE_MONDAY = Date.UTC(2020, 0, 6);

const SERVICE_DAY_INDEX: Record<ServiceDayOfWeek, number> = {
  MONDAY: 0,
  TUESDAY: 1,
  WEDNESDAY: 2,
  THURSDAY: 3,
  FRIDAY: 4,
  SATURDAY: 5,
  SUNDAY: 6,
};

export const SERVICE_DAY_OPTIONS: { value: ServiceDayOfWeek; label: string }[] = [
  { value: "MONDAY", label: "Mon" },
  { value: "TUESDAY", label: "Tue" },
  { value: "WEDNESDAY", label: "Wed" },
  { value: "THURSDAY", label: "Thu" },
  { value: "FRIDAY", label: "Fri" },
  { value: "SATURDAY", label: "Sat" },
  { value: "SUNDAY", label: "Sun" },
];

export const WEEK_PATTERN_OPTIONS: { value: BinWeekPattern; label: string }[] = [
  { value: "WEEK_1_3", label: "Week 1 & 3" },
  { value: "WEEK_2_4", label: "Week 2 & 4" },
];

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return startOfUtcDay(next);
}

export function isSameUtcDay(a: Date, b: Date): boolean {
  return startOfUtcDay(a).getTime() === startOfUtcDay(b).getTime();
}

export function getMondayBasedDayIndex(date: Date): number {
  const jsDay = date.getUTCDay();
  return (jsDay + 6) % 7;
}

export function getCycleWeekIndex(date: Date): number {
  const day = startOfUtcDay(date);
  const daysSinceReference = Math.floor(
    (day.getTime() - REFERENCE_MONDAY) / MS_PER_DAY,
  );
  const weeksSinceReference = Math.floor(daysSinceReference / 7);
  return ((weeksSinceReference % 4) + 4) % 4;
}

export function matchesWeekPattern(date: Date, pattern: BinWeekPattern): boolean {
  const cycleWeek = getCycleWeekIndex(date);
  if (pattern === "WEEK_1_3") {
    return cycleWeek === 0 || cycleWeek === 2;
  }
  return cycleWeek === 1 || cycleWeek === 3;
}

export function isEligibleServiceDate(
  date: Date,
  serviceDay: ServiceDayOfWeek,
  weekPattern: BinWeekPattern,
): boolean {
  return (
    getMondayBasedDayIndex(date) === SERVICE_DAY_INDEX[serviceDay] &&
    matchesWeekPattern(date, weekPattern)
  );
}

export function findNextServiceDate(
  from: Date,
  serviceDay: ServiceDayOfWeek,
  weekPattern: BinWeekPattern,
  includeFrom = false,
): Date {
  let cursor = startOfUtcDay(from);
  if (!includeFrom) {
    cursor = addUtcDays(cursor, 1);
  }

  for (let i = 0; i < 370; i += 1) {
    if (isEligibleServiceDate(cursor, serviceDay, weekPattern)) {
      return cursor;
    }
    cursor = addUtcDays(cursor, 1);
  }

  throw new Error("Unable to calculate next service date.");
}

export function computeInitialNextServiceDate(
  serviceDay: ServiceDayOfWeek,
  weekPattern: BinWeekPattern,
  referenceDate = new Date(),
): Date {
  const today = startOfUtcDay(referenceDate);
  if (isEligibleServiceDate(today, serviceDay, weekPattern)) {
    return today;
  }
  return findNextServiceDate(today, serviceDay, weekPattern, false);
}

export function computeNextServiceDateAfterCompletion(
  lastCompletedServiceDate: Date,
  serviceDay: ServiceDayOfWeek,
  weekPattern: BinWeekPattern,
): Date {
  return findNextServiceDate(
    lastCompletedServiceDate,
    serviceDay,
    weekPattern,
    false,
  );
}

export function formatServiceDayLabel(serviceDay: ServiceDayOfWeek): string {
  return SERVICE_DAY_OPTIONS.find((option) => option.value === serviceDay)?.label ?? serviceDay;
}

export function formatWeekPatternLabel(weekPattern: BinWeekPattern): string {
  return WEEK_PATTERN_OPTIONS.find((option) => option.value === weekPattern)?.label ?? weekPattern;
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
