import {
  AccessLevel,
  EmployeeResponsibility,
  OperationalGroup,
} from "@prisma/client";
import {
  EMPTY_JOB_ASSIGNMENTS,
  type EmployeeJobAssignments,
} from "@/lib/job-assignment-types";

export type EmployeeAccessContext = {
  accessLevel: AccessLevel;
  operationalGroup: OperationalGroup;
  responsibilities: EmployeeResponsibility[];
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

export function hasResponsibility(
  ctx: Pick<EmployeeAccessContext, "responsibilities">,
  ...responsibilities: EmployeeResponsibility[]
): boolean {
  return responsibilities.some((item) => ctx.responsibilities.includes(item));
}

export function isBinOperationalRole(
  ctx: Pick<EmployeeAccessContext, "operationalGroup" | "responsibilities">,
): boolean {
  return (
    ctx.operationalGroup === OperationalGroup.BIN_TECHNICIAN ||
    ctx.operationalGroup === OperationalGroup.BIN_SERVICE_SUPERVISOR ||
    hasResponsibility(
      ctx,
      EmployeeResponsibility.BIN_TECHNICIAN,
      EmployeeResponsibility.BIN_SERVICE_SUPERVISOR,
    )
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
    (ctx.operationalGroup === OperationalGroup.BIN_TECHNICIAN ||
      hasResponsibility(ctx, EmployeeResponsibility.BIN_TECHNICIAN))
  ) {
    return true;
  }

  if (
    ctx.accessLevel === AccessLevel.SUPERVISOR &&
    (ctx.operationalGroup === OperationalGroup.BIN_SERVICE_SUPERVISOR ||
      hasResponsibility(ctx, EmployeeResponsibility.BIN_SERVICE_SUPERVISOR))
  ) {
    return true;
  }

  return false;
}

export function canAccessEquipmentSupplies(ctx: EmployeeAccessContext): boolean {
  if (isManagerOrAbove(ctx.accessLevel)) {
    return true;
  }

  if (hasResponsibility(ctx, EmployeeResponsibility.STOCK_ACCESS)) {
    return true;
  }

  if (ctx.accessLevel !== AccessLevel.SUPERVISOR) {
    return false;
  }

  return (
    ctx.operationalGroup === OperationalGroup.GENERAL ||
    ctx.operationalGroup === OperationalGroup.BIN_SERVICE_SUPERVISOR ||
    hasResponsibility(
      ctx,
      EmployeeResponsibility.GENERAL_OPERATIONS,
      EmployeeResponsibility.BIN_SERVICE_SUPERVISOR,
      EmployeeResponsibility.DELIVERY_COORDINATOR,
    )
  );
}

export function canAccessDelivery(ctx: EmployeeAccessContext): boolean {
  if (isManagerOrAbove(ctx.accessLevel)) {
    return true;
  }

  return hasResponsibility(
    ctx,
    EmployeeResponsibility.DRIVER,
    EmployeeResponsibility.DELIVERY_COORDINATOR,
  );
}

export function canAccessJobsByResponsibility(
  ctx: Pick<EmployeeAccessContext, "responsibilities">,
): boolean {
  return hasResponsibility(
    ctx,
    EmployeeResponsibility.GENERAL_OPERATIONS,
    EmployeeResponsibility.DRIVER,
    EmployeeResponsibility.DELIVERY_COORDINATOR,
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
  responsibilities?: EmployeeResponsibility[];
  assignments?: EmployeeJobAssignments;
}): EmployeeAccessContext {
  return {
    accessLevel: input.accessLevel,
    operationalGroup: input.operationalGroup,
    responsibilities: input.responsibilities ?? [],
    assignments: input.assignments ?? EMPTY_JOB_ASSIGNMENTS,
  };
}
