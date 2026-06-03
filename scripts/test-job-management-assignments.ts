/**
 * Verifies Neon job assignments control /jobs location visibility.
 * Run: npx tsx scripts/test-job-management-assignments.ts
 */
import { PrismaClient } from "@prisma/client";
import { createEmployeeAccessContext } from "../src/lib/operational-access";
import { resolveEmployeeJobAssignments } from "../src/lib/job-assignment-service";
import { filterCleaningLocationsForContext } from "../src/lib/job-assignment-service";
import { listCleaningClientLocations } from "../src/lib/job-management-service";

const prisma = new PrismaClient();

async function employeeByEmail(email: string) {
  const employee = await prisma.employee.findFirst({
    where: { companyEmail: email },
  });
  if (!employee) {
    throw new Error(`Employee not found: ${email}`);
  }
  return employee;
}

async function visibleSlugs(email: string): Promise<string[]> {
  const employee = await employeeByEmail(email);
  const assignments = await resolveEmployeeJobAssignments(employee);
  const ctx = createEmployeeAccessContext({
    accessLevel: employee.accessLevel,
    operationalGroup: employee.operationalGroup,
    assignments,
  });
  const locations = await listCleaningClientLocations();
  return filterCleaningLocationsForContext(ctx, locations).map(
    (location) => location.slug,
  );
}

async function main() {
  const teamMember = await visibleSlugs("team.member@prossanitation.com");
  if (teamMember.length !== 1 || teamMember[0] !== "scarborough-pennysaver-grocery") {
    throw new Error(`team.member expected Scarborough only, got ${teamMember.join(", ")}`);
  }

  const supervisor = await visibleSlugs("supervisor@prossanitation.com");
  if (supervisor.length !== 1 || supervisor[0] !== "scarborough-pennysaver-grocery") {
    throw new Error(`supervisor expected Scarborough only, got ${supervisor.join(", ")}`);
  }

  const manager = await visibleSlugs("manager@prossanitation.com");
  if (manager.length !== 5) {
    throw new Error(`manager expected 5 locations, got ${manager.length}`);
  }

  const binTech = await visibleSlugs("bin.tech@prossanitation.com");
  if (binTech.length !== 0) {
    throw new Error(`bin.tech expected 0 cleaning locations, got ${binTech.length}`);
  }

  console.log("Job management assignments test OK:", {
    teamMember,
    supervisor,
    managerCount: manager.length,
    binTechCount: binTech.length,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
