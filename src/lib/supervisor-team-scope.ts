import type { Employee } from "@prisma/client";
import { AccessLevel, OperationalGroup } from "@prisma/client";
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
  "accessLevel" | "operationalGroup" | "locationAssignment"
>;

type TeamMemberScopeTarget = Pick<
  Employee,
  "accessLevel" | "operationalGroup" | "locationAssignment"
>;

/** Whether a supervisor may Agree/Disagree on this employee's vacation request. */
export function canSupervisorReviewEmployeeVacation(
  supervisor: SupervisorScopeActor,
  employee: TeamMemberScopeTarget,
): boolean {
  if (supervisor.accessLevel !== AccessLevel.SUPERVISOR) {
    return false;
  }

  if (employee.accessLevel !== AccessLevel.TEAM_MEMBER) {
    return false;
  }

  if (isFloatingUnassignedLocation(employee.locationAssignment)) {
    return false;
  }

  if (supervisor.operationalGroup === OperationalGroup.BIN_SERVICE_SUPERVISOR) {
    return employee.operationalGroup === OperationalGroup.BIN_TECHNICIAN;
  }

  if (supervisor.operationalGroup === OperationalGroup.GENERAL) {
    return (
      employee.operationalGroup !== OperationalGroup.BIN_TECHNICIAN &&
      Boolean(supervisor.locationAssignment) &&
      supervisor.locationAssignment === employee.locationAssignment
    );
  }

  return false;
}

/** Employee IDs a supervisor may view (same location team or all bin technicians). */
export async function getSupervisorVisibleEmployeeIds(
  supervisor: Employee,
): Promise<string[]> {
  if (supervisor.accessLevel !== AccessLevel.SUPERVISOR) {
    return [];
  }

  if (supervisor.operationalGroup === OperationalGroup.BIN_SERVICE_SUPERVISOR) {
    const technicians = await prisma.employee.findMany({
      where: {
        operationalGroup: OperationalGroup.BIN_TECHNICIAN,
        accessLevel: AccessLevel.TEAM_MEMBER,
      },
      select: { id: true },
    });

    return [supervisor.id, ...technicians.map((row) => row.id)];
  }

  if (
    supervisor.operationalGroup === OperationalGroup.GENERAL &&
    supervisor.locationAssignment &&
    !isFloatingUnassignedLocation(supervisor.locationAssignment)
  ) {
    const teamMembers = await prisma.employee.findMany({
      where: {
        locationAssignment: supervisor.locationAssignment,
        operationalGroup: { not: OperationalGroup.BIN_TECHNICIAN },
        accessLevel: AccessLevel.TEAM_MEMBER,
      },
      select: { id: true },
    });

    return [supervisor.id, ...teamMembers.map((row) => row.id)];
  }

  return [supervisor.id];
}
