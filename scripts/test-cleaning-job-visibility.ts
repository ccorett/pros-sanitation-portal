import { config } from "dotenv";
import { resolve } from "path";
import {
  canActorAccessCleaningJob,
  listCleaningJobsForActor,
} from "../src/lib/cleaning-jobs-service";
import { canAccessGeneralJobs } from "../src/lib/job-assignment-access";
import { listCleaningClientLocationsForContext } from "../src/lib/job-management-service";
import {
  canAccessPathname,
  toEmployeeAccessContext,
} from "../src/lib/portal-route-access";
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

async function snapshot(email: string) {
  const employee = await loadEmployee(email);
  const ctx = await toEmployeeAccessContext(employee);
  const [jobs, locations] = await Promise.all([
    listCleaningJobsForActor(employee, ctx),
    listCleaningClientLocationsForContext(ctx),
  ]);

  return {
    email,
    jobsAccess: canAccessGeneralJobs(ctx),
    pathJobs: canAccessPathname(ctx, "/jobs"),
    jobTitles: jobs.map((job) => job.title),
    locationNames: locations.map((location) => location.locationName),
    assignments: ctx.assignments.assignedLocationIds,
  };
}

async function main() {
  const teamMember = await loadEmployee("team.member@prossanitation.com");
  const supervisor = await loadEmployee("supervisor@prossanitation.com");
  const manager = await loadEmployee("manager@prossanitation.com");
  const binTech = await loadEmployee("bin.tech@prossanitation.com");

  const scarboroughLocation = await prisma.clientLocation.findFirst({
    where: { slug: "scarborough-pennysaver-grocery" },
  });
  const canaanJob = await prisma.job.findFirst({
    where: { title: "Grocery Cleaning - Canaan" },
  });

  if (!scarboroughLocation || !canaanJob) {
    throw new Error("Seed cleaning jobs/locations missing.");
  }

  const extraScarboroughJobId = "00000000-0000-4000-8000-000000000399";
  await prisma.job.upsert({
    where: { id: extraScarboroughJobId },
    update: {
      title: "Grocery Cleaning - Scarborough (Unassigned)",
      clientLocationId: scarboroughLocation.id,
      clientLocation: scarboroughLocation.locationName,
      serviceType: "Grocery Cleaning",
      assignedEmployeeId: null,
      assignedEmployeeName: null,
      assignedEmployeeEmail: null,
      assignedBy: "Visibility Test",
      scheduledDate: new Date("2026-06-15"),
      dueDate: new Date("2026-06-17"),
      status: "PENDING",
    },
    create: {
      id: extraScarboroughJobId,
      title: "Grocery Cleaning - Scarborough (Unassigned)",
      clientLocationId: scarboroughLocation.id,
      clientLocation: scarboroughLocation.locationName,
      serviceType: "Grocery Cleaning",
      assignedEmployeeId: null,
      assignedEmployeeName: null,
      assignedEmployeeEmail: null,
      assignedBy: "Visibility Test",
      scheduledDate: new Date("2026-06-15"),
      dueDate: new Date("2026-06-17"),
      status: "PENDING",
    },
  });

  const [
    teamSnapshot,
    supervisorSnapshot,
    managerSnapshot,
    binTechSnapshot,
  ] = await Promise.all([
    snapshot("team.member@prossanitation.com"),
    snapshot("supervisor@prossanitation.com"),
    snapshot("manager@prossanitation.com"),
    snapshot("bin.tech@prossanitation.com"),
  ]);

  const teamCtx = await toEmployeeAccessContext(teamMember);
  const canAccessCanaan = await canActorAccessCleaningJob(
    teamMember,
    teamCtx,
    {
      ...(await listCleaningJobsForActor(manager, await toEmployeeAccessContext(manager))).find(
        (job) => job.id === canaanJob.id,
      )!,
    },
  );

  const teamMemberOk =
    teamSnapshot.locationNames.length === 1 &&
    teamSnapshot.locationNames[0] === "Scarborough Pennysaver Grocery" &&
    teamSnapshot.jobTitles.length === 2 &&
    teamSnapshot.jobTitles.every((title) => title.includes("Scarborough")) &&
    !teamSnapshot.jobTitles.some((title) => title.includes("Canaan"));

  const supervisorOk =
    supervisorSnapshot.locationNames.length === 1 &&
    supervisorSnapshot.locationNames[0] === "Scarborough Pennysaver Grocery" &&
    supervisorSnapshot.jobTitles.length === 2 &&
    supervisorSnapshot.jobTitles.every((title) => title.includes("Scarborough"));

  const managerOk =
    managerSnapshot.locationNames.length === 5 &&
    managerSnapshot.jobTitles.length === 6;

  const binTechOk =
    binTechSnapshot.jobTitles.length === 0 &&
    binTechSnapshot.locationNames.length === 0 &&
    !binTechSnapshot.jobsAccess;

  const unauthorizedBlocked = canAccessCanaan === false;

  console.log(
    JSON.stringify(
      {
        teamMember: { ...teamSnapshot, ok: teamMemberOk },
        supervisor: { ...supervisorSnapshot, ok: supervisorOk },
        manager: { ...managerSnapshot, ok: managerOk },
        binTech: { ...binTechSnapshot, ok: binTechOk },
        unauthorizedBlocked,
      },
      null,
      2,
    ),
  );

  await prisma.job.deleteMany({ where: { id: extraScarboroughJobId } });

  if (
    !teamMemberOk ||
    !supervisorOk ||
    !managerOk ||
    !binTechOk ||
    !unauthorizedBlocked
  ) {
    throw new Error("Cleaning job visibility checks failed.");
  }

  console.log("Cleaning job visibility checks passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
