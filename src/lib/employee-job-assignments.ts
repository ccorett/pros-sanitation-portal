import { AccessLevel, OperationalGroup } from "@prisma/client";
import {
  clientLocations,
  type ClientLocation,
} from "@/lib/jobs-mock-data";
import {
  isBinOperationalRole,
  isManagerOrAbove,
  type EmployeeAccessContext,
} from "@/lib/operational-access";

export type EmployeeJobAssignments = {
  /** Non-bin job identifiers (may match location slug or job-* ids). */
  assignedJobIds: string[];
  /** Cleaning location slugs from Job Management. */
  assignedLocationIds: string[];
  /** When true, general Team Member/Supervisor may open Bin Management. */
  assignedBinManagement: boolean;
};

export const EMPTY_JOB_ASSIGNMENTS: EmployeeJobAssignments = {
  assignedJobIds: [],
  assignedLocationIds: [],
  assignedBinManagement: false,
};

/**
 * Mock assignments keyed by company email.
 * Manager/Admin can assign non-bin jobs/locations here for testing.
 */
const ASSIGNMENTS_BY_EMAIL: Record<string, EmployeeJobAssignments> = {
  "bin.tech@prossanitation.com": EMPTY_JOB_ASSIGNMENTS,
  "bin.supervisor@prossanitation.com": EMPTY_JOB_ASSIGNMENTS,
};

export function getEmployeeJobAssignments(
  companyEmail: string,
): EmployeeJobAssignments {
  const normalized = companyEmail.trim().toLowerCase();
  return (
    ASSIGNMENTS_BY_EMAIL[normalized] ?? {
      ...EMPTY_JOB_ASSIGNMENTS,
    }
  );
}

export function hasNonBinJobAssignments(
  assignments: EmployeeJobAssignments,
): boolean {
  return (
    assignments.assignedJobIds.length > 0 ||
    assignments.assignedLocationIds.length > 0
  );
}

export function isCleaningLocationAssigned(
  locationSlug: string,
  assignments: EmployeeJobAssignments,
): boolean {
  return (
    assignments.assignedLocationIds.includes(locationSlug) ||
    assignments.assignedJobIds.includes(locationSlug) ||
    assignments.assignedJobIds.includes(`job-${locationSlug}`)
  );
}

/** General Job Management nav and /jobs routes (non-bin cleaning locations). */
export function canAccessGeneralJobs(ctx: EmployeeAccessContext): boolean {
  if (isManagerOrAbove(ctx.accessLevel)) {
    return true;
  }

  if (isBinOperationalRole(ctx)) {
    return hasNonBinJobAssignments(ctx.assignments);
  }

  if (hasNonBinJobAssignments(ctx.assignments)) {
    return true;
  }

  return (
    (ctx.accessLevel === AccessLevel.TEAM_MEMBER &&
      ctx.operationalGroup === OperationalGroup.GENERAL) ||
    (ctx.accessLevel === AccessLevel.SUPERVISOR &&
      ctx.operationalGroup === OperationalGroup.GENERAL)
  );
}

export function canAccessCleaningLocation(
  ctx: EmployeeAccessContext,
  locationSlug: string,
): boolean {
  if (isManagerOrAbove(ctx.accessLevel)) {
    return true;
  }

  if (isBinOperationalRole(ctx)) {
    return isCleaningLocationAssigned(locationSlug, ctx.assignments);
  }

  if (hasNonBinJobAssignments(ctx.assignments)) {
    return isCleaningLocationAssigned(locationSlug, ctx.assignments);
  }

  return (
    ctx.accessLevel === AccessLevel.TEAM_MEMBER ||
    ctx.accessLevel === AccessLevel.SUPERVISOR
  );
}

export function filterClientLocationsForEmployee(
  ctx: EmployeeAccessContext,
): ClientLocation[] {
  if (isManagerOrAbove(ctx.accessLevel)) {
    return clientLocations;
  }

  if (isBinOperationalRole(ctx)) {
    return clientLocations.filter((location) =>
      isCleaningLocationAssigned(location.slug, ctx.assignments),
    );
  }

  if (hasNonBinJobAssignments(ctx.assignments)) {
    return clientLocations.filter((location) =>
      isCleaningLocationAssigned(location.slug, ctx.assignments),
    );
  }

  return clientLocations;
}
