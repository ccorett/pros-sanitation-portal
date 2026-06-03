import {
  CleaningJobStatus,
  JobPriority,
  type PrismaClient,
} from "@prisma/client";

type CleaningJobSeed = {
  id: string;
  title: string;
  locationSlug: string;
  serviceType: string;
  scheduledDate: string;
  dueDate: string;
  assignToEmail?: string;
};

const CLEANING_JOB_SEEDS: CleaningJobSeed[] = [
  {
    id: "00000000-0000-4000-8000-000000000301",
    title: "Grocery Cleaning - Scarborough",
    locationSlug: "scarborough-pennysaver-grocery",
    serviceType: "Grocery Cleaning",
    scheduledDate: "2026-06-10",
    dueDate: "2026-06-12",
    assignToEmail: "team.member@prossanitation.com",
  },
  {
    id: "00000000-0000-4000-8000-000000000302",
    title: "Grocery Cleaning - Canaan",
    locationSlug: "canaan-pennysaver-grocery",
    serviceType: "Grocery Cleaning",
    scheduledDate: "2026-06-11",
    dueDate: "2026-06-13",
  },
  {
    id: "00000000-0000-4000-8000-000000000303",
    title: "Grocery Cleaning - Carnbee",
    locationSlug: "carnbee-pennysaver-grocery",
    serviceType: "Grocery Cleaning",
    scheduledDate: "2026-06-12",
    dueDate: "2026-06-14",
  },
  {
    id: "00000000-0000-4000-8000-000000000304",
    title: "Pharmacy Cleaning - Carnbee",
    locationSlug: "carnbee-pennysaver-pharmacy",
    serviceType: "Pharmacy Cleaning",
    scheduledDate: "2026-06-13",
    dueDate: "2026-06-15",
  },
  {
    id: "00000000-0000-4000-8000-000000000305",
    title: "Janitorial Service - Pennysavers Mall",
    locationSlug: "pennysavers-mall",
    serviceType: "Janitorial Service",
    scheduledDate: "2026-06-14",
    dueDate: "2026-06-16",
  },
];

export async function seedCleaningJobs(prisma: PrismaClient): Promise<void> {
  for (const seed of CLEANING_JOB_SEEDS) {
    const location = await prisma.clientLocation.findFirst({
      where: { slug: seed.locationSlug },
    });

    if (!location) {
      throw new Error(`Cleaning location not found for slug: ${seed.locationSlug}`);
    }

    let assignedEmployeeId: string | null = null;
    let assignedEmployeeName: string | null = null;
    let assignedEmployeeEmail: string | null = null;
    let status: CleaningJobStatus = CleaningJobStatus.PENDING;

    if (seed.assignToEmail) {
      const employee = await prisma.employee.findFirst({
        where: { companyEmail: seed.assignToEmail },
      });

      if (employee) {
        assignedEmployeeId = employee.id;
        assignedEmployeeName = `${employee.firstName} ${employee.lastName}`.trim();
        assignedEmployeeEmail = employee.companyEmail;
        status = CleaningJobStatus.ASSIGNED;
      }
    }

    await prisma.job.upsert({
      where: { id: seed.id },
      update: {
        title: seed.title,
        clientLocationId: location.id,
        clientLocation: location.locationName,
        serviceType: seed.serviceType,
        assignedEmployeeId,
        assignedEmployeeName,
        assignedEmployeeEmail,
        assignedBy: "System Seed",
        scheduledDate: new Date(seed.scheduledDate),
        dueDate: new Date(seed.dueDate),
        priority: JobPriority.NORMAL,
        status,
        notes: null,
        completedAt: null,
      },
      create: {
        id: seed.id,
        title: seed.title,
        clientLocationId: location.id,
        clientLocation: location.locationName,
        serviceType: seed.serviceType,
        assignedEmployeeId,
        assignedEmployeeName,
        assignedEmployeeEmail,
        assignedBy: "System Seed",
        scheduledDate: new Date(seed.scheduledDate),
        dueDate: new Date(seed.dueDate),
        priority: JobPriority.NORMAL,
        status,
      },
    });
  }
}
