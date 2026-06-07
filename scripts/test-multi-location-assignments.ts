/**
 * Verifies multi-location assignments affect job visibility and nav rules.
 * Run: npx tsx scripts/test-multi-location-assignments.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  getEmployeeLocationSummary,
  setEmployeeLocationAssignments,
} from "../src/lib/employee-location-assignment-service";
import { listCleaningJobsForActor } from "../src/lib/cleaning-jobs-service";
import {
  getVisibleNavItems,
  toEmployeeAccessContext,
} from "../src/lib/portal-route-access";
import { resolveAssignedCleaningLocationIds } from "../src/lib/job-assignment-service";

const prisma = new PrismaClient();

async function loadEmployee(email: string) {
  const employee = await prisma.employee.findFirst({
    where: { companyEmail: email },
  });
  if (!employee) {
    throw new Error(`Employee not found: ${email}`);
  }
  return employee;
}

async function main() {
  const teamMember = await loadEmployee("team.member@prossanitation.com");
  const supervisor = await loadEmployee("supervisor@prossanitation.com");

  await setEmployeeLocationAssignments(teamMember.id, {
    primaryLocation: "Scarborough Pennysaver Grocery",
    additionalLocations: ["Canaan Pennysaver Grocery"],
    assignedBy: "Multi-location test",
  });

  const teamSummary = await getEmployeeLocationSummary(teamMember.id);
  if (teamSummary.allLocations.length !== 2) {
    throw new Error("Expected team member to have two assigned locations.");
  }

  const teamLocationIds = await resolveAssignedCleaningLocationIds(teamMember);
  if (teamLocationIds.length < 2) {
    throw new Error("Expected team member cleaning visibility for two locations.");
  }

  const teamJobs = await listCleaningJobsForActor(
    teamMember,
    await toEmployeeAccessContext(teamMember),
  );
  const teamLocationNames = new Set(teamJobs.map((job) => job.clientLocation));
  if (
    !teamLocationNames.has("Scarborough Pennysaver Grocery") ||
    !teamLocationNames.has("Canaan Pennysaver Grocery")
  ) {
    throw new Error("Team member should see jobs for both assigned locations.");
  }

  await setEmployeeLocationAssignments(supervisor.id, {
    primaryLocation: "Scarborough Pennysaver Grocery",
    additionalLocations: ["Carnbee Pennysaver Grocery"],
    assignedBy: "Multi-location test",
  });

  const supervisorJobs = await listCleaningJobsForActor(
    supervisor,
    await toEmployeeAccessContext(supervisor),
  );
  const supervisorLocations = new Set(
    supervisorJobs.map((job) => job.clientLocation),
  );
  if (
    !supervisorLocations.has("Scarborough Pennysaver Grocery") ||
    !supervisorLocations.has("Carnbee Pennysaver Grocery")
  ) {
    throw new Error("Supervisor should see jobs for both assigned locations.");
  }

  const coordinator = await loadEmployee("delivery.coordinator@prossanitation.com");
  const navLabels = getVisibleNavItems(
    await toEmployeeAccessContext(coordinator),
  ).map((item) => item.label);

  if (navLabels.includes("Delivery")) {
    throw new Error("Delivery should not appear in the top navigation bar.");
  }

  await setEmployeeLocationAssignments(teamMember.id, {
    primaryLocation: "Scarborough Pennysaver Grocery",
    additionalLocations: [],
    assignedBy: "Multi-location test cleanup",
  });

  await setEmployeeLocationAssignments(supervisor.id, {
    primaryLocation: "Scarborough Pennysaver Grocery",
    additionalLocations: [],
    assignedBy: "Multi-location test cleanup",
  });

  console.log("Multi-location assignment checks passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
