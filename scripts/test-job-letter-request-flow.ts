/**
 * End-to-end job letter request flow against Neon.
 * Run: npx tsx scripts/test-job-letter-request-flow.ts
 */
import { JobLetterRequestStatus } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import {
  createJobLetterRequest,
  listJobLetterRequestsForActor,
  reviewJobLetterRequest,
} from "../src/lib/job-letter-request-service";

const prisma = new PrismaClient();

async function main() {
  const teamMember = await prisma.employee.findFirst({
    where: { companyEmail: "team.member@prossanitation.com" },
  });
  const admin = await prisma.employee.findFirst({
    where: { companyEmail: "admin@prossanitation.com" },
  });

  if (!teamMember || !admin) {
    throw new Error("Test accounts missing. Run prisma db seed first.");
  }

  const created = await createJobLetterRequest({
    letterType: "Salary Letter",
    notes: "Mortgage application",
    requester: teamMember,
  });

  console.log("Created:", created.id, created.statusLabel);

  const employeeView = await listJobLetterRequestsForActor(teamMember);
  const own = employeeView.find((row) => row.id === created.id);
  if (!own || own.status !== JobLetterRequestStatus.PENDING) {
    throw new Error("Employee should see pending request.");
  }

  const approved = await reviewJobLetterRequest({
    requestId: created.id,
    status: "APPROVED",
    reviewer: admin,
  });

  if (approved.status !== JobLetterRequestStatus.APPROVED) {
    throw new Error("Admin approval failed.");
  }

  const afterApproval = await listJobLetterRequestsForActor(teamMember);
  const approvedRow = afterApproval.find((row) => row.id === created.id);
  if (!approvedRow || approvedRow.statusLabel !== "Approved") {
    throw new Error("Employee should see approved status.");
  }

  console.log("Job letter flow OK:", approvedRow.statusLabel);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
