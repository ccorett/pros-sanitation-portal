import type { Employee } from "@prisma/client";
import { AccessLevel, OperationalGroup } from "@prisma/client";
import { employeeCanAccessBinSite } from "@/lib/bin-service/location-access";
import { isManagerOrAbove } from "@/lib/operational-access";

export function canViewAllBinFieldSites(employee: Employee): boolean {
  if (isManagerOrAbove(employee.accessLevel)) {
    return true;
  }

  return employee.operationalGroup === OperationalGroup.BIN_SERVICE_SUPERVISOR;
}

type BinJobAccessContext = {
  siteName: string;
  employeeLocations: string[];
  setupAssignedTechnicianId?: string | null;
};

export function canActOnBinJob(
  employee: Employee,
  assignedTechnicianId: string,
  access?: BinJobAccessContext,
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
    if (employee.id === assignedTechnicianId) {
      return true;
    }

    if (
      access &&
      employeeCanAccessBinSite({
        employeeId: employee.id,
        employeeLocations: access.employeeLocations,
        siteName: access.siteName,
        setupAssignedTechnicianId: access.setupAssignedTechnicianId,
      })
    ) {
      return true;
    }
  }

  return false;
}
