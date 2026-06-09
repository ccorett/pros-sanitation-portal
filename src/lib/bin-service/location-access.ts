import type { Employee } from "@prisma/client";
import { OperationalGroup } from "@prisma/client";
import { listActiveLocationNamesForEmployee } from "@/lib/employee-location-assignment-service";
import { prisma } from "@/lib/prisma";

export function normalizeLocationName(value: string): string {
  return value.trim().toLowerCase();
}

export function locationNamesMatch(left: string, right: string): boolean {
  return normalizeLocationName(left) === normalizeLocationName(right);
}

export function employeeHasBinSiteLocationAccess(
  employeeLocations: string[],
  siteName: string,
): boolean {
  return employeeLocations.some((location) => locationNamesMatch(location, siteName));
}

export function employeeCanAccessBinSite(input: {
  employeeId: string;
  employeeLocations: string[];
  siteName: string;
  setupAssignedTechnicianId?: string | null;
}): boolean {
  if (
    employeeHasBinSiteLocationAccess(input.employeeLocations, input.siteName)
  ) {
    return true;
  }

  return (
    Boolean(input.setupAssignedTechnicianId) &&
    input.setupAssignedTechnicianId === input.employeeId
  );
}

export async function getEmployeeBinLocationNames(
  employee: Pick<Employee, "id" | "locationAssignment">,
): Promise<string[]> {
  return listActiveLocationNamesForEmployee(employee.id);
}

export async function resolveTechnicianIdForBinSite(
  siteName: string,
  fallbackTechnicianId?: string | null,
): Promise<string | null> {
  if (fallbackTechnicianId) {
    return fallbackTechnicianId;
  }

  const assignments = await prisma.employeeLocationAssignment.findMany({
    where: {
      isActive: true,
      locationName: siteName,
      employee: {
        accountStatus: "ACTIVE",
        employmentStatus: "ACTIVE",
        operationalGroup: OperationalGroup.BIN_TECHNICIAN,
      },
    },
    select: { employeeId: true },
    orderBy: { assignedAt: "asc" },
    take: 1,
  });

  if (assignments[0]) {
    return assignments[0].employeeId;
  }

  const legacyMatch = await prisma.employee.findFirst({
    where: {
      accountStatus: "ACTIVE",
      employmentStatus: "ACTIVE",
      operationalGroup: OperationalGroup.BIN_TECHNICIAN,
      locationAssignment: siteName,
    },
    select: { id: true },
    orderBy: { firstName: "asc" },
  });

  return legacyMatch?.id ?? null;
}

export async function siteHasBinRouteCoverage(input: {
  siteName: string;
  setupAssignedTechnicianId?: string | null;
}): Promise<boolean> {
  if (input.setupAssignedTechnicianId) {
    return true;
  }

  const technicianId = await resolveTechnicianIdForBinSite(input.siteName);
  return Boolean(technicianId);
}
