import type { CleaningServiceType } from "@/lib/client-location-display";

/** Local timezone for Pennysaver daily cleaning schedule rollover. */
export const CLEANING_SCHEDULE_TIME_ZONE = "America/Port_of_Spain";

export const RECURRING_CLEANING_SERVICE_TYPES: ReadonlySet<CleaningServiceType> =
  new Set(["Grocery Cleaning", "Pharmacy Cleaning", "Janitorial Service"]);

const ROLLOVER_HOUR = 22;

let scheduleNowOverride: Date | undefined;

export function setCleaningScheduleNowForTests(now: Date | undefined): void {
  scheduleNowOverride = now;
}

function getCleaningScheduleNow(): Date {
  return scheduleNowOverride ?? new Date();
}

type LocalDateParts = {
  year: string;
  month: string;
  day: string;
  hour: number;
};

function readLocalDateParts(now: Date, timeZone: string): LocalDateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: Number(read("hour")),
  };
}

export function toDateOnlyIso(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function addDaysToDateOnlyIso(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateOnlyIso(date);
}

export function isRecurringCleaningServiceType(serviceType: string): boolean {
  return RECURRING_CLEANING_SERVICE_TYPES.has(serviceType as CleaningServiceType);
}

export function resolveRecurringCleaningScheduledDate(
  now: Date = new Date(),
  timeZone: string = CLEANING_SCHEDULE_TIME_ZONE,
): string {
  const { year, month, day, hour } = readLocalDateParts(now, timeZone);
  const todayIso = `${year}-${month}-${day}`;
  return hour >= ROLLOVER_HOUR ? addDaysToDateOnlyIso(todayIso, 1) : todayIso;
}

export function resolveRecurringCleaningDueDate(scheduledDateIso: string): string {
  return addDaysToDateOnlyIso(scheduledDateIso, 1);
}

export function resolveRecurringCleaningSchedule(
  now: Date = new Date(),
  timeZone: string = CLEANING_SCHEDULE_TIME_ZONE,
): { scheduledDate: string; dueDate: string } {
  const scheduledDate = resolveRecurringCleaningScheduledDate(now, timeZone);
  return {
    scheduledDate,
    dueDate: resolveRecurringCleaningDueDate(scheduledDate),
  };
}

export function applyRecurringCleaningScheduleToJob<
  T extends { serviceType: string; scheduledDate: string; dueDate: string },
>(job: T, now: Date = getCleaningScheduleNow()): T {
  if (!isRecurringCleaningServiceType(job.serviceType)) {
    return job;
  }

  const schedule = resolveRecurringCleaningSchedule(now);
  return {
    ...job,
    scheduledDate: schedule.scheduledDate,
    dueDate: schedule.dueDate,
  };
}
