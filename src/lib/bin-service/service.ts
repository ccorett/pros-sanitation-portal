import {
  BinServiceJobStatus,
  type BinServiceSetup,
  type Employee,
  type Prisma,
} from "@prisma/client";
import {
  computeInitialNextServiceDate,
  computeNextServiceDateAfterCompletion,
  startOfUtcDay,
} from "@/lib/bin-service/schedule";
import {
  employeeCanAccessBinSite,
  getEmployeeBinLocationNames,
  resolveTechnicianIdForBinSite,
  siteHasBinRouteCoverage,
} from "@/lib/bin-service/location-access";
import { getRotationStatus } from "@/lib/bin-service/status";
import { prisma } from "@/lib/prisma";

const OPEN_JOB_STATUSES: BinServiceJobStatus[] = [
  BinServiceJobStatus.SCHEDULED,
  BinServiceJobStatus.IN_PROGRESS,
  BinServiceJobStatus.CANNOT_ACCESS,
  BinServiceJobStatus.ISSUE_REPORTED,
];

export const binSiteInclude = {
  client: true,
  setup: {
    include: {
      assignedTechnician: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
        },
      },
    },
  },
  jobs: {
    where: {
      status: { in: OPEN_JOB_STATUSES },
    },
    orderBy: { scheduledDate: "desc" },
    take: 1,
  },
} satisfies Prisma.BinServiceSiteInclude;

export const binJobInclude = {
  site: { include: { client: true } },
  setup: true,
  assignedTechnician: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeId: true,
    },
  },
} satisfies Prisma.BinServiceJobInclude;

export type BinSiteWithRelations = Prisma.BinServiceSiteGetPayload<{
  include: typeof binSiteInclude;
}>;

export type BinJobWithRelations = Prisma.BinServiceJobGetPayload<{
  include: typeof binJobInclude;
}>;

export async function listBinServiceSites() {
  const sites = await prisma.binServiceSite.findMany({
    include: binSiteInclude,
    orderBy: [{ client: { name: "asc" } }, { name: "asc" }],
  });

  await Promise.all(
    sites
      .filter((site) => site.setup?.active && !site.setup.removedAt)
      .map(async (site) => {
        const covered = await siteHasBinRouteCoverage({
          siteName: site.name,
          setupAssignedTechnicianId: site.setup?.assignedTechnicianId,
        });
        if (covered && site.setup) {
          await ensureOpenJobForSetup(site.setup, site.name);
        }
      }),
  );

  return prisma.binServiceSite.findMany({
    include: binSiteInclude,
    orderBy: [{ client: { name: "asc" } }, { name: "asc" }],
  });
}

export async function getBinServiceSite(siteId: string) {
  const site = await prisma.binServiceSite.findUnique({
    where: { id: siteId },
    include: binSiteInclude,
  });

  if (site?.setup?.active && !site.setup.removedAt) {
    const covered = await siteHasBinRouteCoverage({
      siteName: site.name,
      setupAssignedTechnicianId: site.setup.assignedTechnicianId,
    });
    if (covered) {
      await ensureOpenJobForSetup(site.setup, site.name);
    }
  }

  return prisma.binServiceSite.findUnique({
    where: { id: siteId },
    include: binSiteInclude,
  });
}

export async function ensureOpenJobForSetup(
  setup: BinServiceSetup,
  siteName?: string,
) {
  if (!setup.active || setup.removedAt) {
    return null;
  }

  const resolvedSiteName =
    siteName ??
    (
      await prisma.binServiceSite.findUnique({
        where: { id: setup.siteId },
        select: { name: true },
      })
    )?.name;

  if (!resolvedSiteName) {
    return null;
  }

  const technicianId = await resolveTechnicianIdForBinSite(
    resolvedSiteName,
    setup.assignedTechnicianId,
  );

  if (!technicianId) {
    return null;
  }

  const existingOpen = await prisma.binServiceJob.findFirst({
    where: {
      setupId: setup.id,
      status: { in: OPEN_JOB_STATUSES },
    },
    orderBy: { scheduledDate: "asc" },
  });

  if (existingOpen) {
    return existingOpen;
  }

  const scheduledDate =
    setup.nextServiceDate ??
    computeInitialNextServiceDate(setup.serviceDay, setup.weekPattern);

  return prisma.binServiceJob.create({
    data: {
      setupId: setup.id,
      siteId: setup.siteId,
      assignedTechnicianId: technicianId,
      scheduledDate,
      status: BinServiceJobStatus.SCHEDULED,
    },
  });
}

