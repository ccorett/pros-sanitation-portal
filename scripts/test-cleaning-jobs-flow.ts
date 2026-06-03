/**
 * Verifies cleaning jobs visibility and completion workflow.
 * Run: npx tsx scripts/test-cleaning-jobs-flow.ts
 */
import { CleaningJobStatus, PrismaClient } from "@prisma/client";
import { createEmployeeAccessContext } from "../src/lib/operational-access";
import { resolveEmployeeJobAssignments } from "../src/lib/job-assignment-service";
import {
  completeCleaningJob,
  listCleaningJobsForActor,
} from "../src/lib/cleaning-jobs-service";

const prisma = new PrismaClient();

async function main() {
  const teamMember = await prisma.employee.findFirst({
    where: { companyEmail: "team.member@prossanitation.com" },
  });
  const manager = await prisma.employee.findFirst({
    where: { companyEmail: "manager@prossanitation.com" },
  });
  const binTech = await prisma.employee.findFirst({
    where: { companyEmail: "bin.tech@prossanitation.com" },
  });

  if (!teamMember || !manager || !binTech) {
    throw new Error("Test accounts missing. Run prisma db seed first.");
  }

  const scarboroughJob = await prisma.job.findFirst({
    where: { title: "Grocery Cleaning - Scarborough" },
  });

  if (!scarboroughJob?.assignedEmployeeId) {
    throw new Error("Scarborough job must be assigned to team.member.");
  }

  if (scarboroughJob.assignedEmployeeId !== teamMember.id) {
    throw new Error("Scarborough job is not assigned to team.member.");
  }

  const teamAssignments = await resolveEmployeeJobAssignments(teamMember);
  const teamCtx = createEmployeeAccessContext({
    accessLevel: teamMember.accessLevel,
    operationalGroup: teamMember.operationalGroup,
    assignments: teamAssignments,
  });
  const teamJobs = await listCleaningJobsForActor(teamMember, teamCtx);

  if (teamJobs.length !== 1 || teamJobs[0]?.id !== scarboroughJob.id) {
    throw new Error(
      `team.member expected only Scarborough job, got ${teamJobs.map((job) => job.title).join(", ")}`,
    );
  }

  const managerAssignments = await resolveEmployeeJobAssignments(manager);
  const managerCtx = createEmployeeAccessContext({
    accessLevel: manager.accessLevel,
    operationalGroup: manager.operationalGroup,
    assignments: managerAssignments,
  });
  const managerJobs = await listCleaningJobsForActor(manager, managerCtx);

  if (managerJobs.length !== 5) {
    throw new Error(`manager expected 5 jobs, got ${managerJobs.length}`);
  }

  const binAssignments = await resolveEmployeeJobAssignments(binTech);
  const binCtx = createEmployeeAccessContext({
    accessLevel: binTech.accessLevel,
    operationalGroup: binTech.operationalGroup,
    assignments: binAssignments,
  });
  const binJobs = await listCleaningJobsForActor(binTech, binCtx);

  if (binJobs.length !== 0) {
    throw new Error(`bin.tech expected 0 jobs, got ${binJobs.length}`);
  }

  await prisma.job.update({
    where: { id: scarboroughJob.id },
    data: { status: CleaningJobStatus.ASSIGNED, completedAt: null },
  });

  const { startCleaningJob } = await import("../src/lib/cleaning-jobs-service");
  await startCleaningJob(scarboroughJob.id, teamMember);
  const completed = await completeCleaningJob(scarboroughJob.id, teamMember);

  if (completed.status !== CleaningJobStatus.COMPLETED || !completed.completedAt) {
    throw new Error("Job completion did not persist.");
  }

  await prisma.job.update({
    where: { id: scarboroughJob.id },
    data: {
      status: CleaningJobStatus.ASSIGNED,
      completedAt: null,
    },
  });

  console.log("Cleaning jobs flow test OK:", {
    teamMemberJobs: teamJobs.map((job) => job.title),
    managerJobCount: managerJobs.length,
    completedStatus: completed.status,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
