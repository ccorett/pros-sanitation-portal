/**
 * End-to-end payslip request flow against Neon.
 * Run: npx tsx scripts/test-payslip-request-flow.ts
 */
import { PayslipRequestStatus } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import {
  createPayslipRequest,
  listPayslipRequestsForActor,
  reviewPayslipRequest,
} from "../src/lib/payslip-request-service";

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

  const created = await createPayslipRequest({
    payPeriod: "April 2026",
    notes: "Mortgage lender request",
    requester: teamMember,
  });

  console.log("Created:", created.id, created.statusLabel);

  const employeeView = await listPayslipRequestsForActor(teamMember);
  const own = employeeView.find((row) => row.id === created.id);
  if (!own || own.status !== PayslipRequestStatus.PENDING) {
    throw new Error("Employee should see pending request.");
  }

  const approved = await reviewPayslipRequest({
    requestId: created.id,
    status: "APPROVED",
    reviewer: admin,
  });

  if (approved.status !== PayslipRequestStatus.APPROVED) {
    throw new Error("Admin approval failed.");
  }

  const afterApproval = await listPayslipRequestsForActor(teamMember);
  const approvedRow = afterApproval.find((row) => row.id === created.id);
  if (!approvedRow || approvedRow.statusLabel !== "Approved") {
    throw new Error("Employee should see approved status.");
  }

  console.log("Payslip request flow OK:", approvedRow.statusLabel);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
