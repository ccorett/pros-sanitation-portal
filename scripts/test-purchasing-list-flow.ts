/**
 * Verifies purchasing list and low-stock counts use Neon inventory.
 * Run: npx tsx scripts/test-purchasing-list-flow.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  countLowStockActiveItems,
  excludeFromPurchasingList,
  listPurchasingListItems,
  markPurchasingOrdered,
  updateInventoryItem,
} from "../src/lib/inventory-service";

const prisma = new PrismaClient();

async function main() {
  const item = await prisma.inventoryItem.findFirst({
    where: { isActive: true },
    orderBy: { itemName: "asc" },
  });

  if (!item) {
    throw new Error("No active inventory item found.");
  }

  const originalQty = item.availableQuantity;
  const originalReorder = item.reorderLevel;
  const testQty = Math.max(0, item.reorderLevel - 1);

  await updateInventoryItem(item.id, {
    availableQuantity: testQty,
    editedBy: "Purchasing Flow Test",
  });

  const onList = await listPurchasingListItems();
  const lowStockCount = await countLowStockActiveItems();

  if (!onList.some((row) => row.id === item.id)) {
    throw new Error("Item should appear on purchasing list when below reorder level.");
  }

  if (lowStockCount < 1) {
    throw new Error("Low stock count should be at least 1.");
  }

  await markPurchasingOrdered(item.id, "Purchasing Flow Test");

  const afterOrdered = await listPurchasingListItems();
  if (afterOrdered.some((row) => row.id === item.id)) {
    throw new Error("Ordered item should be hidden from purchasing list.");
  }

  await updateInventoryItem(item.id, {
    availableQuantity: testQty,
    editedBy: "Purchasing Flow Test",
  });

  await excludeFromPurchasingList(item.id, "Purchasing Flow Test");

  const afterExcluded = await listPurchasingListItems();
  if (afterExcluded.some((row) => row.id === item.id)) {
    throw new Error("Excluded item should be hidden from purchasing list.");
  }

  await updateInventoryItem(item.id, {
    availableQuantity: originalQty,
    reorderLevel: originalReorder,
    editedBy: "Purchasing Flow Test",
  });

  console.log("Purchasing list flow OK:", {
    item: item.itemName,
    lowStockCount,
    restoredQuantity: originalQty,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
