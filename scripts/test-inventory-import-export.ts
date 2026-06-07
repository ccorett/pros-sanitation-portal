/**
 * Verifies inventory CSV export/import against Neon.
 * Run: npx tsx scripts/test-inventory-import-export.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
import { buildInventoryExportCsv } from "../src/lib/inventory-export-service";
import {
  confirmInventoryCsvImport,
  previewInventoryCsvImport,
} from "../src/lib/inventory-import-service";
import {
  listActiveInventoryItems,
  listInventoryEditHistory,
} from "../src/lib/inventory-service";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function main() {
  const manager = await prisma.employee.findFirst({
    where: { companyEmail: "manager@prossanitation.com" },
  });

  if (!manager) {
    throw new Error("Manager test account missing. Run prisma db seed first.");
  }

  const target = (await listActiveInventoryItems()).find(
    (item) => item.itemName === "Pressure Washer",
  );

  if (!target) {
    throw new Error("Pressure Washer seed item not found.");
  }

  const originalQuantity = target.availableQuantity;
  const exportCsv = await buildInventoryExportCsv();

  if (!exportCsv.includes("Item Name") || !exportCsv.includes("Pressure Washer")) {
    throw new Error("Export CSV missing expected Neon inventory rows.");
  }

  const updatedQuantity = originalQuantity + 7;
  const updatedCsv = `Item Name,Category,Available Quantity,Unit,Stock Status,Storage Area,Supplier,Last Updated,Action
${target.itemName},Equipment,${updatedQuantity},unit,In Stock,Equipment Room,To be confirmed,,`;

  const preview = await previewInventoryCsvImport(updatedCsv, "test-inventory-import.csv");
  const updateRow = preview.rows.find(
    (row) => row.itemName === target.itemName && row.action === "Update",
  );

  if (!updateRow || updateRow.newQuantity !== updatedQuantity) {
    throw new Error("Preview did not detect quantity update for Pressure Washer.");
  }

  const result = await confirmInventoryCsvImport({
    csvContent: updatedCsv,
    fileName: "test-inventory-import.csv",
    importedById: manager.id,
    importedByName: `${manager.firstName} ${manager.lastName}`.trim(),
  });

  const reloaded = (await listActiveInventoryItems()).find(
    (item) => item.id === target.id,
  );
  const history = await listInventoryEditHistory(target.id);
  const latestHistory = history[0];

  if (reloaded?.availableQuantity !== updatedQuantity) {
    throw new Error("Imported quantity did not persist in Neon.");
  }

  if (!latestHistory?.notes?.includes("Inventory import: test-inventory-import.csv")) {
    throw new Error("StockEditHistory missing inventory import note.");
  }

  await prisma.inventoryItem.update({
    where: { id: target.id },
    data: {
      availableQuantity: originalQuantity,
      lastEditedBy: "Inventory import test restore",
      lastEditedAt: new Date(),
    },
  });

  console.log("Inventory import/export test OK:", {
    exportContainsNeonData: true,
    previewUpdateCount: preview.updateCount,
    importResult: result,
    reloadedQuantity: reloaded.availableQuantity,
    stockHistoryNote: latestHistory.notes,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