export async function listTechnicianBinJobs(
  employee: Pick<Employee, "id" | "locationAssignment">,
) {
  const employeeLocations = await getEmployeeBinLocationNames(employee);

  const setups = await prisma.binServiceSetup.findMany({
    where: {
      active: true,
      removedAt: null,
    },
    include: {
      site: {
        select: { name: true },
      },
    },
  });

  const accessibleSetups = setups.filter((setup) =>
    employeeCanAccessBinSite({
      employeeId: employee.id,
      employeeLocations,
      siteName: setup.site.name,
      setupAssignedTechnicianId: setup.assignedTechnicianId,
    }),
  );

  await Promise.all(
    accessibleSetups.map((setup) => ensureOpenJobForSetup(setup, setup.site.name)),
  );

  const accessibleSiteIds = accessibleSetups.map((setup) => setup.siteId);
  if (accessibleSiteIds.length === 0) {
    return [];
  }

  const today = startOfUtcDay(new Date());

  const jobs = await prisma.binServiceJob.findMany({
    where: {
      siteId: { in: accessibleSiteIds },
      status: { in: OPEN_JOB_STATUSES },
      setup: { removedAt: null, active: true },
      OR: [
        { scheduledDate: { lte: today } },
        { status: { in: [BinServiceJobStatus.CANNOT_ACCESS, BinServiceJobStatus.ISSUE_REPORTED] } },
      ],
    },
    include: binJobInclude,
  });

  return sortTechnicianJobs(jobs);
}

export function sortTechnicianJobs(jobs: BinJobWithRelations[]) {
  const today = startOfUtcDay(new Date());

  return [...jobs].sort((a, b) => {
    const statusA = getRotationStatus({
      active: a.setup.active,
      nextServiceDate: a.setup.nextServiceDate,
      openJobStatus: a.status,
      scheduledDate: a.scheduledDate,
    });
    const statusB = getRotationStatus({
      active: b.setup.active,
      nextServiceDate: b.setup.nextServiceDate,
      openJobStatus: b.status,
      scheduledDate: b.scheduledDate,
    });

    const priority = (color: string, scheduled: Date) => {
      if (color === "red" || color === "orange") return 0;
      if (color === "yellow") return 1;
      if (startOfUtcDay(scheduled).getTime() === today.getTime()) return 2;
      return 3;
    };

    const diff =
      priority(statusA.color, a.scheduledDate) -
      priority(statusB.color, b.scheduledDate);
    if (diff !== 0) return diff;
    return a.scheduledDate.getTime() - b.scheduledDate.getTime();
  });
}

