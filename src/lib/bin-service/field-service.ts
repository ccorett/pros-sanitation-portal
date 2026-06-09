import {
  BinServiceJobStatus,
  type Employee,
  type Prisma,
} from "@prisma/client";
import { canActOnBinJob, canViewAllBinFieldSites } from "@/lib/bin-service/field-access";
import { filterAttentionSites } from "@/lib/bin-service/field-filters";
import {
  employeeCanAccessBinSite,
  getEmployeeBinLocationNames,
  siteHasBinRouteCoverage,
} from "@/lib/bin-service/location-access";
import type {
  BinFieldAttentionItem,
  BinFieldJobDetail,
  BinFieldServiceStatus,
  BinFieldSiteRow,
} from "@/lib/bin-service/field-types";
import {
  binJobInclude,
  binSiteInclude,
  completeBinServiceJob,
  ensureOpenJobForSetup,
  enrichJobWithStatus,
  listBinServiceSites,
  listTechnicianBinJobs,
  markBinJobCannotAccess,
  reportBinJobIssue,
  sortTechnicianJobs,
} from "@/lib/bin-service/service";
import { getRotationStatus } from "@/lib/bin-service/status";
import { prisma } from "@/lib/prisma";

const openJobInclude = {
  include: {
    assignedTechnician: {
      select: { firstName: true, lastName: true },
    },
    logs: {
      orderBy: { completedAt: "desc" as const },
      take: 1,
    },
  },
} satisfies Prisma.BinServiceJobDefaultArgs;

