import type { Employee } from "@prisma/client";
import { AccessLevel, OperationalGroup } from "@prisma/client";
import { ACTIVE_EMPLOYEE_FILTER } from "@/lib/account-retention";
import {
  getEmployeeLocationSummary,
  listActiveLocationNamesForEmployee,
  listActiveLocationNamesForEmployees,
  locationsOverlap,
} from "@/lib/employee-location-assignment-service";
import { prisma } from "@/lib/prisma";

export const FLOATING_UNASSIGNED_LOCATION = "Floating/Unassigned";

export function isFloatingUnassignedLocation(
  location: string | null | undefined,
): boolean {
  const trimmed = location?.trim();
  return !trimmed || trimmed === FLOATING_UNASSIGNED_LOCATION;
}

type SupervisorScopeActor = Pick<
  Employee,
  "id" | "accessLevel" | "operationalGroup" | "locationAssignment"
>;

type TeamMemberScopeTarget = Pick<
  Employee,
  "id" | "accessLevel" | "operationalGroup" | "locationAssignment"
>;

async function employeeLocationNames(
  employee: Pick<Employee, "id" | "locationAssignment">,
): Promise<string[]> {
  const names = await listActiveLocationNamesForEmployee(employee.id);
  if (names.length > 0) {
    return names;
  }

  const legacy = employee.locationAssignment?.trim();
  return legacy ? [legacy] : [];
}

/** Whether a supervisor may Agree/Disagree on this employee's vacation request. */
export async function canSupervisorReviewEmployeeVacation(
  supervisor: SupervisorScopeActor,
  employee: TeamMemberScopeTarget,
): Promise<boolean> {
  if (supervisor.accessLevel !== AccessLevel.SUPERVISOR) {
    return false;
  }

  if (employee.accessLevel !== AccessLevel.TEAM_MEMBER) {
    return false;
  }

  const employeeLocations = await employeeLocationNames(employee);
  if (
    employeeLocations.length === 0 ||
    employeeLocations.every((location) => isFloatingUnassignedLocation(location))
  ) {
    return false;
  }

  if (supervisor.operationalGroup === OperationalGroup.BIN_SERVICE_SUPERVISOR) {
    return employee.operationalGroup === OperationalGroup.BIN_TECHNICIAN;
  }

  if (supervisor.operationalGroup === OperationalGroup.GENERAL) {
    if (employee.operationalGroup === OperationalGroup.BIN_TECHNICIAN) {
      return false;
    }

    const supervisorLocations = await employeeLocationNames(supervisor);
    return (
      supervisorLocations.length > 0 &&
      locationsOverlap(supervisorLocations, employeeLocations)
    );
  }

  return false;
}

/** Employee IDs a supervisor may view (assigned locations or all bin technicians). */
export async function getSupervisorVisibleEmployeeIds(
  supervisor: Employee,
): Promise<string[]> {
  if (supervisor.accessLevel !== AccessLevel.SUPERVISOR) {
    return [];
  }

  if (supervisor.operationalGroup === OperationalGroup.BIN_SERVICE_SUPERVISOR) {
    const technicians = await prisma.employee.findMany({
      where: {
        ...ACTIVE_EMPLOYEE_FILTER,
        operationalGroup: OperationalGroup.BIN_TECHNICIAN,
        accessLevel: AccessLevel.TEAM_MEMBER,
      },
      select: { id: true },
    });

    return [supervisor.id, ...technicians.map((row) => row.id)];
  }

  if (supervisor.operationalGroup === OperationalGroup.GENERAL) {
    const supervisorLocations = await employeeLocationNames(supervisor);
    if (
      supervisorLocations.length === 0 ||
      supervisorLocations.every((location) => isFloatingUnassignedLocation(location))
    ) {
      return [supervisor.id];
    }

    const teamMembers = await prisma.employee.findMany({
      where: {
        ...ACTIVE_EMPLOYEE_FILTER,
        operationalGroup: { not: OperationalGroup.BIN_TECHNICIAN },
        accessLevel: AccessLevel.TEAM_MEMBER,
      },
      select: { id: true, locationAssignment: true },
    });

    const locationMap = await listActiveLocationNamesForEmployees(
      teamMembers.map((row) => row.id),
    );

    const visibleIds = teamMembers
      .filter((member) => {
        const memberLocations =
          locationMap.get(member.id) ??
          (member.locationAssignment?.trim() ? [member.locationAssignment.trim()] : []);
        return locationsOverlap(supervisorLocations, memberLocations);
      })
      .map((row) => row.id);

    return [supervisor.id, ...visibleIds];
  }

  return [supervisor.id];
}

export async function getSupervisorPrimaryLocation(
  supervisor: Pick<Employee, "id" | "locationAssignment">,
): Promise<string | null> {
  const summary = await getEmployeeLocationSummary(supervisor.id);
  return summary.primaryLocation ?? supervisor.locationAssignment?.trim() ?? null;
}
