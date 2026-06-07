import { AccountStatus, type Employee, type JobAssignment } from "@prisma/client";
import {
  EMPTY_JOB_ASSIGNMENTS,
  type EmployeeJobAssignments,
} from "@/lib/job-assignment-types";
import { resolveClientLocationIdsForEmployee } from "@/lib/employee-location-assignment-service";
import { filterClientLocationsByAssignments } from "@/lib/job-assignment-access";
import type { ClientLocationDto } from "@/lib/job-management-service";
import { isManagerOrAbove, type EmployeeAccessContext } from "@/lib/operational-access";
import { prisma } from "@/lib/prisma";

export type JobAssignmentDto = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  clientLocationId: string;
  clientLocation: string;
  locationSlug: string;
  assignedRole: string;
  assignedBy: string;
  assignedAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const assignmentInclude = {
  location: { select: { slug: true } },
} as const;

function serializeAssignment(row: JobAssignment & { location: { slug: string } }): JobAssignmentDto {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    employeeEmail: row.employeeEmail,
    clientLocationId: row.clientLocationId,
    clientLocation: row.clientLocation,
    locationSlug: row.location.slug,
    assignedRole: row.assignedRole,
    assignedBy: row.assignedBy,
    assignedAt: row.assignedAt.toISOString(),
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function resolveAssignedCleaningLocationIds(
  employee: Pick<Employee, "id"> & { locationAssignment?: string | null },
): Promise<string[]> {
  const [jobAssignmentRows, locationAssignmentIds] = await Promise.all([
    prisma.jobAssignment.findMany({
      where: { employeeId: employee.id, isActive: true },
      select: { clientLocationId: true },
    }),
    resolveClientLocationIdsForEmployee(employee),
  ]);

  const ids = new Set<string>([
    ...jobAssignmentRows.map((row) => row.clientLocationId),
    ...locationAssignmentIds,
  ]);

  return [...ids];
}

export async function resolveAssignedCleaningLocationSlugs(
  employee: Pick<Employee, "id"> & { locationAssignment?: string | null },
): Promise<string[]> {
  const locationIds = await resolveAssignedCleaningLocationIds(employee);
  if (locationIds.length === 0) {
    return [];
  }

  const locations = await prisma.clientLocation.findMany({
    where: { id: { in: locationIds } },
    select: { slug: true },
  });

  return locations.map((row) => row.slug);
}

export async function resolveEmployeeJobAssignments(
  employee: Pick<Employee, "id" | "accessLevel"> & {
    locationAssignment?: string | null;
  },
): Promise<EmployeeJobAssignments> {
  if (isManagerOrAbove(employee.accessLevel)) {
    return { ...EMPTY_JOB_ASSIGNMENTS };
  }

  const assignedLocationIds = await resolveAssignedCleaningLocationSlugs(employee);

  return {
    assignedJobIds: [],
    assignedLocationIds,
    assignedBinManagement: false,
  };
}

export async function listJobAssignmentsForActor(
  actor: Employee,
): Promise<JobAssignmentDto[]> {
  const where = isManagerOrAbove(actor.accessLevel)
    ? { isActive: true }
    : { employeeId: actor.id, isActive: true };

  const rows = await prisma.jobAssignment.findMany({
    where,
    include: assignmentInclude,
    orderBy: [{ employeeName: "asc" }, { clientLocation: "asc" }],
  });

  return rows.map(serializeAssignment);
}

export type CreateJobAssignmentInput = {
  employeeId: string;
  clientLocationId: string;
  assignedRole: string;
  assignedBy: string;
};

export async function createJobAssignment(
  input: CreateJobAssignmentInput,
): Promise<JobAssignmentDto> {
  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId },
  });

  if (!employee) {
    throw new Error("Employee not found.");
  }

  if (employee.accountStatus === AccountStatus.REMOVED) {
    throw new Error("This employee account has been removed.");
  }

  const location = await prisma.clientLocation.findFirst({
    where: { id: input.clientLocationId, serviceType: { not: null } },
  });

  if (!location) {
    throw new Error("Cleaning location not found.");
  }

  const employeeName = `${employee.firstName} ${employee.lastName}`.trim();

  const row = await prisma.jobAssignment.upsert({
    where: {
      employeeId_clientLocationId: {
        employeeId: input.employeeId,
        clientLocationId: input.clientLocationId,
      },
    },
    update: {
      employeeName,
      employeeEmail: employee.companyEmail,
      clientLocation: location.locationName,
      assignedRole: input.assignedRole.trim(),
      assignedBy: input.assignedBy.trim(),
      assignedAt: new Date(),
      isActive: true,
    },
    create: {
      employeeId: input.employeeId,
      employeeName,
      employeeEmail: employee.companyEmail,
      clientLocationId: input.clientLocationId,
      clientLocation: location.locationName,
      assignedRole: input.assignedRole.trim(),
      assignedBy: input.assignedBy.trim(),
    },
    include: assignmentInclude,
  });

  return serializeAssignment(row);
}

export type UpdateJobAssignmentInput = {
  assignedRole?: string;
  assignedBy?: string;
  isActive?: boolean;
};

export async function updateJobAssignment(
  id: string,
  input: UpdateJobAssignmentInput,
): Promise<JobAssignmentDto> {
  const existing = await prisma.jobAssignment.findUnique({
    where: { id },
    include: assignmentInclude,
  });

  if (!existing) {
    throw new Error("Job assignment not found.");
  }

  const row = await prisma.jobAssignment.update({
    where: { id },
    data: {
      assignedRole: input.assignedRole?.trim(),
      assignedBy: input.assignedBy?.trim(),
      isActive: input.isActive,
    },
    include: assignmentInclude,
  });

  return serializeAssignment(row);
}

export function filterCleaningLocationsForContext(
  ctx: EmployeeAccessContext,
  locations: ClientLocationDto[],
): ClientLocationDto[] {
  return filterClientLocationsByAssignments(ctx, locations);
}
