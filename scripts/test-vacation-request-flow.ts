/**
 * End-to-end vacation request flow against Neon (no browser).
 * Run: npx tsx scripts/test-vacation-request-flow.ts
 */
import { PrismaClient, VacationFinalStatus } from "@prisma/client";
import {
  createVacationRequest,
  listVacationRequestsForActor,
  managerReviewVacationRequest,
  seedDemoVacationRequest,
  supervisorReviewVacationRequest,
} from "../src/lib/vacation-request-service";

const prisma = new PrismaClient();

async function main() {
  const teamMember = await prisma.employee.findFirst({
    where: { companyEmail: "team.member@prossanitation.com" },
  });
  const supervisor = await prisma.employee.findFirst({
    where: { companyEmail: "supervisor@prossanitation.com" },
  });
  const manager = await prisma.employee.findFirst({
    where: { companyEmail: "manager@prossanitation.com" },
  });

  if (!teamMember || !supervisor || !manager) {
    throw new Error("Test accounts missing. Run prisma db seed first.");
  }

  await seedDemoVacationRequest(teamMember);

  const created = await createVacationRequest({
    startDate: "2026-07-01",
    endDate: "2026-07-03",
    reason: "Scripted flow test",
    requester: teamMember,
  });

  console.log("Created:", created.id, created.finalStatusLabel);

  const supervisorQueue = (
    await listVacationRequestsForActor(supervisor)
  ).filter((r) => r.finalStatus === VacationFinalStatus.PENDING_SUPERVISOR_REVIEW);

  const target =
    supervisorQueue.find((r) => r.id === created.id) ??
    supervisorQueue.find((r) => r.reason === "Scripted flow test");

  if (!target) {
    throw new Error("Supervisor cannot see pending request.");
  }

  const afterSupervisor = await supervisorReviewVacationRequest({
    requestId: target.id,
    action: "AWARE",
    supervisorNotes: "Test aware",
    supervisor: supervisor,
  });

  console.log("After supervisor:", afterSupervisor.finalStatusLabel);

  const managerQueue = (
    await listVacationRequestsForActor(manager)
  ).filter((r) => r.finalStatus === VacationFinalStatus.PENDING_MANAGER_REVIEW);

  const forManager = managerQueue.find((r) => r.id === target.id);
  if (!forManager) {
    throw new Error("Manager cannot see request after supervisor review.");
  }

  const afterManager = await managerReviewVacationRequest({
    requestId: forManager.id,
    action: "APPROVED",
    managerNotes: "Approved in script",
    reviewer: manager,
  });

  console.log("After manager:", afterManager.finalStatusLabel);

  const employeeView = await listVacationRequestsForActor(teamMember);
  const approved = employeeView.find((r) => r.id === target.id);
  if (!approved || approved.finalStatus !== VacationFinalStatus.APPROVED) {
    throw new Error("Employee does not see approved status.");
  }

  console.log("Vacation flow OK:", approved.finalStatusLabel);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
