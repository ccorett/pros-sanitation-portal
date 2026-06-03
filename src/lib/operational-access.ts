import { AccessLevel, OperationalGroup } from "@prisma/client";
import {
  EMPTY_JOB_ASSIGNMENTS,
  type EmployeeJobAssignments,
} from "@/lib/job-assignment-types";

export type EmployeeAccessContext = {
  accessLevel: AccessLevel;
  operationalGroup: OperationalGroup;
  assignments: EmployeeJobAssignments;
};

const MANAGER_PLUS: AccessLevel[] = [
  AccessLevel.MANAGER,
  AccessLevel.ADMIN,
  AccessLevel.SUPER_ADMIN,
];

export function isManagerOrAbove(accessLevel: AccessLevel): boolean {
  return MANAGER_PLUS.includes(accessLevel);
}

export function isBinOperationalRole({
  operationalGroup,
}: Pick<EmployeeAccessContext, "operationalGroup">): boolean {
  return (
    operationalGroup === OperationalGroup.BIN_TECHNICIAN ||
    operationalGroup === OperationalGroup.BIN_SERVICE_SUPERVISOR
  );
}

export function canAccessBinManagement(ctx: EmployeeAccessContext): boolean {
  if (isManagerOrAbove(ctx.accessLevel)) {
    return true;
  }

  if (isBinOperationalRole(ctx)) {
    return true;
  }

  return ctx.assignments.assignedBinManagement;
}

/** Admin setup: locations, expected counts, frequency, technician assignment. */
export function canManageBinLocationSetup(accessLevel: AccessLevel): boolean {
  return isManagerOrAbove(accessLevel);
}

/** Field updates on assigned routes (technician + bin service supervisor review). */
export function canPerformBinFieldUpdates(ctx: EmployeeAccessContext): boolean {
  if (isManagerOrAbove(ctx.accessLevel)) {
    return true;
  }

  if (
    ctx.accessLevel === AccessLevel.TEAM_MEMBER &&
    ctx.operationalGroup === OperationalGroup.BIN_TECHNICIAN
  ) {
    return true;
  }

  if (
    ctx.accessLevel === AccessLevel.SUPERVISOR &&
    ctx.operationalGroup === OperationalGroup.BIN_SERVICE_SUPERVISOR
  ) {
    return true;
  }

  return false;
}

export function canAccessEquipmentSupplies(ctx: EmployeeAccessContext): boolean {
  if (isManagerOrAbove(ctx.accessLevel)) {
    return true;
  }

  if (ctx.accessLevel !== AccessLevel.SUPERVISOR) {
    return false;
  }

  return (
    ctx.operationalGroup === OperationalGroup.GENERAL ||
    ctx.operationalGroup === OperationalGroup.BIN_SERVICE_SUPERVISOR
  );
}

export function isValidOperationalGroupForLevel(
  accessLevel: AccessLevel,
  operationalGroup: OperationalGroup,
): boolean {
  if (isManagerOrAbove(accessLevel)) {
    return true;
  }

  if (accessLevel === AccessLevel.TEAM_MEMBER) {
    return (
      operationalGroup === OperationalGroup.GENERAL ||
      operationalGroup === OperationalGroup.BIN_TECHNICIAN
    );
  }

  if (accessLevel === AccessLevel.SUPERVISOR) {
    return (
      operationalGroup === OperationalGroup.GENERAL ||
      operationalGroup === OperationalGroup.BIN_SERVICE_SUPERVISOR
    );
  }

  return operationalGroup === OperationalGroup.GENERAL;
}

export const OPERATIONAL_GROUP_LABELS: Record<OperationalGroup, string> = {
  [OperationalGroup.GENERAL]: "General",
  [OperationalGroup.BIN_TECHNICIAN]: "Bin Technician",
  [OperationalGroup.BIN_SERVICE_SUPERVISOR]: "Bin Service Supervisor",
};

export function createEmployeeAccessContext(input: {
  accessLevel: AccessLevel;
  operationalGroup: OperationalGroup;
  assignments?: EmployeeJobAssignments;
}): EmployeeAccessContext {
  return {
    accessLevel: input.accessLevel,
    operationalGroup: input.operationalGroup,
    assignments: input.assignments ?? EMPTY_JOB_ASSIGNMENTS,
  };
}