export async function upsertBinServiceSetup(
  siteId: string,
  data: {
    expectedRegularBins: number;
    expectedNewBins: number;
    weekPattern: BinServiceSetup["weekPattern"];
    serviceDay: BinServiceSetup["serviceDay"];
    assignedTechnicianId: string | null;
    accessInstructions?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
    signatureRequired: boolean;
    active: boolean;
  },
) {
  const existing = await prisma.binServiceSetup.findUnique({
    where: { siteId },
  });

  const scheduleChanged =
    !existing ||
    existing.weekPattern !== data.weekPattern ||
    existing.serviceDay !== data.serviceDay;

  const nextServiceDate = scheduleChanged
    ? existing?.lastCompletedServiceDate
      ? computeNextServiceDateAfterCompletion(
          existing.lastCompletedServiceDate,
          data.serviceDay,
          data.weekPattern,
        )
      : computeInitialNextServiceDate(data.serviceDay, data.weekPattern)
    : existing?.nextServiceDate ??
      computeInitialNextServiceDate(data.serviceDay, data.weekPattern);

  const setup = await prisma.binServiceSetup.upsert({
    where: { siteId },
    create: {
      siteId,
      ...data,
      nextServiceDate,
    },
    update: {
      ...data,
      nextServiceDate,
    },
  });

  if (setup.active && !setup.removedAt) {
    const site = await prisma.binServiceSite.findUnique({
      where: { id: siteId },
      select: { name: true },
    });
    if (site) {
      const covered = await siteHasBinRouteCoverage({
        siteName: site.name,
        setupAssignedTechnicianId: setup.assignedTechnicianId,
      });
      if (covered) {
        await ensureOpenJobForSetup(setup, site.name);
      }
    }
  }

  return setup;
}

export async function createBinServiceSite(input: {
  clientName: string;
  name: string;
  area?: string;
  address: string;
}) {
  let client = await prisma.binClient.findFirst({
    where: { name: input.clientName },
  });

  if (!client) {
    client = await prisma.binClient.create({
      data: { name: input.clientName },
    });
  }

  return prisma.binServiceSite.create({
    data: {
      clientId: client.id,
      name: input.name,
      area: input.area,
      address: input.address,
    },
    include: binSiteInclude,
  });
}

export async function completeBinServiceJob(input: {
  jobId: string;
  technicianId: string;
  regularBinsServiced: number;
  newBinsServiced: number;
  linersUsed: number;
  serviceNotes?: string | null;
  clientSignatureName?: string | null;
  noSignatureReason?: string | null;
}) {
  const job = await prisma.binServiceJob.findUnique({
    where: { id: input.jobId },
    include: { setup: true },
  });

  if (!job) {
    throw new Error("Job not found.");
  }

  const completedAt = new Date();
  const lastCompletedServiceDate = startOfUtcDay(completedAt);
  const nextServiceDate = computeNextServiceDateAfterCompletion(
    lastCompletedServiceDate,
    job.setup.serviceDay,
    job.setup.weekPattern,
  );

  return prisma.$transaction(async (tx) => {
    await tx.binServiceLog.create({
      data: {
        jobId: job.id,
        siteId: job.siteId,
        technicianId: input.technicianId,
        regularBinsExpected: job.setup.expectedRegularBins,
        regularBinsServiced: input.regularBinsServiced,
        newBinsExpected: job.setup.expectedNewBins,
        newBinsServiced: input.newBinsServiced,
        linersUsed: input.linersUsed,
        serviceNotes: input.serviceNotes?.trim() || null,
        clientSignatureName: input.clientSignatureName,
        noSignatureReason: input.noSignatureReason,
        outcome: "COMPLETED",
        completedAt,
      },
    });

    await tx.binServiceJob.update({
      where: { id: job.id },
      data: {
        status: BinServiceJobStatus.COMPLETED,
        completedAt,
      },
    });

    return tx.binServiceSetup.update({
      where: { id: job.setupId },
      data: {
        lastCompletedServiceDate,
        nextServiceDate,
      },
    });
  }).then(async (setup) => {
    await ensureOpenJobForSetup(setup);
    return setup;
  });
}