function toIsoDate(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function mapJobStatusToServiceStatus(
  status: BinServiceJobStatus | null,
): BinFieldServiceStatus | null {
  if (status === BinServiceJobStatus.CANNOT_ACCESS) return "cannot_access";
  if (status === BinServiceJobStatus.ISSUE_REPORTED) return "issue_reported";
  return null;
}

type BinSiteForField = Prisma.BinServiceSiteGetPayload<{
  include: typeof binSiteFieldInclude;
}>;

function buildSiteRow(site: BinSiteForField): BinFieldSiteRow {
  const setup = site.setup;
  const openJob = site.jobs[0] ?? null;
  const latestLog = openJob?.logs?.[0];
  const rotation = getRotationStatus({
    active: setup?.active ?? false,
    lastCompletedServiceDate: setup?.lastCompletedServiceDate ?? null,
    nextServiceDate: setup?.nextServiceDate ?? null,
    openJobStatus: openJob?.status ?? null,
    scheduledDate: openJob?.scheduledDate ?? setup?.nextServiceDate ?? null,
  });

  const technicianName = openJob?.assignedTechnician
    ? `${openJob.assignedTechnician.firstName} ${openJob.assignedTechnician.lastName}`
    : undefined;

  return {
    siteId: site.id,
    jobId: openJob?.id ?? null,
    location: site.name,
    clientName: site.client.name,
    newBins: setup?.expectedNewBins ?? 0,
    regularBins: setup?.expectedRegularBins ?? 0,
    lastServiceDate: toIsoDate(setup?.lastCompletedServiceDate),
    nextServiceDate: toIsoDate(setup?.nextServiceDate ?? openJob?.scheduledDate),
    active: setup?.active ?? false,
    signatureRequired: setup?.signatureRequired ?? false,
    displayNotes: setup?.accessInstructions?.trim() || "",
    rotation,
    openJobStatus: openJob?.status ?? null,
    serviceStatus: mapJobStatusToServiceStatus(openJob?.status ?? null),
    cannotAccessReason:
      openJob?.status === BinServiceJobStatus.CANNOT_ACCESS
        ? latestLog?.issueNotes ?? undefined
        : undefined,
    issueType: latestLog?.issueType ?? undefined,
    issueNotes: latestLog?.issueNotes ?? undefined,
    serviceNotes: latestLog?.serviceNotes ?? undefined,
    regularBinsServiced: latestLog?.regularBinsServiced,
    newBinsServiced: latestLog?.newBinsServiced,
    linersUsed: latestLog?.linersUsed,
    clientSignatureName: latestLog?.clientSignatureName ?? undefined,
    lastUpdatedBy: technicianName,
    lastUpdatedAt: latestLog?.completedAt.toISOString(),
  };
}

const binSiteFieldInclude = {
  ...binSiteInclude,
  jobs: {
    where: {
      status: {
        in: [
          BinServiceJobStatus.SCHEDULED,
          BinServiceJobStatus.IN_PROGRESS,
          BinServiceJobStatus.CANNOT_ACCESS,
          BinServiceJobStatus.ISSUE_REPORTED,
        ],
      },
    },
    orderBy: { scheduledDate: "desc" as const },
    take: 1,
    ...openJobInclude,
  },
} satisfies Prisma.BinServiceSiteInclude;

export async function listBinFieldSitesForActor(
  employee: Employee,
): Promise<BinFieldSiteRow[]> {
  const employeeLocations = await getEmployeeBinLocationNames(employee);

  const sites = await prisma.binServiceSite.findMany({
    include: binSiteFieldInclude,
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

  const refreshed = await prisma.binServiceSite.findMany({
    include: binSiteFieldInclude,
    orderBy: [{ client: { name: "asc" } }, { name: "asc" }],
  });

  const scoped = canViewAllBinFieldSites(employee)
    ? refreshed
    : refreshed.filter(
        (site) =>
          site.setup &&
          employeeCanAccessBinSite({
            employeeId: employee.id,
            employeeLocations,
            siteName: site.name,
            setupAssignedTechnicianId: site.setup.assignedTechnicianId,
          }),
      );

  return scoped
    .filter((site) => site.setup?.active && !site.setup.removedAt)
    .map((site) => buildSiteRow(site));
}

export function toAttentionItems(rows: BinFieldSiteRow[]): BinFieldAttentionItem[] {
  return filterAttentionSites(rows)
    .filter((row) => row.jobId)
    .map((row) => ({
      id: row.siteId,
      siteId: row.siteId,
      jobId: row.jobId!,
      locationName: row.location,
      serviceStatus: row.serviceStatus ?? "issue_reported",
      lastUpdatedBy: row.lastUpdatedBy,
      lastUpdatedAt: row.lastUpdatedAt,
      notes: row.serviceNotes || row.displayNotes,
      issueOrAccessReason:
        row.cannotAccessReason ??
        row.issueNotes ??
        row.issueType ??
        "Needs admin review",
      lastServiceDate: row.lastServiceDate,
      nextServiceDate: row.nextServiceDate,
    }));
}

export async function listBinFieldJobsToday(employee: Employee) {
  const jobs = canViewAllBinFieldSites(employee)
    ? await listAllOpenDueJobs()
    : await listTechnicianBinJobs(employee);

  return jobs.map((job) => {
    const enriched = enrichJobWithStatus(job);
    return {
      ...enriched.job,
      rotation: enriched.rotation,
      siteName: job.site.name,
      lastServiceDate: toIsoDate(job.setup.lastCompletedServiceDate),
      nextServiceDate: toIsoDate(job.setup.nextServiceDate),
      displayNotes: job.setup.accessInstructions?.trim() || "",
    };
  });
}

async function listAllOpenDueJobs() {
  await listBinServiceSites();

  const jobs = await prisma.binServiceJob.findMany({
    where: {
      status: {
        in: [
          BinServiceJobStatus.SCHEDULED,
          BinServiceJobStatus.IN_PROGRESS,
          BinServiceJobStatus.CANNOT_ACCESS,
          BinServiceJobStatus.ISSUE_REPORTED,
        ],
      },
      setup: { active: true, removedAt: null },
    },
    include: binJobInclude,
  });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const filtered = jobs.filter((job) => {
    const rotation = getRotationStatus({
      active: job.setup.active,
      lastCompletedServiceDate: job.setup.lastCompletedServiceDate,
      nextServiceDate: job.setup.nextServiceDate,
      openJobStatus: job.status,
      scheduledDate: job.scheduledDate,
    });
    return (
      rotation.needsAttention ||
      rotation.color === "red" ||
      rotation.color === "yellow" ||
      job.scheduledDate <= today
    );
  });

  return sortTechnicianJobs(filtered);
}

export async function getBinFieldJobDetail(
  jobId: string,
  employee: Employee,
): Promise<BinFieldJobDetail | null> {
  const job = await prisma.binServiceJob.findUnique({
    where: { id: jobId },
    include: binJobInclude,
  });

  if (!job) return null;

  const employeeLocations = await getEmployeeBinLocationNames(employee);

  if (
    !canActOnBinJob(employee, job.assignedTechnicianId, {
      siteName: job.site.name,
      employeeLocations,
      setupAssignedTechnicianId: job.setup.assignedTechnicianId,
    })
  ) {
    return null;
  }

  const { rotation } = enrichJobWithStatus(job);

  return {
    jobId: job.id,
    siteId: job.siteId,
    siteName: job.site.name,
    expectedRegularBins: job.setup.expectedRegularBins,
    expectedNewBins: job.setup.expectedNewBins,
    signatureRequired: job.setup.signatureRequired,
    accessInstructions: job.setup.accessInstructions,
    status: job.status,
    rotation,
  };
}

export async function assertBinJobAccess(jobId: string, employee: Employee) {
  const job = await prisma.binServiceJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      assignedTechnicianId: true,
      site: { select: { name: true } },
      setup: { select: { assignedTechnicianId: true } },
    },
  });

  if (!job) {
    throw new Error("Job not found.");
  }

  const employeeLocations = await getEmployeeBinLocationNames(employee);

  if (
    !canActOnBinJob(employee, job.assignedTechnicianId, {
      siteName: job.site.name,
      employeeLocations,
      setupAssignedTechnicianId: job.setup.assignedTechnicianId,
    })
  ) {
    throw new Error("Forbidden");
  }

  return job;
}

