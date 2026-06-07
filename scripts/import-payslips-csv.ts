import { config } from "dotenv";
import { readFileSync } from "fs";
import { resolve } from "path";
const DEFAULT_PAYSLIP_CSV_PATH = "data/payslips/may-2026-payslip-import.csv";
import { confirmPayslipCsvImport } from "../src/lib/payslip-import-service";
import { prisma } from "../src/lib/prisma";
import { AccessLevel } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const filePath = resolve(process.cwd(), process.argv[2] ?? DEFAULT_PAYSLIP_CSV_PATH);
  const csvContent = readFileSync(filePath, "utf8");
  const fileName = filePath.split(/[/\\]/).pop() ?? "payslip-import.csv";

  const actor =
    (await prisma.employee.findFirst({
      where: { accessLevel: AccessLevel.SUPER_ADMIN },
      orderBy: { createdAt: "asc" },
    })) ??
    (await prisma.employee.findFirst({
      where: { accessLevel: AccessLevel.ADMIN },
      orderBy: { createdAt: "asc" },
    }));

  if (!actor) {
    throw new Error("No admin employee found to attribute the import.");
  }

  const importedByName = `${actor.firstName} ${actor.lastName}`.trim();

  const result = await confirmPayslipCsvImport({
    csvContent,
    fileName,
    importedById: actor.id,
    importedByName,
  });

  console.log(
    JSON.stringify(
      {
        filePath,
        fileName,
        importedBy: importedByName,
        recordsImported: result.recordsImported,
        recordsUpdated: result.recordsUpdated,
        recordsSkipped: result.recordsSkipped,
        archived: result.archived,
        unmatched: result.unmatchedEmployees,
        auditLogId: result.auditLogId,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
