import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  confirmBinLocationCsvImport,
  previewBinLocationCsvImport,
} from "../src/lib/bin-location-import-service";
import { prisma } from "../src/lib/prisma";

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    throw new Error("Usage: tsx scripts/test-bin-location-import.ts <path-to-csv>");
  }

  const csvContent = readFileSync(resolve(csvPath), "utf8");
  const fileName = csvPath.split(/[\\/]/).pop() ?? "import.csv";

  const preview = await previewBinLocationCsvImport(csvContent, fileName);
  console.log("Preview summary:", {
    totalRows: preview.totalRows,
    newCount: preview.newCount,
    updateCount: preview.updateCount,
    skippedCount: preview.skippedCount,
    errorCount: preview.errorCount,
  });

  const duplicateLocations = preview.rows
    .filter((row) => row.notes === "Duplicate Location in import file.")
    .map((row) => row.location);
  if (duplicateLocations.length > 0) {
    throw new Error(`Duplicate locations found: ${duplicateLocations.join(", ")}`);
  }

  const warningRows = preview.rows.filter((row) =>
    row.notes?.startsWith("Total Bins"),
  );
  console.log(`Rows with total-bin warnings: ${warningRows.length}`);

  const beforeCount = await prisma.binServiceSite.count();
  const result = await confirmBinLocationCsvImport({
    csvContent,
    fileName,
    importedById: "00000000-0000-4000-8000-000000000001",
    importedByName: "Import Test",
  });

  const afterCount = await prisma.binServiceSite.count();
  console.log("Import result:", result);
  console.log("Site count:", { before: beforeCount, after: afterCount });

  const whim = await prisma.binServiceSite.findFirst({
    where: { name: "Whim A.C." },
    include: { setup: true },
  });
  if (!whim?.setup) {
    throw new Error("Expected Whim A.C. site with setup after import.");
  }
  if (whim.setup.expectedNewBins !== 2 || whim.setup.expectedRegularBins !== 1) {
    throw new Error("Whim A.C. bin counts did not import correctly.");
  }

  const audit = await prisma.binLocationImportLog.findUnique({
    where: { id: result.auditLogId },
  });
  if (!audit) {
    throw new Error("Audit log was not created.");
  }

  console.log("Bin location import test passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
