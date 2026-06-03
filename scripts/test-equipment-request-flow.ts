import { config } from "dotenv";
import { resolve } from "path";
import {
  createEquipmentRequest,
  listEquipmentRequestsForActor,
  reviewEquipmentRequest,
} from "../src/lib/equipment-request-service";
import { listActiveInventoryItems } from "../src/lib/inventory-service";
import { prisma } from "../src/lib/prisma";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const supervisor = await prisma.employee.findUnique({
    where: { companyEmail: "supervisor@prossanitation.com" },
  });
  const admin = await prisma.employee.findUnique({
    where: { companyEmail: "admin@prossanitation.com" },
  });
  const gloves = (await listActiveInventoryItems()).find(
    (item) => item.itemName === "Gloves",
  );

  if (!supervisor || !admin || !gloves) {
    throw new Error("Missing seed supervisor, admin, or Gloves item.");
  }

  const beforeQty = gloves.availableQuantity;

  const created = await createEquipmentRequest({
    inventoryItemId: gloves.id,
    quantityRequested: 2,
    reason: "Supervisor test request for audit flow",
    urgency: "NORMAL",
    requester: supervisor,
  });

  const adminView = await listEquipmentRequestsForActor(admin);
  const found = adminView.find((row) => row.id === created.id);
  if (!found) {
    throw new Error("Admin could not see supervisor equipment request.");
  }

  const approved = await reviewEquipmentRequest({
    requestId: created.id,
    status: "APPROVED",
    reviewer: admin,
  });

  const fulfilled = await reviewEquipmentRequest({
    requestId: created.id,
    status: "FULFILLED",
    reviewer: admin,
  });

  const afterItem = (await listActiveInventoryItems()).find(
    (item) => item.id === gloves.id,
  );

  console.log(
    JSON.stringify(
      {
        requestId: created.id,
        statusAfterFulfill: fulfilled.status,
        glovesBefore: beforeQty,
        glovesAfter: afterItem?.availableQuantity,
        quantityReducedBy: beforeQty - (afterItem?.availableQuantity ?? beforeQty),
        supervisorSeesStatus: (
          await listEquipmentRequestsForActor(supervisor)
        ).find((row) => row.id === created.id)?.status,
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
