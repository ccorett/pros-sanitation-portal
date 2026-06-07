const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

export const PAYSLIP_VISIBLE_MONTH_COUNT = 12;

export function normalizePayPeriod(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  const match = trimmed.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!match) {
    return trimmed;
  }

  const month = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  return `${month} ${match[2]}`;
}

export function parsePayPeriodDate(payPeriod: string): Date | null {
  const normalized = normalizePayPeriod(payPeriod);
  const match = normalized.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!match) {
    return null;
  }

  const monthIndex = MONTH_NAMES.indexOf(match[1].toLowerCase() as (typeof MONTH_NAMES)[number]);
  if (monthIndex === -1) {
    return null;
  }

  return new Date(Date.UTC(Number(match[2]), monthIndex, 1));
}

export function comparePayPeriods(left: string, right: string): number {
  const leftDate = parsePayPeriodDate(left);
  const rightDate = parsePayPeriodDate(right);

  if (leftDate && rightDate) {
    return rightDate.getTime() - leftDate.getTime();
  }

  return right.localeCompare(left);
}

export function isPayPeriodWithinVisibleWindow(
  payPeriod: string,
  referenceDate = new Date(),
): boolean {
  const periodDate = parsePayPeriodDate(payPeriod);
  if (!periodDate) {
    return true;
  }

  const windowStart = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth() - (PAYSLIP_VISIBLE_MONTH_COUNT - 1),
      1,
    ),
  );
  const windowEnd = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 1, 0),
  );

  return periodDate >= windowStart && periodDate <= windowEnd;
}

export function shouldArchivePayPeriod(
  payPeriod: string,
  referenceDate = new Date(),
): boolean {
  return !isPayPeriodWithinVisibleWindow(payPeriod, referenceDate);
}
