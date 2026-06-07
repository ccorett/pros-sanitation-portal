import {
  comparePayPeriods,
  isPayPeriodWithinVisibleWindow,
  normalizePayPeriod,
  PAYSLIP_VISIBLE_MONTH_COUNT,
  shouldArchivePayPeriod,
} from "../src/lib/payslip-pay-period";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  assert(normalizePayPeriod("june 2026") === "June 2026", "normalize pay period");
  assert(
    comparePayPeriods("June 2026", "May 2026") < 0,
    "newest-first compare order",
  );
  assert(
    isPayPeriodWithinVisibleWindow("June 2026", new Date("2026-06-15T00:00:00Z")),
    "current month visible",
  );
  assert(
    shouldArchivePayPeriod("May 2025", new Date("2026-06-15T00:00:00Z")),
    "older than 12 months archived",
  );
  assert(
    isPayPeriodWithinVisibleWindow("July 2025", new Date("2026-06-15T00:00:00Z")),
    "11 months back visible",
  );
  assert(PAYSLIP_VISIBLE_MONTH_COUNT === 12, "12 month window");

  console.log("Payslip pay period retention checks passed.");
}

main();
