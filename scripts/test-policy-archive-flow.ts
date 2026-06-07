/**
 * Verifies policy add, staff visibility, and archive behavior.
 * Run: npx tsx scripts/test-policy-archive-flow.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  archivePolicy,
  createPolicy,
  listPoliciesForAdmin,
  listPoliciesForEmployee,
} from "../src/lib/policy-service";

const prisma = new PrismaClient();

async function main() {
  const employee = await prisma.employee.findFirst({
    where: { companyEmail: "team.member@prossanitation.com" },
  });
  if (!employee) {
    throw new Error("Test employee missing. Run prisma db seed first.");
  }

  const created = await createPolicy({
    title: "Hub Policy Test",
    body: "Temporary policy for archive test.",
    category: "Operations",
    status: "ACTIVE",
    effectiveDate: "2026-06-01",
  });

  const staffBefore = await listPoliciesForEmployee(employee.id);
  if (!staffBefore.some((policy) => policy.id === created.id)) {
    throw new Error("Staff should see active policy.");
  }

  await archivePolicy(created.id);

  const staffAfter = await listPoliciesForEmployee(employee.id);
  if (staffAfter.some((policy) => policy.id === created.id)) {
    throw new Error("Staff should not see archived policy.");
  }

  const adminList = await listPoliciesForAdmin();
  const archived = adminList.find((policy) => policy.id === created.id);
  if (!archived || archived.status !== "ARCHIVED") {
    throw new Error("Admin should still see archived policy.");
  }

  await prisma.policy.delete({ where: { id: created.id } });
  console.log("Policy add/archive/staff-filter test passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
