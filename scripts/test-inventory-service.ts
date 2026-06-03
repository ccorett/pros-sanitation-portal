import { config } from "dotenv";
import { resolve } from "path";
import {
  listActiveInventoryItems,
  listInventoryEditHistory,
  updateInventoryItem,
} from "../src/lib/inventory-service";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const before = await listActiveInventoryItems();
  const target = before.find((item) => item.itemName === "Pressure Washer");

  if (!target) {
    throw new Error("Pressure Washer seed item not found.");
  }

  const originalQuantity = target.availableQuantity;
  const patched = await updateInventoryItem(target.id, {
    availableQuantity: 99,
    editedBy: "Admin Test",
  });
  const reloaded = (await listActiveInventoryItems()).find(
    (item) => item.id === target.id,
  );
  const history = await listInventoryEditHistory(target.id);

  await updateInventoryItem(target.id, {
    availableQuantity: originalQuantity,
    editedBy: "Admin Test Restore",
  });

  console.log(
    JSON.stringify(
      {
        activeItemCount: before.length,
        patchedQuantity: patched.availableQuantity,
        reloadedQuantity: reloaded?.availableQuantity,
        persistsAfterReload: reloaded?.availableQuantity === 99,
        stockEditHistoryCreated: history.length > 0,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
