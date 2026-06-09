import {
  filterAdminBinLocationRows,
  listAdminBinLocationRows,
} from "../src/lib/admin-bin-locations-service";
import { listBinFieldSitesForActor } from "../src/lib/bin-service/field-service";
import { softRemoveBinServiceSite } from "../src/lib/bin-service/service";
import { prisma } from "../src/lib/prisma";

async function main() {
  const rows = await listAdminBinLocationRows();
  if (rows.length === 0) {
    throw new Error("Expected at least one admin bin location row.");
  }

  const searchMatches = filterAdminBinLocationRows(rows, {
    search: rows[0].location.slice(0, 4).toLowerCase(),
  });
  if (searchMatches.length === 0) {
    throw new Error("Location search filter failed.");
  }

  const dueMatches = filterAdminBinLocationRows(rows, { dueOverdue: "due_or_overdue" });
  console.log(`Due/overdue filter matches: ${dueMatches.length}`);

  const target = rows.find((row) => !row.removedAt);
  if (!target) {
    throw new Error("No active location available for soft-delete test.");
  }

  const logsBefore = await prisma.binServiceLog.count({
    where: { siteId: target.siteId },
  });

  await softRemoveBinServiceSite(target.siteId, "Admin Bin Test");

  const removed = await prisma.binServiceSetup.findUnique({
    where: { siteId: target.siteId },
  });
  if (!removed?.removedAt || removed.active) {
    throw new Error("Soft delete did not mark setup as removed.");
  }

  const logsAfter = await prisma.binServiceLog.count({
    where: { siteId: target.siteId },
  });
  if (logsAfter !== logsBefore) {
    throw new Error("Service history changed after soft delete.");
  }

  const technician = await prisma.employee.findFirst({
    where: { companyEmail: "bin.tech@prossanitation.com" },
  });
  if (technician) {
    const fieldRows = await listBinFieldSitesForActor(technician);
    if (fieldRows.some((row) => row.siteId === target.siteId)) {
      throw new Error("Removed location still appears in technician field view.");
    }
  }

  const adminRows = await listAdminBinLocationRows();
  const removedRow = adminRows.find((row) => row.siteId === target.siteId);
  if (!removedRow || removedRow.statusLabel !== "Removed") {
    throw new Error("Admin list did not show removed status.");
  }

  console.log("Admin bin locations test passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
