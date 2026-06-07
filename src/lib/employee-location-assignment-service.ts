import type { EmployeeLocationAssignment } from "@prisma/client";
import { isEmployeeLocationAssignment } from "@/lib/employee-signup-options";
import { prisma } from "@/lib/prisma";

export type EmployeeLocationSummary = {
  primaryLocation: string | null;
  additionalLocations: string[];
  allLocations: string[];
};

function uniqueLocations(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }

  return result;
}

export function summarizeLocationAssignments(
  rows: Pick<EmployeeLocationAssignment, "locationName" | "isPrimary">[],
): EmployeeLocationSummary {
  const primary =
    rows.find((row) => row.isPrimary)?.locationName ??
    rows[0]?.locationName ??
    null;

  const additionalLocations = rows
    .map((row) => row.locationName)
    .filter((location) => location !== primary);

  return {
    primaryLocation: primary,
    additionalLocations: uniqueLocations(additionalLocations),
    allLocations: uniqueLocations(rows.map((row) => row.locationName)),
  };
}

export async function listActiveLocationAssignmentsForEmployee(
  employeeId: string,
): Promise<EmployeeLocationAssignment[]> {
  return prisma.employeeLocationAssignment.findMany({
    where: { employeeId, isActive: true },
    orderBy: [{ isPrimary: "desc" }, { locationName: "asc" }],
  });
}

export async function getEmployeeLocationSummary(
  employeeId: string,
): Promise<EmployeeLocationSummary> {
  const rows = await listActiveLocationAssignmentsForEmployee(employeeId);
  if (rows.length > 0) {
    return summarizeLocationAssignments(rows);
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { locationAssignment: true },
  });

  const legacy = employee?.locationAssignment?.trim() ?? null;
  return {
    primaryLocation: legacy,
    additionalLocations: [],
    allLocations: legacy ? [legacy] : [],
  };
}

export async function listActiveLocationNamesForEmployee(
  employeeId: string,
): Promise<string[]> {
  const summary = await getEmployeeLocationSummary(employeeId);
  return summary.allLocations;
}

export async function listActiveLocationNamesForEmployees(
  employeeIds: string[],
): Promise<Map<string, string[]>> {
  if (employeeIds.length === 0) {
    return new Map();
  }

  const rows = await prisma.employeeLocationAssignment.findMany({
    where: { employeeId: { in: employeeIds }, isActive: true },
    select: { employeeId: true, locationName: true, isPrimary: true },
    orderBy: [{ isPrimary: "desc" }, { locationName: "asc" }],
  });

  const byEmployee = new Map<string, Pick<EmployeeLocationAssignment, "locationName" | "isPrimary">[]>();

  for (const row of rows) {
    const current = byEmployee.get(row.employeeId) ?? [];
    current.push(row);
    byEmployee.set(row.employeeId, current);
  }

  const missingIds = employeeIds.filter((id) => !byEmployee.has(id));
  const legacyEmployees =
    missingIds.length > 0
      ? await prisma.employee.findMany({
          where: { id: { in: missingIds } },
          select: { id: true, locationAssignment: true },
        })
      : [];

  const result = new Map<string, string[]>();

  for (const employeeId of employeeIds) {
    const assignmentRows = byEmployee.get(employeeId);
    if (assignmentRows && assignmentRows.length > 0) {
      result.set(employeeId, summarizeLocationAssignments(assignmentRows).allLocations);
      continue;
    }

    const legacy = legacyEmployees.find((row) => row.id === employeeId);
    const location = legacy?.locationAssignment?.trim();
    result.set(employeeId, location ? [location] : []);
  }

  return result;
}

export type SetEmployeeLocationAssignmentsInput = {
  primaryLocation: string;
  additionalLocations?: string[];
  assignedBy: string;
};

function validateLocationAssignments(input: SetEmployeeLocationAssignmentsInput): {
  primaryLocation: string;
  additionalLocations: string[];
} {
  const primaryLocation = input.primaryLocation.trim();

  if (!primaryLocation || !isEmployeeLocationAssignment(primaryLocation)) {
    throw new Error("Select a valid primary location.");
  }

  const additionalLocations = uniqueLocations(input.additionalLocations ?? []).filter(
    (location) => location !== primaryLocation,
  );

  for (const location of additionalLocations) {
    if (!isEmployeeLocationAssignment(location)) {
      throw new Error(`Invalid additional location: ${location}`);
    }
  }

  return { primaryLocation, additionalLocations };
}

export async function setEmployeeLocationAssignments(
  employeeId: string,
  input: SetEmployeeLocationAssignmentsInput,
): Promise<EmployeeLocationSummary> {
  const { primaryLocation, additionalLocations } = validateLocationAssignments(input);
  const nextLocations = [primaryLocation, ...additionalLocations];
  const assignedBy = input.assignedBy.trim() || "System";
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const existing = await tx.employeeLocationAssignment.findMany({
      where: { employeeId },
    });

    for (const row of existing) {
      const shouldStayActive = nextLocations.includes(row.locationName);
      const shouldBePrimary = row.locationName === primaryLocation;

      if (shouldStayActive) {
        await tx.employeeLocationAssignment.update({
          where: { id: row.id },
          data: {
            isActive: true,
            isPrimary: shouldBePrimary,
            assignedBy,
            assignedAt: now,
          },
        });
      } else if (row.isActive) {
        await tx.employeeLocationAssignment.update({
          where: { id: row.id },
          data: { isActive: false, isPrimary: false },
        });
      }
    }

    for (const locationName of nextLocations) {
      const found = existing.find((row) => row.locationName === locationName);
      if (!found) {
        await tx.employeeLocationAssignment.create({
          data: {
            employeeId,
            locationName,
            isPrimary: locationName === primaryLocation,
            assignedBy,
            assignedAt: now,
            isActive: true,
          },
        });
      }
    }

    await tx.employee.update({
      where: { id: employeeId },
      data: {
        locationAssignment: primaryLocation,
        lastEditedAt: now,
        editedBy: assignedBy,
      },
    });
  });

  return getEmployeeLocationSummary(employeeId);
}

export async function resolveClientLocationIdsForEmployee(
  employee: Pick<{ id: string; locationAssignment?: string | null }, "id" | "locationAssignment">,
): Promise<string[]> {
  const locationNames = await listActiveLocationNamesForEmployee(employee.id);
  const names =
    locationNames.length > 0
      ? locationNames
      : employee.locationAssignment?.trim()
        ? [employee.locationAssignment.trim()]
        : [];

  if (names.length === 0) {
    return [];
  }

  const locations = await prisma.clientLocation.findMany({
    where: {
      locationName: { in: names },
      serviceType: { not: null },
    },
    select: { id: true },
  });

  return [...new Set(locations.map((row) => row.id))];
}

export function locationsOverlap(
  left: string[],
  right: string[],
): boolean {
  const rightSet = new Set(right.map((value) => value.trim()).filter(Boolean));
  return left.some((value) => rightSet.has(value.trim()));
}
