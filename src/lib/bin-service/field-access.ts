import type { Employee } from "@prisma/client";
import { AccessLevel, OperationalGroup } from "@prisma/client";
import { isManagerOrAbove } from "@/lib/operational-access";

export function canViewAllBinFieldSites(employee: Employee): boolean {
  if (isManagerOrAbove(employee.accessLevel)) {
    return true;
  }

  return employee.operationalGroup === OperationalGroup.BIN_SERVICE_SUPERVISOR;
}

export function canActOnBinJob(
  employee: Employee,
  assignedTechnicianId: string,
): boolean {
  if (isManagerOrAbove(employee.accessLevel)) {
    return true;
  }

  if (employee.operationalGroup === OperationalGroup.BIN_SERVICE_SUPERVISOR) {
    return true;
  }

  if (
    employee.accessLevel === AccessLevel.TEAM_MEMBER &&
    employee.operationalGroup === OperationalGroup.BIN_TECHNICIAN
  ) {
    return employee.id === assignedTechnicianId;
  }

  return false;
}
