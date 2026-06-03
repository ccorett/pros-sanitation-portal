/**
 * Verifies Admin Hub summary counts track Neon changes.
 * Run: npx tsx scripts/test-admin-hub-summary.ts
 */
import {
  EquipmentRequestStatus,
  RequestUrgency,
} from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import {
  createEquipmentRequest,
  reviewEquipmentRequest,
} from "../src/lib/equipment-request-service";
import { getAdminHubSummaryCounts } from "../src/lib/admin-hub-summary-service";
import { updateInventoryItem } from "../src/lib/inventory-service";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.employee.findFirst({
    where: { companyEmail: "admin@prossanitation.com" },
  });
  const teamMember = await prisma.employee.findFirst({
    where: { companyEmail: "team.member@prossanitation.com" },
  });

  if (!admin || !teamMember) {
    throw new Error("Test accounts missing. Run prisma db seed first.");
  }

  const item = await prisma.inventoryItem.findFirst({
    where: { isActive: true },
    orderBy: { reorderLevel: "desc" },
  });

  if (!item) {
    throw new Error("No active inventory item found.");
  }

  const before = await getAdminHubSummaryCounts(admin);
  const equipmentBefore = before.pendingEquipmentRequests;
  const lowStockBefore = before.lowStockItems;

  const created = await createEquipmentRequest({
    inventoryItemId: item.id,
    quantityRequested: 1,
    reason: "Hub summary test request",
    urgency: RequestUrgency.NORMAL,
    requester: teamMember,
  });

  const afterCreate = await getAdminHubSummaryCounts(admin);
  if (afterCreate.pendingEquipmentRequests !== equipmentBefore + 1) {
    throw new Error(
      `Expected equipment pending ${equipmentBefore + 1}, got ${afterCreate.pendingEquipmentRequests}`,
    );
  }

  await reviewEquipmentRequest({
    requestId: created.id,
    status: EquipmentRequestStatus.APPROVED,
    reviewer: admin,
  });

  const afterApprove = await getAdminHubSummaryCounts(admin);
  if (afterApprove.pendingEquipmentRequests !== equipmentBefore) {
    throw new Error(
      `Expected equipment pending back to ${equipmentBefore}, got ${afterApprove.pendingEquipmentRequests}`,
    );
  }

  const newQuantity = Math.max(0, item.reorderLevel - 1);
  await updateInventoryItem(item.id, {
    availableQuantity: newQuantity,
    reorderLevel: item.reorderLevel,
    storageArea: item.storageArea,
    supplier: item.supplier,
    editedBy: "Hub Summary Test",
  });

  const afterLowStock = await getAdminHubSummaryCounts(admin);
  if (afterLowStock.lowStockItems < lowStockBefore) {
    throw new Error(
      `Expected low stock count >= ${lowStockBefore}, got ${afterLowStock.lowStockItems}`,
    );
  }

  await updateInventoryItem(item.id, {
    availableQuantity: item.availableQuantity,
    reorderLevel: item.reorderLevel,
    storageArea: item.storageArea,
    supplier: item.supplier,
    editedBy: "Hub Summary Test Restore",
  });

  console.log("Admin hub summary test OK:", {
    equipmentPending: afterApprove.pendingEquipmentRequests,
    lowStockAfterBump: afterLowStock.lowStockItems,
    approvalInbox:
      afterApprove.pendingEquipmentRequests +
      afterApprove.pendingVacationRequests +
      afterApprove.pendingJobLetterRequests +
      afterApprove.pendingPayslipRequests +
      afterApprove.binAttentionItems,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