export async function applyBinFieldServiceUpdate(input: {
  siteId: string;
  actor: Employee;
  serviceStatus: BinFieldServiceStatus;
  regularBinsServiced: number;
  newBinsServiced: number;
  linersUsed: number;
  serviceNotes?: string;
  cannotAccessReason?: string;
  issueType?: string;
  issueNotes?: string;
  clientSignatureName?: string;
  noSignatureReason?: string;
}) {
  const site = await prisma.binServiceSite.findUnique({
    where: { id: input.siteId },
    include: { setup: true },
  });

  if (!site?.setup?.active) {
    throw new Error("Site not found or inactive.");
  }

  const employeeLocations = await getEmployeeBinLocationNames(input.actor);

  if (
    !canViewAllBinFieldSites(input.actor) &&
    !employeeCanAccessBinSite({
      employeeId: input.actor.id,
      employeeLocations,
      siteName: site.name,
      setupAssignedTechnicianId: site.setup.assignedTechnicianId,
    })
  ) {
    throw new Error("Forbidden");
  }

  const openJob = await ensureOpenJobForSetup(site.setup, site.name);
  if (!openJob) {
    throw new Error("No open job for this site.");
  }

  if (
    !canActOnBinJob(input.actor, openJob.assignedTechnicianId, {
      siteName: site.name,
      employeeLocations,
      setupAssignedTechnicianId: site.setup.assignedTechnicianId,
    })
  ) {
    throw new Error("Forbidden");
  }

  if (input.serviceStatus === "completed") {
    if (openJob.status === BinServiceJobStatus.SCHEDULED) {
      await prisma.binServiceJob.update({
        where: { id: openJob.id },
        data: {
          status: BinServiceJobStatus.IN_PROGRESS,
          startedAt: new Date(),
        },
      });
    }

    await completeBinServiceJob({
      jobId: openJob.id,
      technicianId: input.actor.id,
      regularBinsServiced: input.regularBinsServiced,
      newBinsServiced: input.newBinsServiced,
      linersUsed: input.linersUsed,
      clientSignatureName: input.clientSignatureName,
      noSignatureReason: input.noSignatureReason,
      serviceNotes: input.serviceNotes,
    });
    return;
  }

  if (input.serviceStatus === "cannot_access") {
    if (!input.cannotAccessReason?.trim()) {
      throw new Error("Cannot access reason is required.");
    }
    await markBinJobCannotAccess({
      jobId: openJob.id,
      technicianId: input.actor.id,
      reason: input.cannotAccessReason.trim(),
      serviceNotes: input.serviceNotes,
    });
    return;
  }

  await reportBinJobIssue({
    jobId: openJob.id,
    technicianId: input.actor.id,
    issueType: input.issueType?.trim() || "Other",
    issueNotes: input.issueNotes,
    serviceNotes: input.serviceNotes,
  });
}
