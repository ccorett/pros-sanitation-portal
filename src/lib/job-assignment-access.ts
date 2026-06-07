import type { EmployeeJobAssignments } from "@/lib/job-assignment-types";
import { EmployeeResponsibility } from "@prisma/client";
import {
  canAccessJobsByResponsibility,
  isManagerOrAbove,
  type EmployeeAccessContext,
} from "@/lib/operational-access";

export function hasActiveCleaningAssignments(
  assignments: EmployeeJobAssignments,
): boolean {
  return assignments.assignedLocationIds.length > 0;
}

export function canAccessGeneralJobs(ctx: EmployeeAccessContext): boolean {
  if (isManagerOrAbove(ctx.accessLevel)) {
    return true;
  }

  if (canAccessJobsByResponsibility(ctx)) {
    const hasRouteResponsibility = ctx.responsibilities.some(
      (item) =>
        item === EmployeeResponsibility.DRIVER ||
        item === EmployeeResponsibility.DELIVERY_COORDINATOR ||
        item === EmployeeResponsibility.GENERAL_OPERATIONS,
    );

    return (
      hasActiveCleaningAssignments(ctx.assignments) || hasRouteResponsibility
    );
  }

  return hasActiveCleaningAssignments(ctx.assignments);
}

export function canAccessCleaningLocation(
  ctx: EmployeeAccessContext,
  locationSlug: string,
): boolean {
  if (isManagerOrAbove(ctx.accessLevel)) {
    return true;
  }

  return ctx.assignments.assignedLocationIds.includes(locationSlug);
}

export function filterClientLocationsByAssignments<T extends { slug: string }>(
  ctx: EmployeeAccessContext,
  locations: T[],
): T[] {
  if (isManagerOrAbove(ctx.accessLevel)) {
    return locations;
  }

  return locations.filter((location) =>
    ctx.assignments.assignedLocationIds.includes(location.slug),
  );
}
