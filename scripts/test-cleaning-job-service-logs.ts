/**
 * Verifies job service logs persist start/complete actions.
 * Run: npx tsx scripts/test-cleaning-job-service-logs.ts
 */
import { CleaningJobStatus, PrismaClient } from "@prisma/client";
import { createEmployeeAccessContext } from "../src/lib/operational-access";
import { resolveEmployeeJobAssignments } from "../src/lib/job-assignment-service";
import {
  completeCleaningJob,
  listJobServiceLogsForJob,
  startCleaningJob,
} from "../src/lib/cleaning-jobs-service";

const prisma = new PrismaClient();

async function main() {
  const teamMember = await prisma.employee.findFirst({
    where: { companyEmail: "team.member@prossanitation.com" },
  });
  const manager = await prisma.employee.findFirst({
    where: { companyEmail: "manager@prossanitation.com" },
  });

  if (!teamMember || !manager) {
    throw new Error("Test accounts missing. Run prisma db seed first.");
  }

  const job = await prisma.job.findFirst({
    where: { title: "Grocery Cleaning - Scarborough" },
  });

  if (!job) {
    throw new Error("Scarborough job not found.");
  }

  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: CleaningJobStatus.ASSIGNED,
      assignedEmployeeId: teamMember.id,
      assignedEmployeeName: `${teamMember.firstName} ${teamMember.lastName}`.trim(),
      assignedEmployeeEmail: teamMember.companyEmail,
      completedAt: null,
    },
  });

  await prisma.jobServiceLog.deleteMany({ where: { jobId: job.id } });

  const started = await startCleaningJob(job.id, teamMember);
  if (started.status !== CleaningJobStatus.IN_PROGRESS) {
    throw new Error(`Expected IN_PROGRESS after start, got ${started.status}`);
  }

  const afterStartLogs = await listJobServiceLogsForJob(job.id);
  if (afterStartLogs.length !== 1 || afterStartLogs[0]?.actionType !== "STARTED") {
    throw new Error("Expected one STARTED log after start.");
  }

  const completed = await completeCleaningJob(job.id, teamMember);
  if (completed.status !== CleaningJobStatus.COMPLETED || !completed.completedAt) {
    throw new Error("Expected COMPLETED with completedAt after complete.");
  }

  const afterCompleteLogs = await listJobServiceLogsForJob(job.id);
  if (afterCompleteLogs.length !== 2) {
    throw new Error(`Expected 2 logs after complete, got ${afterCompleteLogs.length}`);
  }

  const managerAssignments = await resolveEmployeeJobAssignments(manager);
  const managerCtx = createEmployeeAccessContext({
    accessLevel: manager.accessLevel,
    operationalGroup: manager.operationalGroup,
    assignments: managerAssignments,
  });

  const { canActorAccessCleaningJob } = await import("../src/lib/cleaning-jobs-service");
  const { getCleaningJobById } = await import("../src/lib/cleaning-jobs-service");
  const jobDto = await getCleaningJobById(job.id);
  if (!jobDto) {
    throw new Error("Job DTO missing.");
  }

  const managerCanView = await canActorAccessCleaningJob(manager, managerCtx, jobDto);
  if (!managerCanView) {
    throw new Error("Manager should be able to view job logs.");
  }

  const managerLogs = await listJobServiceLogsForJob(job.id);
  if (managerLogs.length !== 2) {
    throw new Error("Manager should see full log history.");
  }

  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: CleaningJobStatus.ASSIGNED,
      completedAt: null,
    },
  });

  console.log("Cleaning job service logs test OK:", {
    statuses: [started.status, completed.status],
    logActions: managerLogs.map((log) => log.actionType),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
