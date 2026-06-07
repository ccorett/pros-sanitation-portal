import type { Employee, Job, JobServiceLog, Prisma } from "@prisma/client";
import {
  AccessLevel,
  CleaningJobStatus,
  JobActionType,
  JobPriority,
  OperationalGroup,
} from "@prisma/client";
import {
  isBinOperationalRole,
  isManagerOrAbove,
  type EmployeeAccessContext,
} from "@/lib/operational-access";
import { ACTIVE_EMPLOYEE_FILTER } from "@/lib/account-retention";
import { resolveAssignedCleaningLocationIds } from "@/lib/job-assignment-service";
import { prisma } from "@/lib/prisma";

export type CleaningJobDto = {
  id: string;
  title: string;
  clientLocationId: string;
  clientLocation: string;
  serviceType: string;
  assignedEmployeeId: string | null;
  assignedEmployeeName: string | null;
  assignedEmployeeEmail: string | null;
  assignedBy: string;
  scheduledDate: string;
  dueDate: string;
  priority: JobPriority;
  status: CleaningJobStatus;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCleaningJobInput = {
  title: string;
  clientLocationId: string;
  serviceType: string;
  assignedEmployeeId?: string | null;
  assignedBy: string;
  scheduledDate: string;
  dueDate: string;
  priority?: JobPriority;
  notes?: string | null;
};

export type JobServiceLogDto = {
  id: string;
  jobId: string;
  job: string;
  employeeId: string | null;
  employeeName: string;
  employeeEmail: string;
  actionType: JobActionType;
  notes: string | null;
  issueNotes: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type UpdateCleaningJobInput = {
  title?: string;
  serviceType?: string;
  assignedEmployeeId?: string | null;
  assignedBy?: string;
  scheduledDate?: string;
  dueDate?: string;
  priority?: JobPriority;
  status?: CleaningJobStatus;
  notes?: string | null;
};

function toDateOnlyIso(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function serializeJob(row: Job): CleaningJobDto {
  return {
    id: row.id,
    title: row.title,
    clientLocationId: row.clientLocationId,
    clientLocation: row.clientLocation,
    serviceType: row.serviceType,
    assignedEmployeeId: row.assignedEmployeeId,
    assignedEmployeeName: row.assignedEmployeeName,
    assignedEmployeeEmail: row.assignedEmployeeEmail,
    assignedBy: row.assignedBy,
    scheduledDate: toDateOnlyIso(row.scheduledDate),
    dueDate: toDateOnlyIso(row.dueDate),
    priority: row.priority,
    status: row.status,
    notes: row.notes,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getActorAssignedCleaningLocationIds(
  actor: Employee,
): Promise<string[]> {
  return resolveAssignedCleaningLocationIds(actor);
}

function locationScopedJobsWhere(locationIds: string[]): Prisma.JobWhereInput {
  if (locationIds.length === 0) {
    return { id: { in: [] } };
  }

  return { clientLocationId: { in: locationIds } };
}

export async function buildCleaningJobsVisibilityWhere(
  actor: Employee,
  ctx: EmployeeAccessContext,
): Promise<Prisma.JobWhereInput> {
  if (isManagerOrAbove(ctx.accessLevel)) {
    return {};
  }

  if (isBinOperationalRole(ctx)) {
    const locationIds = await getActorAssignedCleaningLocationIds(actor);
    const filters: Prisma.JobWhereInput[] = [{ assignedEmployeeId: actor.id }];
    if (locationIds.length > 0) {
      filters.push({ clientLocationId: { in: locationIds } });
    }

    return { OR: filters };
  }

  if (
    ctx.accessLevel === AccessLevel.SUPERVISOR ||
    ctx.accessLevel === AccessLevel.TEAM_MEMBER
  ) {
    const locationIds = await getActorAssignedCleaningLocationIds(actor);
    return locationScopedJobsWhere(locationIds);
  }

  return { id: { in: [] } };
}

export async function listCleaningJobsForActor(
  actor: Employee,
  ctx: EmployeeAccessContext,
): Promise<CleaningJobDto[]> {
  const where = await buildCleaningJobsVisibilityWhere(actor, ctx);

  const rows = await prisma.job.findMany({
    where,
    orderBy: [{ scheduledDate: "asc" }, { title: "asc" }],
  });

  return rows.map(serializeJob);
}

export async function getCleaningJobById(id: string): Promise<CleaningJobDto | null> {
  const row = await prisma.job.findUnique({ where: { id } });
  return row ? serializeJob(row) : null;
}

export async function canActorAccessCleaningJob(
  actor: Employee,
  ctx: EmployeeAccessContext,
  job: CleaningJobDto,
): Promise<boolean> {
  if (isManagerOrAbove(ctx.accessLevel)) {
    return true;
  }

  if (isBinOperationalRole(ctx)) {
    if (job.assignedEmployeeId === actor.id) {
      return true;
    }

    const locationIds = await getActorAssignedCleaningLocationIds(actor);
    return locationIds.includes(job.clientLocationId);
  }

  if (
    ctx.accessLevel === AccessLevel.SUPERVISOR ||
    ctx.accessLevel === AccessLevel.TEAM_MEMBER
  ) {
    const locationIds = await getActorAssignedCleaningLocationIds(actor);
    return locationIds.includes(job.clientLocationId);
  }

  return false;
}

async function applyEmployeeAssignment(
  assignedEmployeeId: string | null | undefined,
): Promise<{
  assignedEmployeeId: string | null;
  assignedEmployeeName: string | null;
  assignedEmployeeEmail: string | null;
  status?: CleaningJobStatus;
}> {
  if (assignedEmployeeId === undefined) {
    return {
      assignedEmployeeId: null,
      assignedEmployeeName: null,
      assignedEmployeeEmail: null,
    };
  }

  if (assignedEmployeeId === null) {
    return {
      assignedEmployeeId: null,
      assignedEmployeeName: null,
      assignedEmployeeEmail: null,
      status: CleaningJobStatus.PENDING,
    };
  }

  const employee = await prisma.employee.findUnique({
    where: { id: assignedEmployeeId },
  });

  if (!employee) {
    throw new Error("Assigned employee not found.");
  }

  return {
    assignedEmployeeId: employee.id,
    assignedEmployeeName: `${employee.firstName} ${employee.lastName}`.trim(),
    assignedEmployeeEmail: employee.companyEmail,
    status: CleaningJobStatus.ASSIGNED,
  };
}

export async function createCleaningJob(
  input: CreateCleaningJobInput,
): Promise<CleaningJobDto> {
  const location = await prisma.clientLocation.findFirst({
    where: { id: input.clientLocationId, serviceType: { not: null } },
  });

  if (!location) {
    throw new Error("Cleaning location not found.");
  }

  const assignment = await applyEmployeeAssignment(input.assignedEmployeeId ?? null);

  const row = await prisma.job.create({
    data: {
      title: input.title.trim(),
      clientLocationId: location.id,
      clientLocation: location.locationName,
      serviceType: input.serviceType.trim(),
      assignedBy: input.assignedBy.trim(),
      scheduledDate: new Date(input.scheduledDate),
      dueDate: new Date(input.dueDate),
      priority: input.priority ?? JobPriority.NORMAL,
      notes: input.notes?.trim() ?? null,
      status: assignment.status ?? CleaningJobStatus.PENDING,
      assignedEmployeeId: assignment.assignedEmployeeId,
      assignedEmployeeName: assignment.assignedEmployeeName,
      assignedEmployeeEmail: assignment.assignedEmployeeEmail,
    },
  });

  return serializeJob(row);
}

export async function updateCleaningJob(
  id: string,
  input: UpdateCleaningJobInput,
): Promise<CleaningJobDto> {
  const existing = await prisma.job.findUnique({ where: { id } });

  if (!existing) {
    throw new Error("Job not found.");
  }

  let assignmentPatch: Awaited<ReturnType<typeof applyEmployeeAssignment>> | undefined;
  if (input.assignedEmployeeId !== undefined) {
    assignmentPatch = await applyEmployeeAssignment(input.assignedEmployeeId);
  }

  let completedAt: Date | null | undefined;
  if (input.status === CleaningJobStatus.COMPLETED) {
    completedAt = new Date();
  } else if (input.status && existing.status === CleaningJobStatus.COMPLETED) {
    completedAt = null;
  }

  const row = await prisma.job.update({
    where: { id },
    data: {
      title: input.title?.trim(),
      serviceType: input.serviceType?.trim(),
      assignedBy: input.assignedBy?.trim(),
      scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : undefined,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      priority: input.priority,
      status: input.status,
      notes: input.notes === null ? null : input.notes?.trim(),
      completedAt,
      ...(assignmentPatch
        ? {
            assignedEmployeeId: assignmentPatch.assignedEmployeeId,
            assignedEmployeeName: assignmentPatch.assignedEmployeeName,
            assignedEmployeeEmail: assignmentPatch.assignedEmployeeEmail,
            status: assignmentPatch.status ?? input.status,
          }
        : {}),
    },
  });

  return serializeJob(row);
}

function serializeJobServiceLog(row: JobServiceLog): JobServiceLogDto {
  return {
    id: row.id,
    jobId: row.jobId,
    job: row.job,
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    employeeEmail: row.employeeEmail,
    actionType: row.actionType,
    notes: row.notes,
    issueNotes: row.issueNotes,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function employeeLogSnapshot(employee: Employee) {
  return {
    employeeId: employee.id,
    employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
    employeeEmail: employee.companyEmail,
  };
}

export async function listJobServiceLogsForJob(
  jobId: string,
): Promise<JobServiceLogDto[]> {
  const rows = await prisma.jobServiceLog.findMany({
    where: { jobId },
    orderBy: { createdAt: "desc" },
  });

  return rows.map(serializeJobServiceLog);
}

export async function startCleaningJob(
  id: string,
  actor: Employee,
): Promise<CleaningJobDto> {
  const existing = await prisma.job.findUnique({ where: { id } });

  if (!existing) {
    throw new Error("Job not found.");
  }

  if (
    existing.status !== CleaningJobStatus.PENDING &&
    existing.status !== CleaningJobStatus.ASSIGNED
  ) {
    throw new Error("Only pending or assigned jobs can be started.");
  }

  const now = new Date();
  const snapshot = employeeLogSnapshot(actor);

  const row = await prisma.$transaction(async (tx) => {
    await tx.jobServiceLog.create({
      data: {
        jobId: existing.id,
        job: existing.title,
        ...snapshot,
        actionType: JobActionType.STARTED,
        startedAt: now,
      },
    });

    return tx.job.update({
      where: { id },
      data: { status: CleaningJobStatus.IN_PROGRESS },
    });
  });

  return serializeJob(row);
}

export async function completeCleaningJob(
  id: string,
  actor: Employee,
): Promise<CleaningJobDto> {
  const existing = await prisma.job.findUnique({ where: { id } });

  if (!existing) {
    throw new Error("Job not found.");
  }

  if (existing.status !== CleaningJobStatus.IN_PROGRESS) {
    throw new Error("Only in-progress jobs can be completed.");
  }

  const now = new Date();
  const snapshot = employeeLogSnapshot(actor);

  const row = await prisma.$transaction(async (tx) => {
    await tx.jobServiceLog.create({
      data: {
        jobId: existing.id,
        job: existing.title,
        ...snapshot,
        actionType: JobActionType.COMPLETED,
        completedAt: now,
      },
    });

    return tx.job.update({
      where: { id },
      data: {
        status: CleaningJobStatus.COMPLETED,
        completedAt: now,
      },
    });
  });

  return serializeJob(row);
}

export type ReportCleaningJobIssueInput = {
  issueNotes: string;
  notes?: string | null;
};

export async function reportCleaningJobIssue(
  id: string,
  actor: Employee,
  input: ReportCleaningJobIssueInput,
): Promise<CleaningJobDto> {
  const existing = await prisma.job.findUnique({ where: { id } });

  if (!existing) {
    throw new Error("Job not found.");
  }

  if (existing.status !== CleaningJobStatus.IN_PROGRESS) {
    throw new Error("Only in-progress jobs can have issues reported.");
  }

  if (!input.issueNotes.trim()) {
    throw new Error("Issue notes are required.");
  }

  const snapshot = employeeLogSnapshot(actor);

  const row = await prisma.$transaction(async (tx) => {
    await tx.jobServiceLog.create({
      data: {
        jobId: existing.id,
        job: existing.title,
        ...snapshot,
        actionType: JobActionType.ISSUE_REPORTED,
        issueNotes: input.issueNotes.trim(),
        notes: input.notes?.trim() ?? null,
      },
    });

    return tx.job.update({
      where: { id },
      data: { status: CleaningJobStatus.ISSUE_REPORTED },
    });
  });

  return serializeJob(row);
}

export function canActorActOnCleaningJob(
  actor: Employee,
  job: CleaningJobDto,
): boolean {
  return job.assignedEmployeeId === actor.id;
}

export function canActorUpdateCleaningJob(
  actor: Employee,
  ctx: EmployeeAccessContext,
  job: CleaningJobDto,
): boolean {
  if (isManagerOrAbove(ctx.accessLevel)) {
    return true;
  }

  return job.assignedEmployeeId === actor.id;
}

export function canEditCleaningJobAssignment(ctx: EmployeeAccessContext): boolean {
  return isManagerOrAbove(ctx.accessLevel);
}

export type CleaningJobAssigneeDto = {
  id: string;
  employeePublicId: string;
  fullName: string;
};

export async function listCleaningJobAssignees(
  locationName: string,
): Promise<CleaningJobAssigneeDto[]> {
  const rows = await prisma.employee.findMany({
    where: {
      ...ACTIVE_EMPLOYEE_FILTER,
      locationAssignment: locationName.trim(),
      operationalGroup: { not: OperationalGroup.BIN_TECHNICIAN },
      accessLevel: {
        in: [AccessLevel.TEAM_MEMBER, AccessLevel.SUPERVISOR],
      },
    },
    select: {
      id: true,
      employeeId: true,
      firstName: true,
      lastName: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    employeePublicId: row.employeeId,
    fullName: `${row.firstName} ${row.lastName}`.trim(),
  }));
}
