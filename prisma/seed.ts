import {
  AccountStatus,
  ClientLocationStatus,
  EmploymentStatus,
  JobStatus,
  NoticeCategory,
  PrismaClient,
  ServiceType,
} from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_EMAIL = "jordan.mitchell@prossanitation.com";

async function main() {
  const existingUser = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
  });

  let userId = existingUser?.id;

  if (!userId) {
    console.log(
      "No demo auth user found. Run employee signup or create a user before seeding employee profile.",
    );
    return;
  }

  const employee = await prisma.employee.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      employeeId: "PS-EMP-001",
      firstName: "Jordan",
      lastName: "Mitchell",
      companyEmail: DEMO_EMAIL,
      phoneNumber: "+1-868-555-0142",
      department: "Field Operations",
      jobTitle: "Sanitation Technician",
      supervisorName: "Alex Rivera",
      employmentStatus: EmploymentStatus.ACTIVE,
      accountStatus: AccountStatus.ACTIVE,
    },
  });

  const clientLocation = await prisma.clientLocation.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      clientName: "Harbourview Commercial Plaza",
      siteName: "Loading Dock & Waste Enclosure",
      address: "14 Industrial Park Road, Port of Spain",
      contactPerson: "M. Singh",
      contactNumber: "+1-868-555-0198",
      status: ClientLocationStatus.ACTIVE,
    },
  });

  await prisma.job.upsert({
    where: { jobCode: "JOB-2026-0142" },
    update: {},
    create: {
      jobCode: "JOB-2026-0142",
      clientLocationId: clientLocation.id,
      assignedEmployeeId: employee.id,
      serviceType: ServiceType.SANITARY_BIN_SERVICE,
      scheduledDate: new Date("2026-05-22"),
      instructions:
        "Service all sanitary bins at loading dock. Confirm chemical PPE before mixing degreaser.",
      status: JobStatus.NOT_STARTED,
    },
  });

  await prisma.job.upsert({
    where: { jobCode: "JOB-2026-0143" },
    update: {},
    create: {
      jobCode: "JOB-2026-0143",
      clientLocationId: clientLocation.id,
      assignedEmployeeId: employee.id,
      serviceType: ServiceType.GROCERY_CLEANING,
      scheduledDate: new Date("2026-05-23"),
      instructions:
        "Night shift grocery aisle sanitation. Coordinate with store manager before floor treatment.",
      status: JobStatus.NOT_STARTED,
    },
  });

  await prisma.internalNotice.upsert({
    where: { id: "00000000-0000-4000-8000-000000000010" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000010",
      title: "Chemical Handling Reminder",
      body: "Updated SDS sheets for degreaser concentrate are available. Full face shield required for bulk mixing at depot.",
      category: NoticeCategory.SAFETY,
      publishedAt: new Date("2026-05-20T05:00:00Z"),
      expiresAt: new Date("2026-06-20T23:59:59Z"),
    },
  });

  await prisma.policy.upsert({
    where: { id: "00000000-0000-4000-8000-000000000020" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000020",
      title: "Field PPE & Site Safety Standard",
      body: "All field staff must wear hi-vis vest, safety boots, and gloves on active client sites. Report incidents within 2 hours to your supervisor.",
      version: "1.2",
      effectiveDate: new Date("2026-01-15"),
    },
  });

  console.log("Seed complete: platform records linked to existing auth user when present.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
