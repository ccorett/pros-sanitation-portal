import { config } from "dotenv";
import { resolve } from "path";
import { AccountStatus, AccessLevel } from "@prisma/client";
import {
  canRestoreRemovedAccount,
  getRemovedAccountPurgeSkipReason,
  scheduledPurgeDateFrom,
} from "../src/lib/account-retention";
import {
  getAdminAccountsSummary,
  listAdminAccounts,
} from "../src/lib/admin-accounts-service";
import { canPerformAccountAction } from "../src/lib/admin-account-permissions";
import { prisma } from "../src/lib/prisma";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function loadEmployee(email: string) {
  const employee = await prisma.employee.findUnique({
    where: { companyEmail: email },
  });
  if (!employee) {
    throw new Error(`Missing employee: ${email}`);
  }
  return employee;
}

async function main() {
  const superAdmin = await loadEmployee("test.employee@prossanitation.com");
  const teamMember = await loadEmployee("team.member@prossanitation.com");

  const hiddenByDefault = await listAdminAccounts();
  const includesRemoved = await listAdminAccounts({ includeRemoved: true });
  const summary = await getAdminAccountsSummary();

  const teamVisibleByDefault = hiddenByDefault.some((row) => row.id === teamMember.id);

  if (!teamVisibleByDefault) {
    throw new Error("Expected active team member in default account list.");
  }

  const removedBefore = includesRemoved.filter(
    (row) => row.accountStatus === AccountStatus.REMOVED,
  ).length;

  console.log(
    JSON.stringify(
      {
        defaultCount: hiddenByDefault.length,
        includeRemovedCount: includesRemoved.length,
        removedBefore,
        summary,
      },
      null,
      2,
    ),
  );

  const canDelete = canPerformAccountAction(
    superAdmin.accessLevel,
    teamMember.accessLevel,
    teamMember.accountStatus,
    "deleteAccount",
  );

  if (!canDelete) {
    throw new Error("Super admin should be able to delete team member in test setup.");
  }

  const superAdminSkip = await getRemovedAccountPurgeSkipReason(superAdmin);
  if (superAdminSkip !== "Super Admin accounts are never purged.") {
    throw new Error("Super Admin purge protection missing.");
  }

  const purgeAt = scheduledPurgeDateFrom(new Date());
  const daysDiff = Math.round(
    (purgeAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (daysDiff !== 90) {
    throw new Error(`Expected 90-day retention window, got ${daysDiff} days.`);
  }

  const futurePurgeAt = scheduledPurgeDateFrom(new Date());
  if (
    !canRestoreRemovedAccount({
      accountStatus: AccountStatus.REMOVED,
      scheduledPurgeAt: futurePurgeAt,
    })
  ) {
    throw new Error("Removed account with future purge date should be restorable.");
  }

  console.log("Account retention policy checks passed (read-only verification).");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
