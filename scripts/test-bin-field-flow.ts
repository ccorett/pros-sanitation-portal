/**
 * End-to-end bin field workflow against Neon.
 * Run: npx tsx scripts/test-bin-field-flow.ts
 */
import { BinServiceJobStatus } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import {
  completeBinServiceJob,
  listTechnicianBinJobs,
} from "../src/lib/bin-service/service";
import { filterDueOverdueSites } from "../src/lib/bin-service/field-filters";
import { listBinFieldSitesForActor } from "../src/lib/bin-service/field-service";
import { getRotationStatus } from "../src/lib/bin-service/status";

const prisma = new PrismaClient();

async function main() {
  const binTech = await prisma.employee.findFirst({
    where: { companyEmail: "bin.tech@prossanitation.com" },
  });
  const binSupervisor = await prisma.employee.findFirst({
    where: { companyEmail: "bin.supervisor@prossanitation.com" },
  });
  const admin = await prisma.employee.findFirst({
    where: { companyEmail: "admin@prossanitation.com" },
  });

  if (!binTech || !binSupervisor || !admin) {
    throw new Error("Bin test accounts missing. Run prisma db seed first.");
  }

  const jobsBefore = await listTechnicianBinJobs(binTech);
  if (jobsBefore.length === 0) {
    throw new Error("No open bin jobs for bin tech — check seed assignments.");
  }

  const job = jobsBefore[0];
  const completed = await completeBinServiceJob({
    jobId: job.id,
    technicianId: binTech.id,
    regularBinsServiced: job.setup.expectedRegularBins,
    newBinsServiced: job.setup.expectedNewBins,
    linersUsed:
      job.setup.expectedRegularBins + job.setup.expectedNewBins,
    serviceNotes: "Field flow test completion",
  });

  if (!completed.lastCompletedServiceDate || !completed.nextServiceDate) {
    throw new Error("Setup dates were not updated after completion.");
  }

  const refreshedJob = await prisma.binServiceJob.findUnique({
    where: { id: job.id },
  });
  if (refreshedJob?.status !== BinServiceJobStatus.COMPLETED) {
    throw new Error("Job status should be COMPLETED in Neon.");
  }

  const supervisorSites = await listBinFieldSitesForActor(binSupervisor);
  const adminSites = await listBinFieldSitesForActor(admin);
  const completedSite = supervisorSites.find((s) => s.siteId === job.siteId);

  if (!completedSite) {
    throw new Error("Supervisor should see updated site row.");
  }

  if (completedSite.lastServiceDate !== completed.lastCompletedServiceDate.toISOString().slice(0, 10)) {
    throw new Error("Supervisor last service date mismatch.");
  }

  const rotationAfterComplete = getRotationStatus({
    active: true,
    lastCompletedServiceDate: completed.lastCompletedServiceDate,
    nextServiceDate: completed.nextServiceDate,
    openJobStatus: null,
  });

  if (rotationAfterComplete.color !== "green") {
    throw new Error(
      `Expected green status after service (0–13 days), got ${rotationAfterComplete.color}`,
    );
  }

  const logCount = await prisma.binServiceLog.count({
    where: { jobId: job.id },
  });
  if (logCount < 1) {
    throw new Error("BinServiceLog should exist after completion.");
  }

  const adminMatch = adminSites.find((s) => s.siteId === job.siteId);
  if (!adminMatch?.lastServiceDate) {
    throw new Error("Admin should see updated last service date.");
  }

  const dueRows = filterDueOverdueSites(await listBinFieldSitesForActor(binTech));
  console.log(
    "Bin field flow OK:",
    `completed job ${job.id.slice(0, 8)}…`,
    `next service ${completed.nextServiceDate.toISOString().slice(0, 10)}`,
    `due/overdue remaining for tech: ${dueRows.length}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
