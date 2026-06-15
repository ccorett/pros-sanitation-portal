import {
  AccessLevel,
  EmployeeResponsibility,
  OperationalGroup,
} from "@prisma/client";

export const ALL_EMPLOYEE_RESPONSIBILITIES: EmployeeResponsibility[] = [
  EmployeeResponsibility.GENERAL_OPERATIONS,
  EmployeeResponsibility.BIN_TECHNICIAN,
  EmployeeResponsibility.BIN_SERVICE_SUPERVISOR,
  EmployeeResponsibility.DRIVER,
  EmployeeResponsibility.DELIVERY_COORDINATOR,
  EmployeeResponsibility.STOCK_ACCESS,
  EmployeeResponsibility.HR_REVIEW,
  EmployeeResponsibility.ADMIN_SUPPORT,
  EmployeeResponsibility.ADMIN_ASSISTANT,
];

export const RESPONSIBILITY_LABELS: Record<EmployeeResponsibility, string> = {
  [EmployeeResponsibility.GENERAL_OPERATIONS]: "General Operations",
  [EmployeeResponsibility.BIN_TECHNICIAN]: "Bin Technician",
  [EmployeeResponsibility.BIN_SERVICE_SUPERVISOR]: "Bin Service Supervisor",
  [EmployeeResponsibility.DRIVER]: "Driver",
  [EmployeeResponsibility.DELIVERY_COORDINATOR]: "Delivery Coordinator",
  [EmployeeResponsibility.STOCK_ACCESS]: "Stock Access",
  [EmployeeResponsibility.HR_REVIEW]: "HR Review",
  [EmployeeResponsibility.ADMIN_SUPPORT]: "Admin Support",
  [EmployeeResponsibility.ADMIN_ASSISTANT]: "Admin Assistant",
};

export function formatResponsibilityLabel(
  responsibility: EmployeeResponsibility,
): string {
  return RESPONSIBILITY_LABELS[responsibility];
}

export function formatResponsibilitiesList(
  responsibilities: EmployeeResponsibility[],
): string {
  if (responsibilities.length === 0) {
    return "—";
  }

  return responsibilities
    .map((item) => formatResponsibilityLabel(item))
    .join(", ");
}

export function responsibilitiesFromOperationalGroup(
  operationalGroup: OperationalGroup,
): EmployeeResponsibility[] {
  if (operationalGroup === OperationalGroup.BIN_SERVICE_SUPERVISOR) {
    return [
      EmployeeResponsibility.GENERAL_OPERATIONS,
      EmployeeResponsibility.BIN_SERVICE_SUPERVISOR,
    ];
  }

  if (operationalGroup === OperationalGroup.BIN_TECHNICIAN) {
    return [
      EmployeeResponsibility.GENERAL_OPERATIONS,
      EmployeeResponsibility.BIN_TECHNICIAN,
    ];
  }

  return [EmployeeResponsibility.GENERAL_OPERATIONS];
}

export function deriveOperationalGroupFromResponsibilities(
  responsibilities: EmployeeResponsibility[],
): OperationalGroup {
  if (responsibilities.includes(EmployeeResponsibility.BIN_SERVICE_SUPERVISOR)) {
    return OperationalGroup.BIN_SERVICE_SUPERVISOR;
  }

  if (responsibilities.includes(EmployeeResponsibility.BIN_TECHNICIAN)) {
    return OperationalGroup.BIN_TECHNICIAN;
  }

  return OperationalGroup.GENERAL;
}

export function normalizeResponsibilities(
  input: EmployeeResponsibility[],
): EmployeeResponsibility[] {
  const unique = [...new Set(input)].filter((item) =>
    ALL_EMPLOYEE_RESPONSIBILITIES.includes(item),
  );

  if (unique.length === 0) {
    return [EmployeeResponsibility.GENERAL_OPERATIONS];
  }

  return unique.sort();
}

export function isValidResponsibilitiesForLevel(
  accessLevel: AccessLevel,
  responsibilities: EmployeeResponsibility[],
): boolean {
  if (accessLevel === AccessLevel.PENDING_VERIFICATION) {
    return responsibilities.length === 0;
  }

  return responsibilities.length > 0;
}

export function getDefaultResponsibilitiesForLevel(
  accessLevel: AccessLevel,
  operationalGroup: OperationalGroup,
): EmployeeResponsibility[] {
  if (accessLevel === AccessLevel.PENDING_VERIFICATION) {
    return [];
  }

  return responsibilitiesFromOperationalGroup(operationalGroup);
}
