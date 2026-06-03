import type { PrismaClient } from "@prisma/client";

const SCARBOROUGH_SLUG = "scarborough-pennysaver-grocery";
const ALL_LOCATION_SLUGS = [
  "scarborough-pennysaver-grocery",
  "canaan-pennysaver-grocery",
  "carnbee-pennysaver-grocery",
  "carnbee-pennysaver-pharmacy",
  "pennysavers-mall",
];

type AssignmentSeed = {
  id: string;
  email: string;
  locationSlugs: string[];
  assignedRole: string;
};

const ASSIGNMENT_SEEDS: AssignmentSeed[] = [
  {
    id: "00000000-0000-4000-8000-000000000201",
    email: "team.member@prossanitation.com",
    locationSlugs: [SCARBOROUGH_SLUG],
    assignedRole: "Technician",
  },
  {
    id: "00000000-0000-4000-8000-000000000202",
    email: "supervisor@prossanitation.com",
    locationSlugs: [SCARBOROUGH_SLUG],
    assignedRole: "Supervisor",
  },
  {
    id: "00000000-0000-4000-8000-000000000203",
    email: "manager@prossanitation.com",
    locationSlugs: ALL_LOCATION_SLUGS,
    assignedRole: "Manager",
  },
  {
    id: "00000000-0000-4000-8000-000000000204",
    email: "admin@prossanitation.com",
    locationSlugs: ALL_LOCATION_SLUGS,
    assignedRole: "Admin",
  },
  {
    id: "00000000-0000-4000-8000-000000000205",
    email: "test.employee@prossanitation.com",
    locationSlugs: ALL_LOCATION_SLUGS,
    assignedRole: "Super Admin",
  },
];

export async function seedJobAssignments(prisma: PrismaClient): Promise<void> {
  const locations = await prisma.clientLocation.findMany({
    where: { slug: { in: ALL_LOCATION_SLUGS } },
    select: { id: true, slug: true, locationName: true },
  });

  const locationBySlug = new Map(
    locations.map((location) => [location.slug, location]),
  );

  let assignmentCounter = 0;

  for (const seed of ASSIGNMENT_SEEDS) {
    const employee = await prisma.employee.findFirst({
      where: { companyEmail: seed.email },
    });

    if (!employee) {
      console.warn(`Skipping job assignments for missing employee ${seed.email}`);
      continue;
    }

    const employeeName = `${employee.firstName} ${employee.lastName}`.trim();

    for (const slug of seed.locationSlugs) {
      const location = locationBySlug.get(slug);
      if (!location) {
        throw new Error(`Cleaning location not found for slug: ${slug}`);
      }

      assignmentCounter += 1;
      const assignmentId = `00000000-0000-4000-8000-${String(200 + assignmentCounter).padStart(12, "0")}`;

      await prisma.jobAssignment.upsert({
        where: {
          employeeId_clientLocationId: {
            employeeId: employee.id,
            clientLocationId: location.id,
          },
        },
        update: {
          employeeName,
          employeeEmail: employee.companyEmail,
          clientLocation: location.locationName,
          assignedRole: seed.assignedRole,
          assignedBy: "System Seed",
          isActive: true,
        },
        create: {
          id: assignmentId,
          employeeId: employee.id,
          employeeName,
          employeeEmail: employee.companyEmail,
          clientLocationId: location.id,
          clientLocation: location.locationName,
          assignedRole: seed.assignedRole,
          assignedBy: "System Seed",
        },
      });
    }
  }
}
