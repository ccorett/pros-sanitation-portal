import { config } from "dotenv";
import { resolve } from "path";
import { comparePayPeriods, normalizePayPeriod } from "../src/lib/payslip-pay-period";
import { matchEmployee } from "../src/lib/payslip-employee-matching";
import {
  autoRecoverSkippedPayslips,
  normalizeStoredPayPeriods,
} from "../src/lib/payslip-recovery-service";
import { listPayslipsForEmployee } from "../src/lib/payslip-archive-service";
import { prisma } from "../src/lib/prisma";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const employees = await prisma.employee.findMany();

  const joshuaMatch = matchEmployee(
    { employeeName: "Joshua Powder", email: "" },
    employees,
  );
  console.log("Joshua blank email match:", {
    email: joshuaMatch.employee?.companyEmail ?? null,
    uncertain: joshuaMatch.uncertain,
  });

  const candiceMatch = matchEmployee(
    { employeeName: "Candice Powder-Paris", email: "" },
    employees,
  );
  console.log("Candice hyphenated name match:", {
    email: candiceMatch.employee?.companyEmail ?? null,
    uncertain: candiceMatch.uncertain,
  });

  const cavaneyMatch = matchEmployee(
    { employeeName: "Cavaney Paris", email: "" },
    employees,
  );
  console.log("Cavaney Paris uncertain match:", {
    email: cavaneyMatch.employee?.companyEmail ?? null,
    uncertain: cavaneyMatch.uncertain,
    reason: cavaneyMatch.uncertainReason ?? null,
  });

  console.log("normalize Mar 2026:", normalizePayPeriod("Mar 2026"));
  console.log("compare March vs May:", comparePayPeriods("March 2026", "May 2026"));
  console.log("compare Mar vs May:", comparePayPeriods("Mar 2026", "May 2026"));

  const normalized = await normalizeStoredPayPeriods();
  console.log("Normalized pay periods updated:", normalized);

  const recovery = await autoRecoverSkippedPayslips();
  console.log("Recovery result:", recovery);

  const joshua = await prisma.employee.findFirst({
    where: { companyEmail: "joshua.powder@prossanitation.com" },
    select: { id: true },
  });

  if (!joshua) {
    throw new Error("Joshua Powder payroll employee not found.");
  }

  const payslips = await listPayslipsForEmployee(joshua.id);
  console.log(
    "Joshua payslip order:",
    payslips.map((row) => ({
      payPeriod: row.payPeriod,
      email: row.employeeEmail,
      employeeId: row.employeeId,
    })),
  );

  const skippedCount = await prisma.payslip.count({ where: { employeeId: null } });
  console.log("Remaining skipped payslips:", skippedCount);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