export async function markBinJobCannotAccess(input: {
  jobId: string;
  technicianId: string;
  reason: string;
  serviceNotes?: string | null;
}) {
  const job = await prisma.binServiceJob.findUnique({
    where: { id: input.jobId },
    include: { setup: true },
  });

  if (!job) {
    throw new Error("Job not found.");
  }

  const completedAt = new Date();

  return prisma.$transaction(async (tx) => {
    await tx.binServiceLog.create({
      data: {
        jobId: job.id,
        siteId: job.siteId,
        technicianId: input.technicianId,
        regularBinsExpected: job.setup.expectedRegularBins,
        regularBinsServiced: 0,
        newBinsExpected: job.setup.expectedNewBins,
        newBinsServiced: 0,
        linersUsed: 0,
        issueNotes: input.reason,
        serviceNotes: input.serviceNotes?.trim() || null,
        outcome: "CANNOT_ACCESS",
        completedAt,
      },
    });

    return tx.binServiceJob.update({
      where: { id: job.id },
      data: {
        status: BinServiceJobStatus.CANNOT_ACCESS,
        completedAt,
      },
    });
  });
}

export async function reportBinJobIssue(input: {
  jobId: string;
  technicianId: string;
  issueType: string;
  issueNotes?: string;
  serviceNotes?: string | null;
}) {
  const job = await prisma.binServiceJob.findUnique({
    where: { id: input.jobId },
    include: { setup: true },
  });

  if (!job) {
    throw new Error("Job not found.");
  }

  const completedAt = new Date();

  return prisma.$transaction(async (tx) => {
    await tx.binServiceLog.create({
      data: {
        jobId: job.id,
        siteId: job.siteId,
        technicianId: input.technicianId,
        regularBinsExpected: job.setup.expectedRegularBins,
        regularBinsServiced: 0,
        newBinsExpected: job.setup.expectedNewBins,
        newBinsServiced: 0,
        linersUsed: 0,
        issueType: input.issueType,
        issueNotes: input.issueNotes,
        serviceNotes: input.serviceNotes?.trim() || null,
        outcome: "ISSUE_REPORTED",
        completedAt,
      },
    });

    return tx.binServiceJob.update({
      where: { id: job.id },
      data: {
        status: BinServiceJobStatus.ISSUE_REPORTED,
        completedAt,
      },
    });
  });
}

export async function softRemoveBinServiceSite(siteId: string, removedBy: string) {
  const site = await prisma.binServiceSite.findUnique({
    where: { id: siteId },
    include: { setup: true },
  });

  if (!site) {
    throw new Error("Site not found.");
  }

  if (site.setup?.removedAt) {
    return site.setup;
  }

  const now = new Date();

  if (site.setup) {
    return prisma.binServiceSetup.update({
      where: { siteId },
      data: {
        active: false,
        removedAt: now,
        removedBy,
      },
    });
  }

  return prisma.binServiceSetup.create({
    data: {
      siteId,
      expectedRegularBins: 0,
      expectedNewBins: 0,
      weekPattern: "WEEK_1_3",
      serviceDay: "TUESDAY",
      assignedTechnicianId: null,
      active: false,
      removedAt: now,
      removedBy,
      signatureRequired: false,
    },
  });
}

export function enrichSiteWithStatus(site: BinSiteWithRelations) {
  const openJob = site.jobs[0] ?? null;
  const setup = site.setup;

  if (setup?.removedAt) {
    return {
      site,
      openJob,
      rotation: {
        color: "grey" as const,
        label: "Removed",
        isOverdue: false,
        isDueSoon: false,
        needsAttention: false,
      },
    };
  }

  const rotation = getRotationStatus({
    active: setup?.active ?? false,
    lastCompletedServiceDate: setup?.lastCompletedServiceDate ?? null,
    nextServiceDate: setup?.nextServiceDate ?? null,
    openJobStatus: openJob?.status ?? null,
    scheduledDate: openJob?.scheduledDate ?? setup?.nextServiceDate ?? null,
  });

  return { site, openJob, rotation };
}

export function enrichJobWithStatus(job: BinJobWithRelations) {
  const rotation = getRotationStatus({
    active: job.setup.active,
    lastCompletedServiceDate: job.setup.lastCompletedServiceDate,
    nextServiceDate: job.setup.nextServiceDate,
    openJobStatus: job.status,
    scheduledDate: job.scheduledDate,
  });

  return { job, rotation };
}
