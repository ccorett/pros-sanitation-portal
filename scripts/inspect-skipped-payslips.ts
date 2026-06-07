import { config } from "dotenv";
import { resolve } from "path";
import { prisma } from "../src/lib/prisma";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const joshua = await prisma.employee.findFirst({
    where: { companyEmail: "joshua.powder@prossanitation.com" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      companyEmail: true,
      employeeId: true,
    },
  });
  console.log("Joshua employee:", joshua);

  const joshuaPayslips = await prisma.payslip.findMany({
    where: {
      OR: [
        { employeeId: joshua?.id },
        { employeeName: { contains: "Joshua", mode: "insensitive" } },
        { employeeEmail: "joshua.powder@prossanitation.com" },
      ],
    },
    select: {
      id: true,
      employeeId: true,
      employeeName: true,
      employeeEmail: true,
      payPeriod: true,
      source: true,
      importedAt: true,
      uploadedAt: true,
    },
    orderBy: { payPeriod: "asc" },
  });
  console.log("Joshua payslips:", JSON.stringify(joshuaPayslips, null, 2));

  const skipped = await prisma.payslip.findMany({
    where: { employeeId: null },
    select: {
      id: true,
      employeeName: true,
      employeeEmail: true,
      payPeriod: true,
      source: true,
    },
  });
  console.log("Skipped (null employeeId):", JSON.stringify(skipped, null, 2));

  const { comparePayPeriods } = await import("../src/lib/payslip-pay-period");
  const allPeriods = await prisma.payslip.findMany({ select: { payPeriod: true } });
  console.log(
    "Unique pay periods:",
    [...new Set(allPeriods.map((row) => row.payPeriod))].sort(),
  );
  console.log("compare Mar vs May:", comparePayPeriods("Mar 2026", "May 2026"));
  console.log("compare April vs May:", comparePayPeriods("April 2026", "May 2026"));

  const logs = await prisma.payslipImportLog.findMany({
    orderBy: { importedAt: "desc" },
    take: 5,
  });
  console.log(
    "Recent audit logs:",
    JSON.stringify(
      logs.map((log) => ({
        fileName: log.fileName,
        skipped: log.recordsSkipped,
        unmatched: log.unmatchedEmployees,
      })),
      null,
      2,
    ),
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
